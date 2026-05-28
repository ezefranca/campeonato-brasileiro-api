# campeonato-brasileiro-api

[![npm](https://img.shields.io/npm/v/campeonato-brasileiro-api.svg)](https://www.npmjs.com/package/campeonato-brasileiro-api)
[![npm](https://img.shields.io/npm/dt/campeonato-brasileiro-api.svg)](https://www.npmjs.com/package/campeonato-brasileiro-api)
[![skills.sh](https://img.shields.io/badge/skills.sh-campeonato--brasileiro-111827.svg)](https://github.com/ezefranca/campeonato-brasileiro-api/tree/master/skills/campeonato-brasileiro)

API moderna para consultar classificação e rodada atual das Séries A, B, C e D do Brasileirão.

Além da biblioteca JavaScript, o pacote agora inclui:

- CLI para humanos, scripts e cron jobs
- servidor MCP para Codex, Claude, Cursor e outros agentes
- Skill Codex em `skills/campeonato-brasileiro/`
- helpers de automação para perguntas como "me avise quando o Corinthians venceu"

## Compatibilidade

- Node.js `18+`
- Compatível com `require()` e `import`
- CLI e MCP empacotados no mesmo pacote
- MCP implementado com o SDK oficial `@modelcontextprotocol/sdk`


<img width="1123" height="435" alt="Screenshot 2026-05-28 at 13 09 18" src="https://github.com/user-attachments/assets/c41a221b-4647-4e71-accd-ac91b40d3408" />


## Instalação

```bash
npm install campeonato-brasileiro-api
```

Para usar como comando global:

```bash
npm install -g campeonato-brasileiro-api
```

Binários disponíveis:

- `campeonato-brasileiro`
- `campeonato-brasileiro-api`
- `brasileirao`
- `campeonato-brasileiro-mcp`

## CLI

Tabela para humanos:

```bash
campeonato-brasileiro standings a
```

JSON para automações e agentes:

```bash
campeonato-brasileiro standings a --json
campeonato-brasileiro rounds b --json
campeonato-brasileiro teams a Flamengo --json
campeonato-brasileiro team a Corinthians --json
campeonato-brasileiro trigger a Flamengo --condition won --json
```

Gatilho com exit code para shell scripts:

```bash
campeonato-brasileiro trigger a Flamengo --condition won --exit-code --json
```

O exit code é `0` quando o gatilho dispara e `2` quando não dispara.

Série D com grupo:

```bash
campeonato-brasileiro standings d --group A1 --json
campeonato-brasileiro trigger d "XV de Piracicaba" --group A14 --condition live --json
```

Formatos:

- `--format table` padrão para terminal
- `--format markdown`
- `--json`
- `--compact`

Fonte customizada/offline:

```bash
campeonato-brasileiro standings a --html ./serie-a.html --json
campeonato-brasileiro standings a --url https://ge.globo.com/futebol/brasileirao-serie-a/ --json
```

## MCP para agentes

Iniciar servidor stdio:

```bash
campeonato-brasileiro mcp
```

ou:

```bash
campeonato-brasileiro-mcp
```

Configuração compatível com Claude Desktop/Codex:

```json
{
  "mcpServers": {
    "campeonato-brasileiro": {
      "command": "npm",
      "args": [
        "exec",
        "--yes",
        "--package=github:ezefranca/campeonato-brasileiro-api",
        "--",
        "campeonato-brasileiro",
        "mcp"
      ]
    }
  }
}
```

Depois que `campeonato-brasileiro-api@2.1.0` estiver publicado no npm, também é possível trocar `--package=github:ezefranca/campeonato-brasileiro-api` por `--package=campeonato-brasileiro-api`.

Ferramentas MCP:

| Tool | Descrição |
| --- | --- |
| `brasileirao_list_series` | Lista séries suportadas |
| `brasileirao_get_competition` | Payload completo normalizado |
| `brasileirao_get_standings` | Classificação e legendas |
| `brasileirao_get_rounds` | Rodada atual e jogos |
| `brasileirao_find_teams` | Busca times por nome, sigla ou id |
| `brasileirao_get_team_snapshot` | Visão centrada em um time |
| `brasileirao_check_team_trigger` | Gatilho booleano para automações |

Recursos MCP:

- `brasileirao://guide`
- `brasileirao://series`
- `brasileirao://openapi`
- `brasileirao://standings/{serie}`

Prompt MCP:

- `brasileirao_automation_planner`

## Skill e agentes

O pacote inclui uma Skill Codex versionada no repositório:

```text
skills/campeonato-brasileiro/
```

Instalar com o `skills` CLI:

```bash
npx skills add https://github.com/ezefranca/campeonato-brasileiro-api --skill campeonato-brasileiro
```

Instalar globalmente para Codex:

```bash
npx skills add https://github.com/ezefranca/campeonato-brasileiro-api \
  --skill campeonato-brasileiro \
  -a codex \
  -g \
  -y
```

Usar a CLI sem instalação global, direto do GitHub:

```bash
npm exec --yes --package=github:ezefranca/campeonato-brasileiro-api -- campeonato-brasileiro standings a --format markdown
```

Use em prompts:

```text
Use $campeonato-brasileiro to build a workflow that notifies me when Flamengo wins.
```

Também há documentação para agentes em [docs/agents.md](docs/agents.md), além de instruções em `AGENTS.md`, `CLAUDE.md` e `.claude/commands/brasileirao.md`.

Regra operacional importante: o pacote informa o estado do futebol. A ação externa, como mandar mensagem, reservar hotel, comprar ingresso ou atualizar calendário, deve ser feita pelo agente/workflow chamador depois de verificar permissões.

## Demo local

Este repositório inclui um app de exemplo em `examples/demo/` para visualizar a classificação com os escudos dos times.

Executar com dados reais da internet:

```bash
npm run demo
```

ou, de forma explícita:

```bash
npm run demo:live
```

Depois abra:

```text
http://127.0.0.1:3020
```

Executar com fixtures locais, sem depender de rede:

```bash
npm run demo:fixtures
```

## Métodos disponíveis

| Método | Descrição |
| --- | --- |
| `listSeries()` | Lista as séries suportadas |
| `getCompetition(serie, options?)` | Retorna o payload completo normalizado |
| `getStandings(serie, options?)` | Retorna apenas classificação e legendas |
| `getTable(serie, options?)` | Retorna uma tabela única |
| `getGroups(serie, options?)` | Retorna os grupos da Série D |
| `getRounds(serie, options?)` | Retorna a rodada atual normalizada |
| `getCurrentRound(serie, options?)` | Alias de `getRounds()` |
| `findTeams(serie, query?, options?)` | Busca times por nome, sigla ou id |
| `getTeamSnapshot(serie, team, options?)` | Retorna classificação e jogos atuais de um time |
| `checkTeamResult(serie, team, condition?, options?)` | Avalia gatilhos de automação como `won`, `lost`, `live` |
| `tabela(serie, options?)` | Helper legado de classificação |
| `rodadaAtual(serie, rodada?, options?)` | Helper legado de jogos da rodada |

## Uso rápido

### CommonJS

```js
const brasileirao = require('campeonato-brasileiro-api');

const data = await brasileirao.getCompetition('a');

console.log(data.competition.name);
console.log(data.tables[0].entries[0].team.name);
console.log(data.rounds[0].matches.length);
```

### ESM

```js
import { getStandings, getRounds } from 'campeonato-brasileiro-api';

const standings = await getStandings('b');
const rounds = await getRounds('b');

console.log(standings.tables[0].entries[0]);
console.log(rounds.rounds[0].matches);
```

## Exemplos completos

### `listSeries()`

```js
const brasileirao = require('campeonato-brasileiro-api');

const series = brasileirao.listSeries();
console.log(series);
```

Saída esperada:

```js
[
  {
    code: 'a',
    slug: 'brasileirao-serie-a',
    name: 'Campeonato Brasileiro Série A',
    grouped: false,
    url: 'https://...'
  },
  {
    code: 'd',
    slug: 'brasileirao-serie-d',
    name: 'Campeonato Brasileiro Série D',
    grouped: true,
    url: 'https://...'
  }
]
```

### `getCompetition(serie, options?)`

Retorna o contrato principal do pacote:

- metadados da competição
- legendas
- tabelas
- rodadas
- jogos da rodada atual

```js
const brasileirao = require('campeonato-brasileiro-api');

const competition = await brasileirao.getCompetition('a');
console.log(competition);
```

Exemplo de shape:

```js
{
  competition: {
    code: 'a',
    slug: 'brasileirao-serie-a',
    name: 'Campeonato Brasileiro Série A 2026',
    season: 2026,
    sport: 'futebol',
    grouped: false,
    phase: {
      slug: 'fase-unica-campeonato-brasileiro-2026',
      disclaimer: '',
      description: 'Pontos Corridos',
      typeId: '1',
      grouped: false
    },
    edition: {
      name: 'Campeonato Brasileiro Série A 2026',
      location: 'Brasil',
      startsAt: '2026-03-28',
      endsAt: '2026-12-06',
      regulation: '...'
    },
    source: {
      provider: 'source',
      url: 'https://...',
      resourceId: '...',
      tUUID: '...'
    }
  },
  grouped: false,
  legends: [
    { id: 1, name: 'Libertadores', color: '#0000ff' }
  ],
  tables: [
    {
      id: 'overall',
      name: 'Classificacao geral',
      round: { number: 13, total: 38, label: '13a rodada' },
      entries: [
        {
          position: 1,
          team: {
            id: 275,
            name: 'Palmeiras',
            shortName: 'PAL',
            badge: 'https://...'
          },
          points: 32,
          matches: 13,
          wins: 10,
          draws: 2,
          losses: 1,
          goalsFor: 23,
          goalsAgainst: 10,
          goalDifference: 13,
          efficiency: 82,
          movement: 0,
          recentForm: ['W', 'W', 'D', 'W', 'W'],
          legend: { id: 1, name: 'Libertadores', color: '#0000ff' }
        }
      ]
    }
  ],
  rounds: [
    {
      id: 'overall',
      groupId: null,
      groupName: null,
      number: 13,
      total: 38,
      label: '13a rodada',
      matches: [
        {
          id: 346376,
          round: 13,
          totalRounds: 38,
          dateTime: '2026-04-25T18:30',
          date: '2026-04-25',
          time: '18:30',
          started: true,
          status: 'finished',
          statusCode: 'ENCERRADA',
          venue: 'Mané Garrincha',
          homeTeam: { id: 263, name: 'Botafogo', shortName: 'BOT', badge: 'https://...' },
          awayTeam: { id: 285, name: 'Internacional', shortName: 'INT', badge: 'https://...' },
          score: { home: 2, away: 2, penalties: null },
          coverage: {
            label: 'saiba como foi',
            url: 'https://...',
            statusCode: 'ENCERRADA'
          }
        }
      ]
    }
  ],
  matches: [
    {
      id: 346376,
      round: 13,
      status: 'finished'
    }
  ]
}
```

### `getStandings(serie, options?)`

```js
const brasileirao = require('campeonato-brasileiro-api');

const standings = await brasileirao.getStandings('c');
console.log(standings);
```

Exemplo de retorno:

```js
{
  competition: {
    code: 'c',
    name: 'Campeonato Brasileiro Série C 2026'
  },
  grouped: false,
  legends: [
    { id: 1, name: 'G8', color: '#0000ff' }
  ],
  tables: [
    {
      id: 'overall',
      name: 'Classificacao geral',
      entries: [
        {
          position: 1,
          team: { name: 'Amazonas', shortName: 'AMA' },
          points: 12
        }
      ]
    }
  ]
}
```

### `getTable(serie, options?)`

#### Série A, B ou C

```js
const brasileirao = require('campeonato-brasileiro-api');

const table = await brasileirao.getTable('a');
console.log(table.entries[0]);
```

#### Série D com grupo

```js
const brasileirao = require('campeonato-brasileiro-api');

const table = await brasileirao.getTable('d', { group: 'A14' });
console.log(table.name);
console.log(table.entries[0].team.name);
```

Exemplo de retorno:

```js
{
  id: 6014,
  name: 'Grupo A14',
  round: { number: 4, total: 10, label: '4a rodada' },
  entries: [
    {
      position: 1,
      team: {
        id: 305,
        name: 'XV de Piracicaba',
        shortName: 'XVP',
        badge: 'https://...'
      },
      points: 10
    }
  ]
}
```

### `getGroups(serie, options?)`

```js
const brasileirao = require('campeonato-brasileiro-api');

const groups = await brasileirao.getGroups('d');

for (const group of groups) {
  console.log(group.name, group.entries[0].team.name);
}
```

Exemplo de retorno:

```js
[
  {
    id: 5988,
    name: 'Grupo A1',
    entries: [
      { position: 1, team: { name: 'Nacional-AM' }, points: 9 }
    ]
  },
  {
    id: 6014,
    name: 'Grupo A14',
    entries: [
      { position: 1, team: { name: 'XV de Piracicaba' }, points: 10 }
    ]
  }
]
```

### `getRounds(serie, options?)`

#### Série A, B ou C

```js
const brasileirao = require('campeonato-brasileiro-api');

const rounds = await brasileirao.getRounds('a');
console.log(rounds.rounds[0].matches);
```

#### Série D com grupo

```js
const brasileirao = require('campeonato-brasileiro-api');

const rounds = await brasileirao.getRounds('d', { group: 'Grupo A1' });
console.log(rounds.rounds[0]);
```

Exemplo de retorno:

```js
{
  competition: {
    code: 'd',
    name: 'Campeonato Brasileiro Série D 2026'
  },
  grouped: true,
  rounds: [
    {
      id: 5988,
      groupId: 5988,
      groupName: 'Grupo A1',
      number: 4,
      total: 10,
      label: '4a rodada',
      matches: [
        {
          id: 351601,
          status: 'scheduled',
          venue: 'Ismael Benigno',
          homeTeam: { name: 'Manauara' },
          awayTeam: { name: 'Monte Roraima' },
          score: { home: 2, away: 0, penalties: null }
        }
      ]
    }
  ]
}
```

### `getCurrentRound(serie, options?)`

É um alias de `getRounds()`:

```js
const brasileirao = require('campeonato-brasileiro-api');

const currentRound = await brasileirao.getCurrentRound('b');
console.log(currentRound.rounds[0].number);
```

### `findTeams(serie, query?, options?)`

Busca times por nome, sigla ou id dentro da classificação e da rodada ativa.

```js
const brasileirao = require('campeonato-brasileiro-api');

const result = await brasileirao.findTeams('a', 'fla');

console.log(result.teams[0].team.name);     // Flamengo
console.log(result.teams[0].matchedBy);     // shortName, name, id, etc.
```

### `getTeamSnapshot(serie, team, options?)`

Retorna uma visão centrada em um time:

- dados da competição
- time resolvido
- posição na tabela quando disponível
- jogos do time na rodada atual
- resultado final (`outcome`) quando o jogo terminou
- estado parcial (`scoreState`) quando há placar disponível

```js
const brasileirao = require('campeonato-brasileiro-api');

const snapshot = await brasileirao.getTeamSnapshot('a', 'Corinthians');

console.log(snapshot.standing);
console.log(snapshot.matches);
```

### `checkTeamResult(serie, team, condition?, options?)`

Helper recomendado para automações.

```js
const brasileirao = require('campeonato-brasileiro-api');

const result = await brasileirao.checkTeamResult('a', 'Flamengo', 'won');

if (result.trigger.shouldFire) {
  // Chame aqui seu sistema de mensagem, agenda, reserva, workflow, etc.
}
```

Condições suportadas:

- `won`
- `lost`
- `drew`
- `not_won`
- `played`
- `finished`
- `live`
- `scheduled`

Estados possíveis:

| Estado | Significado |
| --- | --- |
| `triggered` | A condição foi satisfeita |
| `pending` | Há jogo ao vivo/agendado que ainda pode satisfazer a condição |
| `not_satisfied` | O jogo atual está definido, mas a condição é falsa |
| `no_match` | O time não aparece na rodada ativa exposta pela fonte |

### `tabela(serie, options?)`

Helper legado com shape próximo ao pacote original.

```js
const brasileirao = require('campeonato-brasileiro-api');

const table = await brasileirao.tabela('a');
console.log(table[0]);
```

Exemplo de retorno:

```js
[
  {
    nome: 'Palmeiras',
    sigla: 'PAL',
    escudo: 'https://...',
    posicao: 1,
    pontos: '32',
    jogos: '13',
    vitorias: '10',
    empates: '2',
    derrotas: '1',
    golsPro: '23',
    golsContra: '10',
    saldoGols: '13',
    percentual: '82'
  }
]
```

### `rodadaAtual(serie, rodada?, options?)`

Helper legado para jogos da rodada atual.

```js
const brasileirao = require('campeonato-brasileiro-api');

const jogos = await brasileirao.rodadaAtual('a', 13);
console.log(jogos);
```

Exemplo de retorno:

```js
[
  {
    mandante: 'Botafogo',
    placarMandante: 2,
    visitante: 'Internacional',
    placarVisitante: 2
  },
  {
    mandante: 'Athletico-PR',
    placarMandante: 3,
    visitante: 'Vitória',
    placarVisitante: 1
  }
]
```

Na Série D:

```js
const brasileirao = require('campeonato-brasileiro-api');

const jogos = await brasileirao.rodadaAtual('d', 4, { group: 'A1' });
console.log(jogos);
```

## Série D

A Série D é agrupada por design:

- `getStandings('d')` retorna todas as tabelas dos grupos
- `getGroups('d')` é o atalho mais direto para esses grupos
- `getTable('d', { group })` exige um grupo
- `getRounds('d', { group })` retorna a rodada atual do grupo selecionado

O campo `group` aceita, por exemplo:

- `A1`
- `Grupo A1`
- o `id` numérico do grupo

## Options

Todos os métodos principais aceitam `options`.

- `url`: sobrescreve a URL da competição
- `html`: usa um HTML já carregado, sem fazer fetch
- `fetch`: injeta uma implementação customizada de fetch
- `headers`: headers extras para a requisição
- `signal`: `AbortSignal`
- `group`: seleciona um grupo na Série D
- `number`: valida a rodada esperada em `getRounds()`

### Exemplo com `html`

```js
const fs = require('node:fs');
const brasileirao = require('campeonato-brasileiro-api');

const html = fs.readFileSync('./fixtures/serie-a.html', 'utf8');
const data = await brasileirao.getCompetition('a', { html });
```

### Exemplo com `fetch` customizado

```js
import { getCompetition } from 'campeonato-brasileiro-api';

const data = await getCompetition('b', {
  fetch: globalThis.fetch,
  headers: {
    'user-agent': 'my-app/1.0.0'
  }
});
```

## Erros

Os métodos podem lançar `BrasileiroApiError`.

Principais códigos:

- `INVALID_SERIE`
- `FETCH_UNAVAILABLE`
- `FETCH_FAILED`
- `INVALID_RESPONSE`
- `GROUP_REQUIRED`
- `GROUP_NOT_FOUND`
- `ROUND_NOT_AVAILABLE`
- `INVALID_TEAM`
- `TEAM_NOT_FOUND`
- `INVALID_CONDITION`

Exemplo:

```js
const brasileirao = require('campeonato-brasileiro-api');

try {
  await brasileirao.getTable('d');
} catch (error) {
  console.log(error.name);
  console.log(error.code);
  console.log(error.message);
  console.log(error.details);
}
```

## Especificação OpenAPI

Este repositório agora inclui uma especificação OpenAPI 3.0 de referência em [docs/openapi.json](docs/openapi.json).

Importante:

- a biblioteca não expõe um servidor HTTP por conta própria
- a spec descreve um contrato REST de referência para quem quiser criar um wrapper HTTP sobre o pacote
- o arquivo é compatível com Swagger UI, Redoc e ferramentas OpenAPI em geral

Rotas cobertas na spec:

- `GET /series`
- `GET /competitions/{serie}`
- `GET /competitions/{serie}/standings`
- `GET /competitions/{serie}/table`
- `GET /competitions/{serie}/groups`
- `GET /competitions/{serie}/rounds`
- `GET /competitions/{serie}/current-round`
- `GET /competitions/{serie}/teams`
- `GET /competitions/{serie}/teams/{team}`
- `GET /competitions/{serie}/teams/{team}/trigger`
- `GET /legacy/{serie}/tabela`
- `GET /legacy/{serie}/rodada-atual`

## Limitações atuais da fonte

A fonte atual expõe de forma estável a classificação e a rodada ativa da competição. O pacote valida `number`, mas não inventa histórico de rodadas que a página não entrega.

## Licença

MIT

## Aviso

Este projeto é fornecido apenas para fins educacionais.
