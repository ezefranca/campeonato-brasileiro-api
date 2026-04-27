# campeonato-brasileiro-api

[![npm](https://img.shields.io/npm/v/campeonato-brasileiro-api.svg)](https://www.npmjs.com/package/campeonato-brasileiro-api)
[![npm](https://img.shields.io/npm/dm/campeonato-brasileiro-api.svg)](https://www.npmjs.com/package/campeonato-brasileiro-api)

API moderna para consultar classificação e rodada atual das Séries A, B, C e D do Brasileirão.

## O que mudou

- Sem dependências de runtime.
- Compatível com Node.js `18+`.
- Suporte consistente para Série `A`, `B`, `C` e `D`.
- Série D com grupos de primeira classe.
- Entradas modernas para `require()` e `import`.
- Helpers legados `tabela()` e `rodadaAtual()` preservados.

## Instalação

```bash
npm install campeonato-brasileiro-api
```

## Uso rápido

### CommonJS

```js
const brasileirao = require('campeonato-brasileiro-api');

const serieA = await brasileirao.getCompetition('a');

console.log(serieA.tables[0].entries[0].team.name);
console.log(serieA.rounds[0].matches.length);
```

### ESM

```js
import { getStandings, getRounds } from 'campeonato-brasileiro-api';

const standings = await getStandings('b');
const rounds = await getRounds('b');

console.log(standings.tables[0].entries[0]);
console.log(rounds.rounds[0].matches);
```

## API

### `listSeries()`

Retorna as séries suportadas.

```js
const series = brasileirao.listSeries();
```

### `getCompetition(serie, options?)`

Retorna o payload completo normalizado:

- metadados da competição
- legendas
- tabelas
- rodada atual
- jogos da rodada atual

```js
const data = await brasileirao.getCompetition('a');
```

Exemplo de shape:

```js
{
  competition: {
    code: 'a',
    slug: 'brasileirao-serie-a',
    name: 'Campeonato Brasileiro Série A 2026',
    season: 2026,
    grouped: false,
    source: {
      provider: 'source',
      url: 'https://example.com/competicao'
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
      number: 13,
      total: 38,
      label: '13a rodada',
      matches: [
        {
          id: 346376,
          dateTime: '2026-04-25T18:30',
          status: 'finished',
          venue: 'Mané Garrincha',
          homeTeam: { id: 263, name: 'Botafogo', shortName: 'BOT', badge: 'https://...' },
          awayTeam: { id: 285, name: 'Internacional', shortName: 'INT', badge: 'https://...' },
          score: { home: 2, away: 2, penalties: null }
        }
      ]
    }
  ]
}
```

### `getStandings(serie, options?)`

Retorna apenas classificação e legendas.

```js
const standings = await brasileirao.getStandings('c');
```

### `getTable(serie, options?)`

Retorna uma tabela única.

Para a Série D, passe um grupo:

```js
const table = await brasileirao.getTable('d', { group: 'A14' });
```

### `getGroups(serie, options?)`

Atalho para listar as tabelas agrupadas da Série D.

```js
const groups = await brasileirao.getGroups('d');
```

### `getRounds(serie, options?)`

Retorna a rodada atual normalizada.

Para a Série D, cada grupo vem com sua própria rodada atual:

```js
const rounds = await brasileirao.getRounds('d', { group: 'Grupo A1' });
```

### `getCurrentRound(serie, options?)`

Alias de `getRounds()`.

## Helpers legados

### `tabela(serie, options?)`

Mantém um formato próximo ao pacote antigo:

```js
const table = await brasileirao.tabela('a');
```

### `rodadaAtual(serie, rodada?, options?)`

Mantém o helper antigo para jogos da rodada atual.

```js
const jogos = await brasileirao.rodadaAtual('a', 13);
```

## Série D

A Série D é tratada como competição agrupada:

```js
const standings = await brasileirao.getStandings('d');

for (const group of standings.tables) {
  console.log(group.name, group.entries[0].team.name);
}
```

## Options

Todos os métodos principais aceitam `options`.

- `url`: sobrescreve a URL da competição.
- `html`: parseia um HTML já carregado sem fazer fetch.
- `fetch`: injeta uma implementação customizada de fetch.
- `headers`: headers extras para a requisição.
- `signal`: `AbortSignal`.
- `group`: seleciona um grupo na Série D.
- `number`: valida a rodada esperada em `getRounds()`.

## Limitação atual da fonte

As páginas atuais da fonte expõem de forma estável a classificação e a rodada ativa da competição. O pacote valida `number`, mas hoje não inventa histórico de rodadas que a página não entrega.

## Licença

MIT

## Aviso

Este projeto é fornecido apenas para fins educacionais.
