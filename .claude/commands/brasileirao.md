Use the Campeonato Brasileiro MCP tools when available.

Workflow:

1. If the team is ambiguous, call `brasileirao_find_teams`.
2. For context, call `brasileirao_get_team_snapshot`.
3. For automation decisions, call `brasileirao_check_team_trigger`.
4. Only act on `trigger.shouldFire === true`.

If MCP is unavailable, use:

```bash
campeonato-brasileiro trigger <serie> <team> --condition won --json
```

Respect `pending`, `not_satisfied` and `no_match` states. Do not perform external side effects without permission.
