# Agent and Automation Guide

`campeonato-brasileiro-api` exposes the Brasileirão in four agent-friendly layers:

- Library API for JavaScript applications.
- CLI for shell scripts, cron jobs, CI and no-code wrappers.
- MCP server for Codex, Claude, Cursor and other agent hosts.
- Codex Skill in `skills/campeonato-brasileiro/` for reusable agent instructions.

The package reports football state. External actions such as sending messages, booking hotels, buying tickets or changing calendars must be performed by the caller's automation system after checking permissions.

## Best Interface by Use Case

| Use case | Interface |
| --- | --- |
| Agent inside Codex/Claude | MCP server |
| Shell automation or cron | CLI with `--json` |
| Node app or bot | Library API |
| Teaching agents how to reason about the domain | Skill |
| Human terminal inspection | CLI tables or markdown |

Agents do not need a TUI. They need structured JSON, stable tool names and explicit trigger states. The CLI still renders tables by default for humans.

## Automation Trigger Semantics

Use `checkTeamResult` or `brasileirao_check_team_trigger` for requests like:

- "Send me a message when Corinthians won."
- "Book a hotel when Flamengo wins."
- "Tell me if Palmeiras is live."
- "Run this workflow when Botafogo did not win."

Positive action condition:

```js
result.trigger.shouldFire === true
```

Trigger states:

| State | Meaning | Suggested workflow behavior |
| --- | --- | --- |
| `triggered` | Condition is satisfied | Run the approved external action |
| `pending` | Relevant match is live or scheduled | Wait, poll later or keep monitoring |
| `not_satisfied` | Match is settled and condition is false | Do nothing |
| `no_match` | Team is not in the active rodada payload | Do nothing or check again later |

Supported conditions:

`won`, `lost`, `drew`, `not_won`, `played`, `finished`, `live`, `scheduled`.

Portuguese aliases such as `venceu`, `derrota`, `empate`, `ao vivo` and `agendado` are accepted.

## MCP

Start the stdio server:

```bash
campeonato-brasileiro-mcp
```

Or through the main CLI:

```bash
campeonato-brasileiro mcp
```

Claude Desktop / Codex-style MCP config:

```json
{
  "mcpServers": {
    "campeonato-brasileiro": {
      "command": "npx",
      "args": ["-y", "campeonato-brasileiro-api", "mcp"]
    }
  }
}
```

If installed globally:

```json
{
  "mcpServers": {
    "campeonato-brasileiro": {
      "command": "campeonato-brasileiro-mcp"
    }
  }
}
```

Primary tools:

| Tool | Purpose |
| --- | --- |
| `brasileirao_list_series` | Supported series metadata |
| `brasileirao_get_competition` | Full normalized payload |
| `brasileirao_get_standings` | Standings and legends |
| `brasileirao_get_rounds` | Active rodada matches |
| `brasileirao_find_teams` | Ranked team search |
| `brasileirao_get_team_snapshot` | Team-centric standing and current match view |
| `brasileirao_check_team_trigger` | Automation boolean and state |

The MCP server also exposes:

- `brasileirao://guide`
- `brasileirao://series`
- `brasileirao://openapi`
- `brasileirao://standings/{serie}`
- prompt `brasileirao_automation_planner`

## CLI

Human table:

```bash
campeonato-brasileiro standings a
```

Agent JSON:

```bash
campeonato-brasileiro standings a --json
campeonato-brasileiro rounds b --json
campeonato-brasileiro teams a Flamengo --json
campeonato-brasileiro team a Corinthians --json
campeonato-brasileiro trigger a Flamengo --condition won --json
```

Shell-friendly trigger exit code:

```bash
campeonato-brasileiro trigger a Flamengo --condition won --exit-code --json
```

Exit code is `0` when the trigger fires and `2` when it does not.

Offline parsing:

```bash
campeonato-brasileiro standings a --html ./serie-a.html --json
```

Serie D group example:

```bash
campeonato-brasileiro trigger d "XV de Piracicaba" --group A14 --condition live --json
```

## Library API

```js
const brasileirao = require('campeonato-brasileiro-api');

const trigger = await brasileirao.checkTeamResult('a', 'Flamengo', 'won');

if (trigger.trigger.shouldFire) {
  // Call your messaging, booking, calendar or workflow system here.
}
```

Team snapshot:

```js
const snapshot = await brasileirao.getTeamSnapshot('a', 'Corinthians');

console.log(snapshot.standing);
console.log(snapshot.matches);
```

Team discovery:

```js
const candidates = await brasileirao.findTeams('a', 'fla');
console.log(candidates.teams[0].team.name);
```

## Codex Skill

The skill lives in:

```text
skills/campeonato-brasileiro/
```

Use it explicitly:

```text
Use $campeonato-brasileiro to build a workflow that notifies me when Flamengo wins.
```

The skill instructs agents to prefer MCP, fall back to CLI, and use the library for code changes.

## Data Boundaries

- The upstream GE source exposes current standings and the active rodada.
- The package validates requested rodada numbers but does not invent historical rounds.
- Serie D is grouped; use `group` for group-specific answers.
- Use `source.url`, CLI `--url`, or CLI `--html` for custom/offline source data.
