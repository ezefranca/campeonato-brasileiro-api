# Claude Project Notes

Read `docs/agents.md` before answering Brasileirão automation questions in this repository.

Prefer the MCP server tools when available:

- `brasileirao_find_teams`
- `brasileirao_get_team_snapshot`
- `brasileirao_check_team_trigger`

Fallbacks:

- CLI: `campeonato-brasileiro trigger <serie> <team> --condition won --json`
- Library: `checkTeamResult(serie, team, condition)`

Do not infer historical rodada data beyond what the source exposes. Do not perform messaging, booking, purchasing or other external side effects unless the user or host workflow explicitly grants permission.
