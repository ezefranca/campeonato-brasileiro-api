# API simples do Campeonato Brasileiro com tabela e rodadas

[![npm](https://img.shields.io/npm/v/campeonato-brasileiro-api.svg)](https://www.npmjs.com/package/campeonato-brasileiro-api)
[![npm](https://img.shields.io/npm/dm/campeonato-brasileiro-api.svg)](https://www.npmjs.com/package/campeonato-brasileiro-api)

O **campeonato-brasileiro-api** é um módulo para consulta da tabela e rodadas do campeonato brasileiro

## Instalação

```npm install campeonato-brasileiro-api --save ```

## Exemplos

### Tabela

```js

const cb = require('campeonato-brasileiro-api');

const serie = 'a';

cb.tabela(serie).then(function(tabela) {
	console.log(tabela);
}, function(err){
	console.log(err);
});
```

#### Objeto de Retorno

```js
[{
	nome: "Atlético",
	pontos: "10",
	jogos: "5",
	vitorias: "2",
	empates: "2",
	derrotas: "1",
	golsPro: "10",
	golsContra: "4",
	saldoGols: "6",
	percentual: "66.3"
}]
```

#### Objeto de erro

```js
{ error: 'Não foi possível retornar as informações!' }
```

### Rodada 

Para rodada, passe o numero da rodada e série. 

```js

const cb = require('campeonato-brasileiro-api');

const serie = 'a';
const rodada = '4';

cb.rodadaAtual(serie, rodada).then(function(rodada) {
	console.log(rodada);
}, function(err){
	console.log(err);
});
```

#### Objeto de Retorno

```js
[{
	 mandante: 'América-MG',
	 placarMandante: 0,
	 visitante: 'Corinthians',
	 placarVisitante: 0
 }]
```

#### Objeto de erro

```js
{ error: 'Não foi possível retornar as informações!' }
```
