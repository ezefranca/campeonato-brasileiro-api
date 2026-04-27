'use strict';

const COMPETITIONS = Object.freeze({
  a: Object.freeze({
    code: 'a',
    slug: 'brasileirao-serie-a',
    name: 'Campeonato Brasileiro Série A',
    grouped: false,
    url: 'https://ge.globo.com/futebol/brasileirao-serie-a/'
  }),
  b: Object.freeze({
    code: 'b',
    slug: 'brasileirao-serie-b',
    name: 'Campeonato Brasileiro Série B',
    grouped: false,
    url: 'https://ge.globo.com/futebol/brasileirao-serie-b/'
  }),
  c: Object.freeze({
    code: 'c',
    slug: 'brasileirao-serie-c',
    name: 'Campeonato Brasileiro Série C',
    grouped: false,
    url: 'https://ge.globo.com/futebol/brasileirao-serie-c/'
  }),
  d: Object.freeze({
    code: 'd',
    slug: 'brasileirao-serie-d',
    name: 'Campeonato Brasileiro Série D',
    grouped: true,
    url: 'https://ge.globo.com/futebol/brasileirao-serie-d/'
  })
});

const SUPPORTED_SERIES = Object.freeze(
  Object.values(COMPETITIONS).map((competition) =>
    Object.freeze({
      code: competition.code,
      slug: competition.slug,
      name: competition.name,
      grouped: competition.grouped,
      url: competition.url
    })
  )
);

const STATUS_BY_BROADCAST = Object.freeze({
  ENCERRADA: 'finished',
  PRE_DIA: 'scheduled',
  PRE_JOGO: 'scheduled',
  AO_VIVO: 'live',
  EM_ANDAMENTO: 'live'
});

class BrasileiroApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'BrasileiroApiError';
    this.code = code;

    if (details !== undefined) {
      this.details = details;
    }
  }
}

function listSeries() {
  return SUPPORTED_SERIES.map((competition) => ({ ...competition }));
}

async function getCompetition(serie, options = {}) {
  const competition = resolveCompetition(serie);
  const html = await resolveHtml(competition, options);

  return parseCompetitionDocument(html, {
    competition,
    url: options.url || competition.url
  });
}

async function getStandings(serie, options = {}) {
  const competition = await getCompetition(serie, options);
  const table = options.group == null ? null : selectGroup(competition.tables, options.group);
  const tables = table ? [table] : competition.tables;

  return {
    competition: competition.competition,
    grouped: competition.grouped,
    legends: competition.legends,
    tables
  };
}

async function getTable(serie, options = {}) {
  const standings = await getStandings(serie, options);

  if (standings.tables.length === 1) {
    return standings.tables[0];
  }

  throw new BrasileiroApiError(
    'GROUP_REQUIRED',
    'A grouped competition requires the "group" option. Use getGroups() or pass { group }.',
    {
      availableGroups: standings.tables.map((table) => table.name)
    }
  );
}

async function getGroups(serie, options = {}) {
  const standings = await getStandings(serie, options);
  return standings.grouped ? standings.tables : [];
}

async function getRounds(serie, options = {}) {
  const competition = await getCompetition(serie, options);
  const round = options.group == null ? null : selectGroup(competition.rounds, options.group);
  const rounds = round ? [round] : competition.rounds;

  ensureRoundIsAvailable(rounds, options.number);

  return {
    competition: competition.competition,
    grouped: competition.grouped,
    rounds
  };
}

async function getCurrentRound(serie, options = {}) {
  return getRounds(serie, options);
}

async function tabela(serie, options = {}) {
  const standings = await getStandings(serie, options);

  if (standings.tables.length === 1) {
    return standings.tables[0].entries.map(toLegacyTableEntry);
  }

  return standings.tables.map((table) => ({
    grupo: table.name,
    classificacao: table.entries.map(toLegacyTableEntry)
  }));
}

async function rodadaAtual(serie, rodadaOrOptions, maybeOptions) {
  let requestedRound = null;
  let options = {};

  if (isPlainObject(rodadaOrOptions)) {
    options = rodadaOrOptions;
  } else {
    options = maybeOptions || {};
    requestedRound = rodadaOrOptions == null ? null : Number(rodadaOrOptions);
  }

  const roundsResult = await getRounds(serie, {
    ...options,
    number: requestedRound
  });

  if (!roundsResult.grouped && roundsResult.rounds.length === 1) {
    return roundsResult.rounds[0].matches.map(toLegacyRoundMatch);
  }

  return roundsResult.rounds.map((round) => ({
    grupo: round.groupName,
    rodada: round.number,
    jogos: round.matches.map(toLegacyRoundMatch)
  }));
}

