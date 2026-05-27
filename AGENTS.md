# Agent Guide

Use the package APIs, CLI or MCP server as the source of truth for Brasileirão data. Do not scrape GE directly from agent code unless you are changing the parser itself.

Core surfaces:

- Library: `index.js` / `index.mjs`
- CLI: `bin/campeonato-brasileiro.js`
- MCP: `mcp/server.js`
- Skill: `skills/campeonato-brasileiro/`
- Full agent docs: `docs/agents.md`

For automations, prefer `checkTeamResult` or MCP tool `brasileirao_check_team_trigger`. Only treat `trigger.shouldFire === true` as permission to continue the football-dependent workflow; external side effects still require the host/user's permission.

The upstream source exposes standings and the active rodada, not full match history. Keep tests fixture-driven when possible.
