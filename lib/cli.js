'use strict';

const { readFileSync } = require('node:fs');
const path = require('node:path');
const api = require('../index.js');
const { formatJson, renderHuman } = require('./format.js');

const COMMAND_ALIASES = Object.freeze({
  list: 'series',
  serie: 'series',
  series: 'series',
  competition: 'competition',
  competicao: 'competition',
  standings: 'standings',
  classificacao: 'standings',
  table: 'table',
  tabela: 'legacy-tabela',
  groups: 'groups',
  grupos: 'groups',
  rounds: 'rounds',
  rodada: 'rounds',
  'current-round': 'current-round',
  matches: 'matches',
  jogos: 'matches',
  teams: 'teams',
  times: 'teams',
  team: 'team',
  time: 'team',
  trigger: 'trigger',
  check: 'trigger',
  'legacy-tabela': 'legacy-tabela',
  'legacy-rodada': 'legacy-rodada',
  rodadaAtual: 'legacy-rodada',
  mcp: 'mcp',
  help: 'help'
});

async function main(argv = process.argv.slice(2), io = process) {
  const result = await run(argv, {
    cwd: process.cwd(),
    env: process.env
  });

  if (result.stdout) {
    io.stdout.write(result.stdout);
  }

  if (result.stderr) {
    io.stderr.write(result.stderr);
  }

  if (result.startMcp) {
    const { runStdioServer } = require('../mcp/server.js');
    await runStdioServer();
    return 0;
  }

  if (result.exitCode && io.exit) {
    io.exit(result.exitCode);
  }

  return result.exitCode;
}

async function run(argv, context = {}) {
  const parsed = parseArgv(argv);

  try {
    const command = parsed.flags.help ? 'help' : resolveCommand(parsed.positionals[0] || 'series');

    if (command === 'help') {
      return {
        exitCode: 0,
        stdout: usage()
      };
    }

    if (command === 'mcp') {
      return {
        exitCode: 0,
        startMcp: true
      };
    }

    const payload = await executeCommand(command, parsed, context);
    const format = parsed.flags.json ? 'json' : parsed.flags.format || 'table';
    const stdout = format === 'json'
      ? formatJson(payload, parsed.flags.compact !== true)
      : renderHuman(command, payload, { format });
    const exitCode = command === 'trigger' && parsed.flags['exit-code']
      ? (payload.trigger.shouldFire ? 0 : 2)
      : 0;

    return {
      exitCode,
      stdout
    };
  } catch (error) {
    return formatError(error, parsed.flags);
  }
}

async function executeCommand(command, parsed, context) {
  const args = parsed.positionals.slice(1);
  const flags = parsed.flags;
  const options = readOptions(flags, context);

  switch (command) {
    case 'series':
      return {
        series: api.listSeries()
      };
    case 'competition':
      return api.getCompetition(requireSerie(args, flags), options);
    case 'standings':
      return api.getStandings(requireSerie(args, flags), options);
    case 'table':
      return api.getTable(requireSerie(args, flags), options);
    case 'groups':
      return {
        competition: (await api.getStandings(requireSerie(args, flags), options)).competition,
        groups: await api.getGroups(requireSerie(args, flags), options)
      };
    case 'rounds':
    case 'current-round':
      return api.getRounds(requireSerie(args, flags), options);
    case 'matches': {
      const serie = requireSerie(args, flags);
      const team = flags.team || flags.time || args[1];

      if (team) {
        return api.getTeamSnapshot(serie, team, options);
      }

      return api.getRounds(serie, options);
    }
    case 'teams':
      return api.findTeams(requireSerie(args, flags), flags.team || flags.query || args[1], options);
    case 'team':
      return api.getTeamSnapshot(requireSerie(args, flags), requireTeam(args, flags), options);
    case 'trigger':
      return api.checkTeamResult(
        requireSerie(args, flags),
        requireTeam(args, flags),
        flags.condition || args[2] || 'won',
        options
      );
    case 'legacy-tabela':
      return api.tabela(requireSerie(args, flags), options);
    case 'legacy-rodada':
      return api.rodadaAtual(requireSerie(args, flags), flags.number || args[1], options);
    default:
      throw new api.BrasileiroApiError(
        'INVALID_COMMAND',
        `Unsupported command "${command}". Run "campeonato-brasileiro help".`
      );
  }
}