async function resolveHtml(competition, options) {
  if (typeof options.html === 'string') {
    return options.html;
  }

  const fetchFn = options.fetch || globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new BrasileiroApiError(
      'FETCH_UNAVAILABLE',
      'Global fetch is not available. Use Node.js 18+ or pass a custom fetch implementation.'
    );
  }

  const url = options.url || competition.url;

  let response;

  try {
    response = await fetchFn(url, {
      method: 'GET',
      redirect: 'follow',
      signal: options.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new BrasileiroApiError(
      'FETCH_FAILED',
      `Could not fetch ${competition.name}.`,
      {
        cause: error instanceof Error ? error.message : String(error),
        url
      }
    );
  }

  if (!response || typeof response.ok !== 'boolean' || typeof response.text !== 'function') {
    throw new BrasileiroApiError(
      'FETCH_FAILED',
      'The provided fetch implementation did not return a valid Response-like object.'
    );
  }

  if (!response.ok) {
    throw new BrasileiroApiError(
      'FETCH_FAILED',
      `The source page returned HTTP ${response.status}.`,
      {
        status: response.status,
        url
      }
    );
  }

  return response.text();
}

function parseCompetitionDocument(html, options) {
  const script = extractScriptReact(html);
  const data = parseJsonLiteral(extractConstLiteral(script, 'classificacao'), 'classificacao');
  const grouped = Array.isArray(data.grupos);
  const legends = normalizeLegends(data.faixas_classificacao || []);
  const legendByColor = new Map(
    legends
      .filter((legend) => legend.color)
      .map((legend) => [legend.color, legend])
  );
  const edition = data.edicao || {};
  const phase = normalizePhase(data.fase || {});
  const resourceId = extractResourceId(html);
  const tUUID = extractTuuid(script);
  const season = extractSeason(edition.nome || data.fase?.slug || options.competition.slug);
  const competition = {
    code: options.competition.code,
    slug: options.competition.slug,
    name: edition.nome || options.competition.name,
    season,
    sport: 'futebol',
    grouped,
    phase,
    edition: {
      name: edition.nome || options.competition.name,
      location: edition.localizacao || null,
      startsAt: edition.data_inicio || null,
      endsAt: edition.data_fim || null,
      regulation: edition.regulamento || null
    },
    source: {
      provider: 'ge',
      url: options.url,
      resourceId,
      tUUID
    }
  };

  if (grouped) {
    const tables = data.grupos.map((group) => normalizeGroupTable(group, legendByColor));
    const rounds = data.grupos.map((group) => normalizeGroupRound(group));

    return {
      competition,
      grouped: true,
      legends,
      tables,
      rounds,
      matches: rounds.flatMap((round) => round.matches)
    };
  }

  const roundMeta = normalizeRoundMeta(data.rodada);
  const tables = [
    {
      id: 'overall',
      name: 'Classificacao geral',
      round: roundMeta,
      entries: (data.classificacao || []).map((entry) => normalizeEntry(entry, legendByColor))
    }
  ];
  const rounds = [
    {
      id: 'overall',
      groupId: null,
      groupName: null,
      number: roundMeta.number,
      total: roundMeta.total,
      label: roundMeta.label,
      matches: (data.lista_jogos || []).map((match) => normalizeMatch(match, roundMeta))
    }
  ];

  return {
    competition,
    grouped: false,
    legends,
    tables,
    rounds,
    matches: rounds[0].matches
  };
}

function normalizePhase(phase) {
  const description = phase?.tipo?.descricao || null;
  const typeId = phase?.tipo?.tipo_id || null;

  return {
    slug: phase?.slug || null,
    disclaimer: phase?.disclaimer || null,
    description,
    typeId,
    grouped: typeId === '3'
  };
}

function normalizeLegends(legends) {
  return legends.map((legend) => ({
    id: legend.id ?? null,
    name: legend.nome || null,
    color: typeof legend.cor === 'string' ? legend.cor.toLowerCase() : null
  }));
}

function normalizeGroupTable(group, legendByColor) {
  return {
    id: group.id ?? group.grupo_id ?? null,
    name: group.nome_grupo || null,
    round: normalizeRoundMeta(group.rodada),
    entries: (group.classificacao || []).map((entry) => normalizeEntry(entry, legendByColor))
  };
}

function normalizeGroupRound(group) {
  const roundMeta = normalizeRoundMeta(group.rodada);

  return {
    id: group.id ?? group.grupo_id ?? null,
    groupId: group.id ?? group.grupo_id ?? null,
    groupName: group.nome_grupo || null,
    number: roundMeta.number,
    total: roundMeta.total,
    label: roundMeta.label,
    matches: (group.lista_jogos || []).map((match) =>
      normalizeMatch(match, roundMeta, {
        groupId: group.id ?? group.grupo_id ?? null,
        groupName: group.nome_grupo || null
      })
    )
  };
}

function normalizeEntry(entry, legendByColor) {
  const legendColor = typeof entry.faixa_classificacao_cor === 'string'
    ? entry.faixa_classificacao_cor.toLowerCase()
    : null;

  return {
    position: numberOrNull(entry.ordem),
    team: {
      id: numberOrNull(entry.equipe_id),
      name: entry.nome_popular || null,
      shortName: entry.sigla || null,
      badge: entry.escudo || null
    },
    points: numberOrNull(entry.pontos),
    matches: numberOrNull(entry.jogos),
    wins: numberOrNull(entry.vitorias),
    draws: numberOrNull(entry.empates),
    losses: numberOrNull(entry.derrotas),
    goalsFor: numberOrNull(entry.gols_pro),
    goalsAgainst: numberOrNull(entry.gols_contra),
    goalDifference: numberOrNull(entry.saldo_gols),
    efficiency: numberOrNull(entry.aproveitamento),
    movement: numberOrNull(entry.variacao),
    recentForm: Array.isArray(entry.ultimos_jogos)
      ? entry.ultimos_jogos.map(normalizeFormResult)
      : [],
    legend: legendColor ? legendByColor.get(legendColor) || { color: legendColor, name: null } : null
  };
}

function normalizeRoundMeta(round) {
  const number = numberOrNull(round?.atual);
  const total = numberOrNull(round?.ultima);

  return {
    number,
    total,
    label: number == null ? null : `${number}a rodada`
  };
}

function normalizeMatch(match, roundMeta, options = {}) {
  const broadcastCode = match?.transmissao?.broadcast?.id || null;

  return {
    id: numberOrNull(match?.id),
    groupId: options.groupId ?? null,
    groupName: options.groupName ?? null,
    round: roundMeta.number,
    totalRounds: roundMeta.total,
    dateTime: match?.data_realizacao || null,
    date: match?.data_realizacao ? match.data_realizacao.slice(0, 10) : null,
    time: match?.hora_realizacao || null,
    started: Boolean(match?.jogo_ja_comecou),
    status: normalizeMatchStatus(broadcastCode, match?.jogo_ja_comecou),
    statusCode: broadcastCode,
    venue: match?.sede?.nome_popular || null,
    homeTeam: normalizeTeam(match?.equipes?.mandante),
    awayTeam: normalizeTeam(match?.equipes?.visitante),
    score: {
      home: numberOrNull(match?.placar_oficial_mandante),
      away: numberOrNull(match?.placar_oficial_visitante),
      penalties:
        match?.placar_penaltis_mandante == null && match?.placar_penaltis_visitante == null
          ? null
          : {
              home: numberOrNull(match?.placar_penaltis_mandante),
              away: numberOrNull(match?.placar_penaltis_visitante)
            }
    },
    coverage: match?.transmissao
      ? {
          label: match.transmissao.label || null,
          url: match.transmissao.url || null,
          statusCode: broadcastCode
        }
      : null
  };
}

function normalizeTeam(team) {
  return {
    id: numberOrNull(team?.id),
    name: team?.nome_popular || null,
    shortName: team?.sigla || null,
    badge: team?.escudo || null
  };
}

function normalizeMatchStatus(broadcastCode, started) {
  if (broadcastCode && STATUS_BY_BROADCAST[broadcastCode]) {
    return STATUS_BY_BROADCAST[broadcastCode];
  }

  return started ? 'live' : 'scheduled';
}

function normalizeFormResult(result) {
  switch (String(result || '').toLowerCase()) {
    case 'v':
      return 'W';
    case 'e':
      return 'D';
    case 'd':
      return 'L';
    default:
      return String(result || '').toUpperCase() || null;
  }
}

function extractScriptReact(html) {
  const match = html.match(/<script type="text\/javascript" id="scriptReact">([\s\S]*?)<\/script>/);

  if (!match) {
    throw new BrasileiroApiError(
      'INVALID_RESPONSE',
      'The source page no longer contains the scriptReact payload.'
    );
  }

  return match[1];
}

function extractResourceId(html) {
  const match = html.match(/data-bs-resource-id="([^"]+)"/);
  return match ? match[1] : null;
}

