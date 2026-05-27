'use strict';

const { readFileSync } = require('node:fs');
const path = require('node:path');
const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const api = require('../index.js');
const pkg = require('../package.json');
const { renderHuman } = require('../lib/format.js');

const MCP_GUIDE = `# Campeonato Brasileiro MCP

Use this server when an agent needs current Campeonato Brasileiro Serie A, B, C or D standings, current-round matches, team lookup, or automation trigger checks.

Important behavior:
- The upstream GE page exposes standings and the active rodada, not a full historical fixture database.
- Serie D is grouped. Pass group as "A1", "Grupo A1" or the numeric group id when the automation needs a specific group.
- Tools return structuredContent for machines and a compact markdown summary for humans.
- For automations such as "message me when Corinthians won", call brasileiro_check_team_trigger with condition "won". The tool only evaluates the football state; the calling agent or workflow should perform external actions such as messaging, booking, calendar updates or reminders.

Recommended workflow:
1. Call brasileiro_find_teams if the team name is ambiguous.
2. Call brasileiro_get_team_snapshot to inspect standings and current-round matches.
3. Call brasileiro_check_team_trigger for a boolean shouldFire decision.
4. Use trigger.state and trigger.reason to avoid repeating actions while a match is pending or absent from the active rodada.
`;

const serieSchema = z.string().describe('Serie code or alias: a, b, c, d, serie-a, brasileirao-serie-a.');
const groupSchema = z.union([z.string(), z.number()])
  .optional()
  .describe('Optional Serie D group selector. Accepts A1, Grupo A1 or numeric group id.');
const sourceSchema = {
  url: z.string().url().optional().describe('Optional source URL override.'),
  html: z.string().optional().describe('Optional raw GE HTML for offline parsing or tests.')
};

function createMcpServer() {
  const server = new McpServer({
    name: 'campeonato-brasileiro-api',
    version: pkg.version
  }, {
    instructions: MCP_GUIDE
  });

  registerResources(server);
  registerPrompts(server);
  registerTools(server);

  return server;
}

async function runStdioServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function registerTools(server) {
  const readOnly = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  };

  server.registerTool('brasileirao_list_series', {
    title: 'List Brasileirão series',
    description: 'List supported Campeonato Brasileiro series and their source URLs.',
    inputSchema: z.object({}),
    annotations: readOnly
  }, async () => toolResult('series', { series: api.listSeries() }));

  server.registerTool('brasileirao_get_competition', {
    title: 'Get competition',
    description: 'Return the full normalized payload for a Serie: competition metadata, legends, standings, active rounds and matches.',
    inputSchema: z.object({
      serie: serieSchema,
      ...sourceSchema
    }),
    annotations: readOnly
  }, async (input) => toolResult('competition', await api.getCompetition(input.serie, sourceOptions(input))));

  server.registerTool('brasileirao_get_standings', {
    title: 'Get standings',
    description: 'Return standings tables and legends. For Serie D, pass group to select one group.',
    inputSchema: z.object({
      serie: serieSchema,
      group: groupSchema,
      ...sourceSchema
    }),
    annotations: readOnly
  }, async (input) => toolResult('standings', await api.getStandings(input.serie, sourceOptions(input))));

  server.registerTool('brasileirao_get_rounds', {
    title: 'Get current round',
    description: 'Return the active rodada and matches. The upstream source exposes the current rodada, not full history.',
    inputSchema: z.object({
      serie: serieSchema,
      group: groupSchema,
      number: z.number().int().positive().optional().describe('Optional expected rodada number for validation.'),
      ...sourceSchema
    }),
    annotations: readOnly
  }, async (input) => toolResult('rounds', await api.getRounds(input.serie, sourceOptions(input))));

  server.registerTool('brasileirao_find_teams', {
    title: 'Find teams',
    description: 'Search teams by name, acronym or id inside the selected Serie payload. Use before automation if the team name may be ambiguous.',
    inputSchema: z.object({
      serie: serieSchema,
      query: z.string().optional().describe('Optional team name, acronym or id query.'),
      group: groupSchema,
      ...sourceSchema
    }),
    annotations: readOnly
  }, async (input) => toolResult('teams', await api.findTeams(input.serie, input.query, sourceOptions(input))));

  server.registerTool('brasileirao_get_team_snapshot', {
    title: 'Get team snapshot',
    description: 'Return a team-centric view with standing, current-round matches, outcome fields and supported automation conditions.',
    inputSchema: z.object({
      serie: serieSchema,
      team: z.string().describe('Team name, acronym or id, for example Corinthians, COR, Flamengo or FLA.'),
      group: groupSchema,
      ...sourceSchema
    }),
    annotations: readOnly
  }, async (input) => toolResult('team', await api.getTeamSnapshot(input.serie, input.team, sourceOptions(input))));

  server.registerTool('brasileirao_check_team_trigger', {
    title: 'Check team automation trigger',
    description: 'Evaluate whether a team satisfies a condition in the active rodada. Use for automations such as "send me a message when Corinthians won".',
    inputSchema: z.object({
      serie: serieSchema,
      team: z.string().describe('Team name, acronym or id.'),
      condition: z.string().optional().describe('won, lost, drew, not_won, played, finished, live or scheduled. Portuguese aliases are accepted. Defaults to won.'),
      group: groupSchema,
      ...sourceSchema
    }),
    annotations: readOnly
  }, async (input) => toolResult(
    'trigger',
    await api.checkTeamResult(input.serie, input.team, input.condition || 'won', sourceOptions(input))
  ));
}