function parseArgv(argv) {
  const flags = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--') {
      positionals.push(...argv.slice(index + 1));
      break;
    }

    if (!value.startsWith('--')) {
      positionals.push(value);
      continue;
    }

    const [rawKey, inlineValue] = value.slice(2).split(/=(.*)/s, 2);
    const key = rawKey.trim();

    if (key === 'json') {
      flags.json = true;
      flags.format = 'json';
      continue;
    }

    if (key === 'pretty') {
      flags.compact = false;
      continue;
    }

    if (key === 'compact') {
      flags.compact = true;
      continue;
    }

    if (key === 'help' || key === 'exit-code') {
      flags[key] = true;
      continue;
    }

    if (inlineValue != null) {
      flags[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];

    if (next == null || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return {
    flags,
    positionals
  };
}

function resolveCommand(command) {
  const resolved = COMMAND_ALIASES[command];

  if (!resolved) {
    throw new api.BrasileiroApiError(
      'INVALID_COMMAND',
      `Unsupported command "${command}". Run "campeonato-brasileiro help".`
    );
  }

  return resolved;
}

function readOptions(flags, context = {}) {
  const options = {};

  if (flags.url) {
    options.url = flags.url;
  }

  if (flags.group) {
    options.group = flags.group;
  }

  if (flags.number) {
    options.number = Number(flags.number);
  }

  if (flags.html) {
    options.html = readFileSync(resolvePath(flags.html, context.cwd), 'utf8');
  }

  if (flags.fixture) {
    const serie = String(flags.fixture).toLowerCase();
    options.html = readFileSync(resolvePath(`test/fixtures/serie-${serie}.html`, context.cwd), 'utf8');
  }

  return options;
}

function requireSerie(args, flags) {
  const serie = flags.serie || flags.series || args[0];

  if (!serie) {
    throw new api.BrasileiroApiError(
      'INVALID_SERIE',
      'A serie is required. Use a, b, c or d.'
    );
  }

  return serie;
}

function requireTeam(args, flags) {
  const team = flags.team || flags.time || args[1];

  if (!team) {
    throw new api.BrasileiroApiError(
      'INVALID_TEAM',
      'A team is required. Pass it as an argument or with --team.'
    );
  }

  return team;
}

function resolvePath(filePath, cwd = process.cwd()) {
  return path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
}

function formatError(error, flags = {}) {
  const code = error && error.code ? error.code : 'ERROR';
  const message = error && error.message ? error.message : String(error);

  if (flags.json || flags.format === 'json') {
    return {
      exitCode: 1,
      stderr: formatJson({
        error: {
          code,
          message,
          details: error.details || null
        }
      })
    };
  }

  return {
    exitCode: 1,
    stderr: `${code}: ${message}\n`
  };
}

function usage() {
  return `campeonato-brasileiro-api CLI

Usage:
  campeonato-brasileiro series
  campeonato-brasileiro standings <serie> [--group A1] [--json]
  campeonato-brasileiro rounds <serie> [--group A1] [--number 13]
  campeonato-brasileiro teams <serie> [query]
  campeonato-brasileiro team <serie> <team>
  campeonato-brasileiro trigger <serie> <team> [--condition won] [--exit-code]
  campeonato-brasileiro mcp

Series:
  a, b, c, d

Formats:
  --format table      Human terminal table (default)
  --format markdown   Markdown table
  --json              Structured JSON for scripts and agents
  --compact           Compact JSON

Source overrides:
  --html <file>       Parse an already downloaded GE HTML page
  --fixture <serie>   Use test/fixtures/serie-<serie>.html
  --url <url>         Fetch a custom source URL

Automation conditions:
  won, lost, drew, not_won, played, finished, live, scheduled
`;
}

module.exports = {
  main,
  parseArgv,
  run
};