function extractTuuid(script) {
  const match = script.match(/tUUID:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function extractConstLiteral(script, name) {
  const marker = `const ${name} = `;
  const start = script.indexOf(marker);

  if (start < 0) {
    throw new BrasileiroApiError(
      'INVALID_RESPONSE',
      `The source page does not contain the "${name}" payload.`
    );
  }

  let index = start + marker.length;

  while (index < script.length && /\s/.test(script[index])) {
    index += 1;
  }

  const firstCharacter = script[index];

  if (!['{', '[', '"', '\''].includes(firstCharacter)) {
    const end = script.indexOf(';', index);
    return script.slice(index, end).trim();
  }

  let depth = firstCharacter === '{' || firstCharacter === '[' ? 1 : 0;
  let inString = firstCharacter === '"' || firstCharacter === '\'';
  let quote = inString ? firstCharacter : null;
  let escaped = false;

  for (let cursor = index + 1; cursor < script.length; cursor += 1) {
    const character = script[cursor];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (character === quote) {
        inString = false;
        quote = null;

        if (depth === 0) {
          return script.slice(index, cursor + 1).trim();
        }
      }

      continue;
    }

    if (character === '"' || character === '\'') {
      inString = true;
      quote = character;
      continue;
    }

    if (character === '{' || character === '[') {
      depth += 1;
      continue;
    }

    if (character === '}' || character === ']') {
      depth -= 1;

      if (depth === 0) {
        return script.slice(index, cursor + 1).trim();
      }
    }
  }

  throw new BrasileiroApiError(
    'INVALID_RESPONSE',
    `Could not safely extract the "${name}" payload from the source page.`
  );
}

function parseJsonLiteral(literal, name) {
  try {
    return JSON.parse(literal);
  } catch (error) {
    throw new BrasileiroApiError(
      'INVALID_RESPONSE',
      `The "${name}" payload could not be parsed as JSON.`,
      {
        cause: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

function resolveCompetition(serie) {
  const key = normalizeKey(serie);

  switch (key) {
    case 'a':
    case 'seriea':
    case 'brasileiraoseriea':
      return COMPETITIONS.a;
    case 'b':
    case 'serieb':
    case 'brasileiraoserieb':
      return COMPETITIONS.b;
    case 'c':
    case 'seriec':
    case 'brasileiraoseriec':
      return COMPETITIONS.c;
    case 'd':
    case 'seried':
    case 'brasileiraoseried':
      return COMPETITIONS.d;
    default:
      throw new BrasileiroApiError(
        'INVALID_SERIE',
        'Unsupported serie. Use one of: a, b, c or d.',
        {
          received: serie,
          supported: SUPPORTED_SERIES.map((competition) => competition.code)
        }
      );
  }
}

function selectGroup(collection, group) {
  if (group == null) {
    return null;
  }

  const wanted = normalizeGroupKey(group);

  const selected = collection.find((entry) => {
    if (String(entry.id) === String(group)) {
      return true;
    }

    return normalizeGroupKey(entry.name || entry.groupName) === wanted;
  });

  if (!selected) {
    throw new BrasileiroApiError(
      'GROUP_NOT_FOUND',
      `Group "${group}" was not found in the current competition payload.`,
      {
        received: group,
        availableGroups: collection.map((entry) => ({
          id: entry.id,
          name: entry.name || entry.groupName
        }))
      }
    );
  }

  return selected;
}

function ensureRoundIsAvailable(rounds, requestedRound) {
  if (requestedRound == null || Number.isNaN(requestedRound)) {
    return;
  }

  const availableRounds = [...new Set(rounds.map((round) => round.number).filter((round) => round != null))];

  if (availableRounds.includes(requestedRound)) {
    return;
  }

  throw new BrasileiroApiError(
    'ROUND_NOT_AVAILABLE',
    'The current GE payload exposes only the active rodada for each competition page.',
    {
      requested: requestedRound,
      available: availableRounds
    }
  );
}

function toLegacyTableEntry(entry) {
  return {
    nome: entry.team.name,
    sigla: entry.team.shortName,
    escudo: entry.team.badge,
    posicao: entry.position,
    pontos: String(entry.points),
    jogos: String(entry.matches),
    vitorias: String(entry.wins),
    empates: String(entry.draws),
    derrotas: String(entry.losses),
    golsPro: String(entry.goalsFor),
    golsContra: String(entry.goalsAgainst),
    saldoGols: String(entry.goalDifference),
    percentual: String(entry.efficiency)
  };
}

function toLegacyRoundMatch(match) {
  return {
    mandante: match.homeTeam.name,
    placarMandante: match.score.home,
    visitante: match.awayTeam.name,
    placarVisitante: match.score.away
  };
}

function extractSeason(value) {
  const match = String(value || '').match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function normalizeGroupKey(value) {
  return normalizeKey(String(value || '').replace(/^grupo/i, ''));
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function numberOrNull(value) {
  if (value == null) {
    return null;
  }

  const number = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(number) ? null : number;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

const api = {
  BrasileiroApiError,
  SUPPORTED_SERIES,
  listSeries,
  getCompetition,
  getStandings,
  getTable,
  getGroups,
  getRounds,
  getCurrentRound,
  tabela,
  rodadaAtual
};

module.exports = api;
module.exports.default = api;
