'use strict';

function formatJson(value, pretty = true) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

function renderHuman(command, payload, options = {}) {
  const markdown = options.format === 'markdown';

  switch (command) {
    case 'series':
      return renderSeries(payload.series || payload, markdown);
    case 'competition':
      return renderCompetition(payload, markdown);
    case 'standings':
    case 'table':
      return renderStandings(payload.tables ? payload.tables : [payload], markdown);
    case 'groups':
      return renderStandings(payload.groups || [], markdown);
    case 'rounds':
    case 'current-round':
    case 'matches':
      return renderMatches(payload.rounds ? flattenRounds(payload.rounds) : payload.matches || [], markdown);
    case 'teams':
      return renderTeams(payload.teams || [], markdown);
    case 'team':
      return renderTeamSnapshot(payload, markdown);
    case 'trigger':
      return renderTrigger(payload, markdown);
    case 'legacy-tabela':
    case 'legacy-rodada':
      return formatJson(payload, true);
    default:
      return formatJson(payload, true);
  }
}

function renderCompetition(payload, markdown) {
  const lines = [
    `${payload.competition.name}`,
    `Serie: ${payload.competition.code.toUpperCase()} | Season: ${payload.competition.season || 'unknown'} | Grouped: ${payload.grouped ? 'yes' : 'no'}`,
    ''
  ];

  lines.push(renderStandings(payload.tables, markdown).trimEnd());
  lines.push('');
  lines.push(renderMatches(flattenRounds(payload.rounds), markdown).trimEnd());

  return `${lines.join('\n')}\n`;
}

function renderSeries(series, markdown) {
  return renderTable(
    ['Serie', 'Name', 'Grouped', 'Source'],
    series.map((serie) => [
      serie.code.toUpperCase(),
      serie.name,
      serie.grouped ? 'yes' : 'no',
      serie.url
    ]),
    { markdown }
  );
}

function renderStandings(tables, markdown) {
  const sections = [];

  for (const table of tables) {
    sections.push(table.name || 'Classificacao');
    sections.push(renderTable(
      ['#', 'Team', 'Pts', 'J', 'W', 'D', 'L', 'GD', 'Form', 'Legend'],
      (table.entries || []).map((entry) => [
        entry.position,
        teamLabel(entry.team),
        entry.points,
        entry.matches,
        entry.wins,
        entry.draws,
        entry.losses,
        entry.goalDifference,
        (entry.recentForm || []).join(''),
        entry.legend?.name || ''
      ]),
      { markdown }
    ).trimEnd());
  }

  return `${sections.join('\n\n')}\n`;
}

function renderMatches(matches, markdown) {
  return renderTable(
    ['Round', 'Group', 'Date', 'Home', 'Score', 'Away', 'Status', 'Venue'],
    matches.map((match) => [
      match.round,
      match.groupName || '',
      [match.date, match.time].filter(Boolean).join(' '),
      teamLabel(match.homeTeam || (match.side === 'home' ? match.team : match.opponent)),
      formatMatchScore(match),
      teamLabel(match.awayTeam || (match.side === 'away' ? match.team : match.opponent)),
      match.outcome ? `${match.status}/${match.outcome}` : match.status,
      match.venue || ''
    ]),
    { markdown }
  );
}

function renderTeams(teams, markdown) {
  return renderTable(
    ['Team', 'Short', 'ID', 'Position', 'Points', 'Matched By', 'Sources'],
    teams.map((entry) => [
      entry.team.name,
      entry.team.shortName,
      entry.team.id,
      entry.standing?.position || '',
      entry.standing?.points || '',
      entry.matchedBy || '',
      [...new Set((entry.appearances || []).map((appearance) => appearance.type))].join(', ')
    ]),
    { markdown }
  );
}

function renderTeamSnapshot(payload, markdown) {
  const lines = [
    `${teamLabel(payload.team)} in ${payload.competition.name}`,
    payload.standing
      ? `Standing: #${payload.standing.position}, ${payload.standing.points} pts, ${payload.standing.matches} matches`
      : 'Standing: not present in the current standings payload',
    ''
  ];

  lines.push(renderMatches(payload.matches || [], markdown).trimEnd());

  return `${lines.join('\n')}\n`;
}

function renderTrigger(payload, markdown) {
  const lines = [
    `${teamLabel(payload.team)} ${payload.condition}: ${payload.trigger.shouldFire ? 'FIRE' : 'do not fire'} (${payload.trigger.state})`,
    payload.trigger.reason,
    ''
  ];

  lines.push(renderMatches(payload.matches || [], markdown).trimEnd());

  return `${lines.join('\n')}\n`;
}

function flattenRounds(rounds) {
  return rounds.flatMap((round) =>
    (round.matches || []).map((match) => ({
      ...match,
      groupId: match.groupId ?? round.groupId ?? null,
      groupName: match.groupName ?? round.groupName ?? null,
      round: match.round ?? round.number ?? null
    }))
  );
}

function renderTable(headers, rows, options = {}) {
  if (options.markdown) {
    const header = `| ${headers.map(escapeMarkdownCell).join(' | ')} |`;
    const separator = `| ${headers.map(() => '---').join(' | ')} |`;
    const body = rows.map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`);
    return `${[header, separator, ...body].join('\n')}\n`;
  }

  const values = rows.map((row) => row.map(stringifyCell));
  const widths = headers.map((header, index) => {
    const cells = values.map((row) => row[index] || '');
    return Math.max(stringifyCell(header).length, ...cells.map((cell) => cell.length));
  });
  const formatRow = (row) => row
    .map((cell, index) => stringifyCell(cell).padEnd(widths[index], ' '))
    .join('  ')
    .trimEnd();
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');

  return `${[formatRow(headers), separator, ...values.map(formatRow)].join('\n')}\n`;
}

function formatMatchScore(match) {
  if (match.score?.home != null || match.score?.away != null) {
    return `${match.score.home ?? '-'}-${match.score.away ?? '-'}`;
  }

  if (match.score?.team != null || match.score?.opponent != null) {
    return `${match.score.team ?? '-'}-${match.score.opponent ?? '-'}`;
  }

  return '-';
}

function teamLabel(team) {
  if (!team) {
    return '';
  }

  return team.shortName ? `${team.name} (${team.shortName})` : team.name;
}

function stringifyCell(value) {
  if (value == null) {
    return '';
  }

  return String(value).replace(/\s+/g, ' ').trim();
}

function escapeMarkdownCell(value) {
  return stringifyCell(value).replace(/\|/g, '\\|');
}

module.exports = {
  flattenRounds,
  formatJson,
  renderHuman,
  renderMatches,
  renderStandings,
  renderTable,
  teamLabel
};
