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

const TEAM_RESULT_CONDITIONS = Object.freeze([
  'won',
  'lost',
  'drew',
  'not_won',
  'played',
  'finished',
  'live',
  'scheduled'
]);

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

async function findTeams(serie, queryOrOptions, maybeOptions) {
  let query = null;
  let options = {};

  if (isPlainObject(queryOrOptions)) {
    options = queryOrOptions;
  } else {
    query = queryOrOptions == null ? null : String(queryOrOptions);
    options = maybeOptions || {};
  }

  const competition = scopeCompetitionByGroup(
    await getCompetition(serie, options),
    options.group
  );
  const teams = rankTeamRecords(collectTeamRecords(competition), query);

  return {
    competition: competition.competition,
    grouped: competition.grouped,
    query,
    teams: teams.map(toTeamSearchResult)
  };
}

async function getTeamSnapshot(serie, team, options = {}) {
  const competition = scopeCompetitionByGroup(
    await getCompetition(serie, options),
    options.group
  );
  const selected = selectTeamRecord(competition, team);
  const matches = collectTeamMatches(competition, selected.team);

  return {
    competition: competition.competition,
    grouped: competition.grouped,
    team: selected.team,
    matchedBy: selected.matchedBy,
    standing: selected.standing,
    groups: selected.groups,
    currentRound: summarizeCurrentRound(competition.rounds),
    matches,
    automation: {
      supportedConditions: TEAM_RESULT_CONDITIONS
    }
  };
}

async function checkTeamResult(serie, team, conditionOrOptions, maybeOptions) {
  let condition = 'won';
  let options = {};

  if (isPlainObject(conditionOrOptions)) {
    options = conditionOrOptions;
    condition = options.condition || condition;
  } else {
    condition = conditionOrOptions == null ? condition : conditionOrOptions;
    options = maybeOptions || {};
  }

  condition = normalizeTeamResultCondition(condition);

  const snapshot = await getTeamSnapshot(serie, team, options);
  const trigger = evaluateTeamCondition(snapshot.matches, condition);

  return {
    competition: snapshot.competition,
    grouped: snapshot.grouped,
    team: snapshot.team,
    standing: snapshot.standing,
    currentRound: snapshot.currentRound,
    condition,
    trigger,
    matches: snapshot.matches
  };
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

function scopeCompetitionByGroup(competition, group) {
  if (group == null) {
    return competition;
  }

  const table = selectGroup(competition.tables, group);
  const round = selectGroup(competition.rounds, group);
  const rounds = [round];

  return {
    ...competition,
    tables: [table],
    rounds,
    matches: rounds.flatMap((entry) => entry.matches)
  };
}

function collectTeamRecords(competition) {
  const records = new Map();

  for (const table of competition.tables || []) {
    for (const entry of table.entries || []) {
      addTeamRecord(records, entry.team, {
        type: 'standing',
        groupId: table.id ?? null,
        groupName: table.name ?? null,
        position: entry.position
      }, entry);
    }
  }

  for (const round of competition.rounds || []) {
    for (const match of round.matches || []) {
      addTeamRecord(records, match.homeTeam, {
        type: 'match',
        side: 'home',
        matchId: match.id,
        round: match.round,
        groupId: match.groupId ?? round.groupId ?? null,
        groupName: match.groupName ?? round.groupName ?? null
      });
      addTeamRecord(records, match.awayTeam, {
        type: 'match',
        side: 'away',
        matchId: match.id,
        round: match.round,
        groupId: match.groupId ?? round.groupId ?? null,
        groupName: match.groupName ?? round.groupName ?? null
      });
    }
  }

  return [...records.values()];
}

function addTeamRecord(records, team, appearance, standing = null) {
  if (!team || (team.id == null && !team.name && !team.shortName)) {
    return;
  }

  const key = teamRecordKey(team);
  let record = records.get(key);

  if (!record) {
    record = {
      team: { ...team },
      standing: null,
      groups: [],
      appearances: []
    };
    records.set(key, record);
  } else {
    record.team = mergeTeam(record.team, team);
  }

  record.appearances.push(appearance);

  if (standing) {
    record.standing = standing;
    addUniqueGroup(record.groups, {
      id: appearance.groupId ?? null,
      name: appearance.groupName ?? null,
      position: standing.position
    });
  }
}

function mergeTeam(current, next) {
  return {
    id: current.id ?? next.id ?? null,
    name: current.name || next.name || null,
    shortName: current.shortName || next.shortName || null,
    badge: current.badge || next.badge || null
  };
}

function addUniqueGroup(groups, group) {
  const key = `${group.id ?? ''}:${group.name ?? ''}`;

  if (!groups.some((entry) => `${entry.id ?? ''}:${entry.name ?? ''}` === key)) {
    groups.push(group);
  }
}

function teamRecordKey(team) {
  if (team.id != null) {
    return `id:${team.id}`;
  }

  return `team:${normalizeKey(team.name || team.shortName)}:${normalizeKey(team.shortName || '')}`;
}

function rankTeamRecords(records, query) {
  return records
    .map((record) => ({
      ...record,
      ...scoreTeamRecord(record, query)
    }))
    .filter((record) => query == null || record.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftPosition = left.standing?.position ?? Number.MAX_SAFE_INTEGER;
      const rightPosition = right.standing?.position ?? Number.MAX_SAFE_INTEGER;

      if (leftPosition !== rightPosition) {
        return leftPosition - rightPosition;
      }

      return String(left.team.name || '').localeCompare(String(right.team.name || ''));
    });
}