function registerResources(server) {
  server.registerResource('brasileirao-guide', 'brasileirao://guide', {
    title: 'Campeonato Brasileiro agent guide',
    description: 'Operational guidance for agents using Campeonato Brasileiro tools.',
    mimeType: 'text/markdown'
  }, async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'text/markdown',
      text: MCP_GUIDE
    }]
  }));

  server.registerResource('brasileirao-series', 'brasileirao://series', {
    title: 'Supported Brasileirão series',
    description: 'Supported series metadata as JSON.',
    mimeType: 'application/json'
  }, async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify({ series: api.listSeries() }, null, 2)
    }]
  }));

  server.registerResource('brasileirao-openapi', 'brasileirao://openapi', {
    title: 'Reference OpenAPI spec',
    description: 'OpenAPI reference contract for HTTP wrappers around this package.',
    mimeType: 'application/json'
  }, async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: readFileSync(path.join(__dirname, '..', 'docs', 'openapi.json'), 'utf8')
    }]
  }));

  const standingsTemplate = new ResourceTemplate('brasileirao://standings/{serie}', {
    list: async () => ({
      resources: api.listSeries().map((serie) => ({
        uri: `brasileirao://standings/${serie.code}`,
        name: `brasileirao-standings-${serie.code}`,
        title: `${serie.name} standings`,
        description: `Current standings for ${serie.name}.`,
        mimeType: 'application/json'
      }))
    }),
    complete: {
      serie: () => api.listSeries().map((serie) => serie.code)
    }
  });

  server.registerResource('brasileirao-standings-by-serie', standingsTemplate, {
    title: 'Standings by Serie',
    description: 'Dynamic standings resource for a Serie code.',
    mimeType: 'application/json'
  }, async (uri, variables) => {
    const payload = await api.getStandings(variables.serie);

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(payload, null, 2)
      }]
    };
  });
}

function registerPrompts(server) {
  server.registerPrompt('brasileirao_automation_planner', {
    title: 'Plan Brasileirão automation',
    description: 'Prompt template for building an automation around team results or match states.',
    argsSchema: {
      serie: z.string().optional().describe('Optional Serie code.'),
      team: z.string().describe('Team name, acronym or id.'),
      condition: z.string().optional().describe('Automation condition, defaults to won.'),
      action: z.string().optional().describe('External action to take when the trigger fires.')
    }
  }, async (input) => ({
    description: 'Use Campeonato Brasileiro tools to build a trigger-driven automation.',
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          `Create an automation plan for ${input.team}.`,
          `Condition: ${input.condition || 'won'}.`,
          input.serie ? `Serie: ${input.serie}.` : 'Discover or ask for the Serie if it is not clear.',
          input.action ? `External action: ${input.action}.` : 'Choose the external action requested by the user.',
          'Use brasileiro_find_teams when the team is ambiguous, brasileiro_get_team_snapshot for context, and brasileiro_check_team_trigger for the boolean decision.',
          'Do not perform external side effects until the caller confirms or the host workflow grants permission.'
        ].join('\n')
      }
    }]
  }));
}

function sourceOptions(input) {
  const options = {};

  if (input.group != null) {
    options.group = input.group;
  }

  if (input.number != null) {
    options.number = input.number;
  }

  if (input.url) {
    options.url = input.url;
  }

  if (input.html) {
    options.html = input.html;
  }

  return options;
}

function toolResult(command, payload) {
  return {
    content: [{
      type: 'text',
      text: renderHuman(command, payload, { format: 'markdown' }).trim()
    }],
    structuredContent: ensureStructuredContent(payload)
  };
}

function ensureStructuredContent(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }

  return {
    result: payload
  };
}

module.exports = {
  MCP_GUIDE,
  createMcpServer,
  runStdioServer
};
