---
name: campeonato-brasileiro
description: Work with Campeonato Brasileiro/Brasileirão football data for agent tasks and automations. Use when users ask about Série A, B, C or D standings, current rodada matches, team lookups, whether a team won/lost/drew/is live/scheduled, or automation triggers such as sending a message when Corinthians wins or taking an external action after Flamengo wins.
---

# Campeonato Brasileiro

Use this skill to answer Brasileirão questions and build automation logic from the package's normalized data. Prefer the no-install GitHub CLI command below unless MCP tools are already visible in the current agent session.

## Fast Path

For common read-only questions, use the GitHub-backed CLI directly. It works even when the npm `latest` release has not caught up and nothing is installed globally:

```bash
npm exec --yes --package=github:ezefranca/campeonato-brasileiro-api -- campeonato-brasileiro standings a --format markdown
```

For "current table" without a Serie, assume Série A and say that assumption. Return the command's markdown table directly, trimming only if the user asked for a summary. Do not run extra metadata commands unless the user asks for source details.

## Tool Order

1. If `brasileirao_*` MCP tools are visible in the current tool list, use them:
   - `brasileirao_find_teams` for ambiguous names, acronyms or ids.
   - `brasileirao_get_team_snapshot` for a team-centric view.
   - `brasileirao_check_team_trigger` for automation conditions.
   - `brasileirao_get_standings` and `brasileirao_get_rounds` for general context.
2. If MCP tools are not visible, do not probe for MCP. Use `npm exec --yes --package=github:ezefranca/campeonato-brasileiro-api -- campeonato-brasileiro ...`.
3. If `campeonato-brasileiro` is already on PATH, it is acceptable to use it, but do not require a global install.
4. In code, import `campeonato-brasileiro-api` and call `findTeams`, `getTeamSnapshot`, or `checkTeamResult`.

Useful no-install commands:

```bash
npm exec --yes --package=github:ezefranca/campeonato-brasileiro-api -- campeonato-brasileiro standings a --format markdown
npm exec --yes --package=github:ezefranca/campeonato-brasileiro-api -- campeonato-brasileiro standings a --json
npm exec --yes --package=github:ezefranca/campeonato-brasileiro-api -- campeonato-brasileiro rounds a --json
npm exec --yes --package=github:ezefranca/campeonato-brasileiro-api -- campeonato-brasileiro teams a Corinthians --json
npm exec --yes --package=github:ezefranca/campeonato-brasileiro-api -- campeonato-brasileiro trigger a Flamengo --condition won --json
```

Avoid these brittle fallbacks:

- `npx campeonato-brasileiro-api ...` while npm `latest` is older than `2.1.0`.
- `require('campeonato-brasileiro-api')` from an `npm exec` transient shell; Node may not resolve that package path reliably.
- Installing into a temporary directory unless every documented command above fails.

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
