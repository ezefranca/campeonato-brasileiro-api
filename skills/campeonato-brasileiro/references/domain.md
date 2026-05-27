# Campeonato Brasileiro Agent Reference

## Public Agent APIs

Use these package functions for automation-oriented work:

- `findTeams(serie, query?, options?)`: returns ranked team candidates from standings and current-round matches.
- `getTeamSnapshot(serie, team, options?)`: returns a team-centric payload with standing, active rodada matches, outcome booleans and supported conditions.
- `checkTeamResult(serie, team, condition?, options?)`: returns `trigger.shouldFire`, `trigger.state`, `trigger.reason`, and matched matches.

Supported conditions:

- `won`: a finished current-round match has final outcome `win`.
- `lost`: a finished current-round match has final outcome `loss`.
- `drew`: a finished current-round match has final outcome `draw`.
- `not_won`: a finished current-round match exists and the team did not win.
- `played`: the current-round match has started or finished.
- `finished`: the current-round match is finished.
- `live`: the current-round match is live.
- `scheduled`: the current-round match is scheduled.

Portuguese aliases such as `venceu`, `derrota`, `empate`, `ao vivo` and `agendado` are accepted.

## CLI

Install the agent skill:

```bash
npx skills add https://github.com/ezefranca/campeonato-brasileiro-api --skill campeonato-brasileiro
```

Install globally for Codex:

```bash
npx skills add https://github.com/ezefranca/campeonato-brasileiro-api \
  --skill campeonato-brasileiro \
  -a codex \
  -g \
  -y
```

Install/run:

```bash
npm install -g campeonato-brasileiro-api
campeonato-brasileiro series
```

Useful commands:

```bash
campeonato-brasileiro standings a --json
campeonato-brasileiro rounds b --json
campeonato-brasileiro teams a Corinthians --json
campeonato-brasileiro team a Flamengo --json
campeonato-brasileiro trigger a Flamengo --condition won --json
campeonato-brasileiro trigger a Flamengo --condition won --exit-code
```

For Série D:

```bash
campeonato-brasileiro standings d --group A1 --json
campeonato-brasileiro trigger d "XV de Piracicaba" --group A14 --condition live --json
```

Use `--html <file>` for offline GE HTML snapshots and `--url <url>` to override the source.

## MCP Setup

The package ships a stdio MCP server. Example host config:

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

Equivalent direct binary:

```json
{
  "mcpServers": {
    "campeonato-brasileiro": {
      "command": "campeonato-brasileiro-mcp"
    }
  }
}
```

Primary MCP tools:

- `brasileirao_list_series`
- `brasileirao_get_competition`
- `brasileirao_get_standings`
- `brasileirao_get_rounds`
- `brasileirao_find_teams`
- `brasileirao_get_team_snapshot`
- `brasileirao_check_team_trigger`

## Interpretation Rules

- `shouldFire: true` is the only positive automation signal.
- `pending` means the workflow should wait, poll later, or subscribe in the external scheduler.
- `no_match` is not an error; it means the team is not in the active rodada exposed by the source.
- Do not infer historical games. The source exposes the active rodada.
- Do not send messages, book hotels, make purchases or trigger irreversible actions unless the host/user grants permission.