function scoreTeamRecord(record, query) {
  if (query == null || String(query).trim() === '') {
    return {
      score: 1,
      matchedBy: 'all'
    };
  }

  const wantedRaw = String(query).trim();
  const wanted = normalizeKey(wantedRaw);

  if (record.team.id != null && String(record.team.id) === wantedRaw) {
    return {
      score: 100,
      matchedBy: 'id'
    };
  }

  const names = [
    ['name', record.team.name],
    ['shortName', record.team.shortName]
  ].filter(([, value]) => value);

  for (const [field, value] of names) {
    const key = normalizeKey(value);

    if (key === wanted) {
      return {
        score: field === 'name' ? 95 : 90,
        matchedBy: field
      };
    }
  }

  for (const [field, value] of names) {
    const key = normalizeKey(value);

    if (key.startsWith(wanted)) {
      return {
        score: field === 'name' ? 85 : 80,
        matchedBy: `${field}:prefix`
      };
    }
  }

  for (const [field, value] of names) {
    const key = normalizeKey(value);

    if (key.includes(wanted) || (wanted.length > 2 && wanted.includes(key))) {
      return {
        score: field === 'name' ? 70 : 65,
        matchedBy: `${field}:partial`
      };
    }
  }

  return {
    score: 0,
    matchedBy: null
  };
}

function toTeamSearchResult(record) {
  return {
    team: record.team,
    score: record.score,
    matchedBy: record.matchedBy,
    standing: record.standing,
    groups: record.groups,
    appearances: record.appearances
  };
}

function selectTeamRecord(competition, team) {
  if (team == null || String(team).trim() === '') {
    throw new BrasileiroApiError(
      'INVALID_TEAM',
      'A team name, acronym or id is required.'
    );
  }

  const records = collectTeamRecords(competition);
  const ranked = rankTeamRecords(records, team);

  if (ranked.length === 0) {
    throw new BrasileiroApiError(
      'TEAM_NOT_FOUND',
      `Team "${team}" was not found in the current competition payload.`,
      {
        received: team,
        availableTeams: records.map((record) => record.team)
      }
    );
  }

  return ranked[0];
}

function collectTeamMatches(competition, team) {
  const matches = [];

  for (const round of competition.rounds || []) {
    for (const match of round.matches || []) {
      const summary = summarizeTeamMatch(match, team, round);

      if (summary) {
        matches.push(summary);
      }
    }
  }

  return matches;
}

function summarizeTeamMatch(match, team, round) {
  const side = identifyTeamSide(match, team);

  if (!side) {
    return null;
  }

  const isHome = side === 'home';
  const selectedTeam = isHome ? match.homeTeam : match.awayTeam;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const teamScore = isHome ? match.score.home : match.score.away;
  const opponentScore = isHome ? match.score.away : match.score.home;
  const scoreComparison = compareTeamScore(teamScore, opponentScore);
  const finalOutcome = match.status === 'finished' ? scoreComparison : null;

  return {
    id: match.id,
    groupId: match.groupId ?? round.groupId ?? null,
    groupName: match.groupName ?? round.groupName ?? null,
    round: match.round ?? round.number ?? null,
    totalRounds: match.totalRounds ?? round.total ?? null,
    dateTime: match.dateTime,
    date: match.date,
    time: match.time,
    started: match.started,
    status: match.status,
    statusCode: match.statusCode,
    finished: match.status === 'finished',
    live: match.status === 'live',
    scheduled: match.status === 'scheduled',
    venue: match.venue,
    side,
    team: selectedTeam,
    opponent,
    score: {
      team: teamScore,
      opponent: opponentScore,
      home: match.score.home,
      away: match.score.away,
      penalties: match.score.penalties
    },
    outcome: finalOutcome,
    scoreState: scoreComparison == null ? null : toScoreState(scoreComparison),
    won: finalOutcome === 'win',
    lost: finalOutcome === 'loss',
    drew: finalOutcome === 'draw',
    coverage: match.coverage
  };
}

