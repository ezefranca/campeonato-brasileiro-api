# campeonato-brasileiro-api

[![npm](https://img.shields.io/npm/v/campeonato-brasileiro-api.svg)](https://www.npmjs.com/package/campeonato-brasileiro-api)
[![npm](https://img.shields.io/npm/dt/campeonato-brasileiro-api.svg)](https://www.npmjs.com/package/campeonato-brasileiro-api)

API moderna para consultar classificação e rodada atual das Séries A, B, C e D do Brasileirão.

## Compatibilidade

- Node.js `18+`
- Sem dependências de runtime
- Compatível com `require()` e `import`

## Instalação

```bash
npm install campeonato-brasileiro-api
```

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
- `GET /legacy/{serie}/tabela`
- `GET /legacy/{serie}/rodada-atual`

## Limitações atuais da fonte

A fonte atual expõe de forma estável a classificação e a rodada ativa da competição. O pacote valida `number`, mas não inventa histórico de rodadas que a página não entrega.

## Licença

MIT

## Aviso

Este projeto é fornecido apenas para fins educacionais.
