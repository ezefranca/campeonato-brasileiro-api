---
name: campeonato-brasileiro
description: Work with Campeonato Brasileiro/Brasileirão football data for agent tasks and automations. Use when users ask about Série A, B, C or D standings, current rodada matches, team lookups, whether a team won/lost/drew/is live/scheduled, or automation triggers such as sending a message when Corinthians wins or taking an external action after Flamengo wins.
---

# Campeonato Brasileiro

Use this skill to answer Brasileirão questions and build automation logic from the package's normalized data. Prefer structured tools over scraping or guessing.

## Tool Order

1. Use the MCP server when available. Prefer these tools:
   - `brasileirao_find_teams` for ambiguous names, acronyms or ids.
   - `brasileirao_get_team_snapshot` for a team-centric view.
   - `brasileirao_check_team_trigger` for automation conditions.
   - `brasileirao_get_standings` and `brasileirao_get_rounds` for general context.
2. If MCP is unavailable, use the CLI:
   - `campeonato-brasileiro teams a Corinthians --json`
   - `campeonato-brasileiro team a Flamengo --json`
   - `campeonato-brasileiro trigger a Flamengo --condition won --json`
3. In code, import `campeonato-brasileiro-api` and call `findTeams`, `getTeamSnapshot`, or `checkTeamResult`.

## Automation Workflow

For requests like "message me when Corinthians won" or "book a hotel when Flamengo wins":

1. Identify the Serie. If missing or ambiguous, ask for it or search likely series with `findTeams`.
2. Resolve the team with `findTeams`; prefer exact id/name/acronym matches.
3. Call `checkTeamResult(serie, team, condition)` or the MCP equivalent.
4. Treat `trigger.shouldFire === true` as the only positive signal to perform the user's requested external action.
5. Treat `trigger.state` as operational state:
   - `triggered`: condition is satisfied.
   - `pending`: a relevant match is live or scheduled and may satisfy the condition later.
   - `not_satisfied`: current match is settled but does not satisfy the condition.
   - `no_match`: team is not in the active rodada payload.
6. Do not perform external side effects such as sending messages, booking travel or purchasing anything unless the host workflow has permission.

## Data Limits

The upstream GE source exposes current standings and the active rodada. Do not claim full historical coverage unless the user provides another source. For Série D, pass `group` when the user needs a specific group.

Read `references/domain.md` when you need exact field names, condition semantics, CLI examples, or MCP setup snippets.