function identifyTeamSide(match, team) {
  if (teamsAreSame(match.homeTeam, team)) {
    return 'home';
  }

  if (teamsAreSame(match.awayTeam, team)) {
    return 'away';
  }

  return null;
}

function teamsAreSame(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left.id != null && right.id != null && String(left.id) === String(right.id)) {
    return true;
  }

  const leftNames = [left.name, left.shortName].filter(Boolean).map(normalizeKey);
  const rightNames = [right.name, right.shortName].filter(Boolean).map(normalizeKey);

  return leftNames.some((leftName) => rightNames.includes(leftName));
}

function compareTeamScore(teamScore, opponentScore) {
  if (teamScore == null || opponentScore == null) {
    return null;
  }

  if (teamScore > opponentScore) {
    return 'win';
  }

  if (teamScore < opponentScore) {
    return 'loss';
  }

  return 'draw';
}

function toScoreState(comparison) {
  switch (comparison) {
    case 'win':
      return 'winning';
    case 'loss':
      return 'losing';
    case 'draw':
      return 'drawing';
    default:
      return null;
  }
}

function summarizeCurrentRound(rounds) {
  return {
    rounds: rounds.map((round) => ({
      id: round.id,
      groupId: round.groupId,
      groupName: round.groupName,
      number: round.number,
      total: round.total,
      label: round.label,
      matches: round.matches.length
    })),
    numbers: [...new Set(rounds.map((round) => round.number).filter((number) => number != null))]
  };
}

function normalizeTeamResultCondition(condition) {
  const key = normalizeKey(condition);

  switch (key) {
    case 'won':
    case 'win':
    case 'wins':
    case 'venceu':
    case 'vitoria':
      return 'won';
    case 'lost':
    case 'loss':
    case 'lose':
    case 'perdeu':
    case 'derrota':
      return 'lost';
    case 'drew':
    case 'draw':
    case 'drawn':
    case 'empatou':
    case 'empate':
      return 'drew';
    case 'notwon':
    case 'notwin':
    case 'naovenceu':
    case 'semvitoria':
      return 'not_won';
    case 'played':
    case 'started':
    case 'jogou':
      return 'played';
    case 'finished':
    case 'ended':
    case 'encerrada':
    case 'encerrado':
      return 'finished';
    case 'live':
    case 'aovivo':
    case 'emandamento':
      return 'live';
    case 'scheduled':
    case 'fixture':
    case 'prejogo':
    case 'predia':
    case 'agendado':
      return 'scheduled';
    default:
      throw new BrasileiroApiError(
        'INVALID_CONDITION',
        'Unsupported condition. Use one of: won, lost, drew, not_won, played, finished, live or scheduled.',
        {
          received: condition,
          supported: TEAM_RESULT_CONDITIONS
        }
      );
  }
}

function evaluateTeamCondition(matches, condition) {
  const matchedMatches = matches.filter((match) => teamMatchSatisfiesCondition(match, condition));
  const shouldFire = matchedMatches.length > 0;
  const hasPendingMatches = matches.some((match) => teamMatchCouldStillSatisfyCondition(match, condition));

  let state = 'not_satisfied';
  let reason = `No current match satisfies "${condition}".`;

  if (shouldFire) {
    state = 'triggered';
    reason = `At least one current match satisfies "${condition}".`;
  } else if (matches.length === 0) {
    state = 'no_match';
    reason = 'The team does not appear in the current round payload.';
  } else if (hasPendingMatches) {
    state = 'pending';
    reason = `At least one current match is not settled for "${condition}" yet.`;
  }

  return {
    condition,
    shouldFire,
    state,
    reason,
    matchedMatches: matchedMatches.map((match) => ({
      id: match.id,
      round: match.round,
      groupName: match.groupName,
      opponent: match.opponent,
      status: match.status,
      outcome: match.outcome,
      score: match.score
    }))
  };
}

function teamMatchSatisfiesCondition(match, condition) {
  switch (condition) {
    case 'won':
      return match.outcome === 'win';
    case 'lost':
      return match.outcome === 'loss';
    case 'drew':
      return match.outcome === 'draw';
    case 'not_won':
      return match.finished && match.outcome !== 'win';
    case 'played':
      return match.started || match.live || match.finished;
    case 'finished':
      return match.finished;
    case 'live':
      return match.live;
    case 'scheduled':
      return match.scheduled;
    default:
      return false;
  }
}

function teamMatchCouldStillSatisfyCondition(match, condition) {
  if (teamMatchSatisfiesCondition(match, condition)) {
    return false;
  }

  if (condition === 'scheduled') {
    return false;
  }

  if (condition === 'live') {
    return match.scheduled;
  }

  return match.scheduled || match.live;
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
  findTeams,
  getTeamSnapshot,
  checkTeamResult,
  TEAM_RESULT_CONDITIONS,
  tabela,
  rodadaAtual
};

module.exports = api;
module.exports.default = api;
