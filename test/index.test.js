const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const api = require('../index.js');

function fixture(name) {
  return readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

const fixtures = {
  a: fixture('serie-a.html'),
  b: fixture('serie-b.html'),
  c: fixture('serie-c.html'),
  d: fixture('serie-d.html')
};

test('listSeries exposes the supported competitions', () => {
  const series = api.listSeries();

  assert.equal(series.length, 4);
  assert.deepEqual(
    series.map((serie) => serie.code),
    ['a', 'b', 'c', 'd']
  );
  assert.equal(series[3].grouped, true);
});

test('getCompetition parses Série A standings and current round', async () => {
  const competition = await api.getCompetition('a', { html: fixtures.a });

  assert.equal(competition.competition.code, 'a');
  assert.equal(competition.competition.season, 2026);
  assert.equal(competition.grouped, false);
  assert.equal(competition.legends[0].name, 'Libertadores');
  assert.equal(competition.tables.length, 1);
  assert.equal(competition.tables[0].entries[0].team.name, 'Palmeiras');
  assert.deepEqual(competition.tables[0].entries[0].recentForm, ['W', 'W', 'D', 'W', 'W']);
  assert.equal(competition.rounds[0].number, 13);
  assert.equal(competition.matches[0].homeTeam.name, 'Botafogo');
  assert.equal(competition.matches[1].score.home, 3);
});

test('getCompetition parses Série B and Série C pages with the same model', async () => {
  const serieB = await api.getCompetition('b', { html: fixtures.b });
  const serieC = await api.getCompetition('c', { html: fixtures.c });

  assert.equal(serieB.tables[0].entries[0].team.name, 'Vila Nova');
  assert.equal(serieB.rounds[0].number, 6);
  assert.equal(serieB.matches[1].status, 'scheduled');

  assert.equal(serieC.tables[0].entries[0].team.name, 'Amazonas');
  assert.equal(serieC.rounds[0].number, 4);
  assert.equal(serieC.matches[0].coverage.label, 'saiba como foi');
});

test('getCompetition parses grouped Série D data', async () => {
  const competition = await api.getCompetition('d', { html: fixtures.d });

  assert.equal(competition.grouped, true);
  assert.equal(competition.tables.length, 2);
  assert.equal(competition.tables[0].name, 'Grupo A1');
  assert.equal(competition.tables[1].entries[0].team.name, 'XV de Piracicaba');
  assert.equal(competition.rounds[0].groupName, 'Grupo A1');
  assert.equal(competition.rounds[1].matches[0].venue, 'Barão de Serra Negra');
});

test('group helpers select a specific Série D table and round', async () => {
  const table = await api.getTable('d', {
    html: fixtures.d,
    group: 'a14'
  });
  const rounds = await api.getRounds('d', {
    html: fixtures.d,
    group: 'Grupo A1'
  });

  assert.equal(table.name, 'Grupo A14');
  assert.equal(table.entries[0].team.name, 'XV de Piracicaba');
  assert.equal(rounds.rounds.length, 1);
  assert.equal(rounds.rounds[0].groupName, 'Grupo A1');
  assert.equal(rounds.rounds[0].matches[0].homeTeam.name, 'Manauara');
});

test('legacy tabela and rodadaAtual helpers still work', async () => {
  const table = await api.tabela('a', { html: fixtures.a });
  const round = await api.rodadaAtual('a', 13, { html: fixtures.a });

  assert.equal(table[0].nome, 'Palmeiras');
  assert.equal(table[0].pontos, '32');
  assert.equal(round[0].mandante, 'Botafogo');
  assert.equal(round[0].placarVisitante, 2);
});

test('requesting a non-current round fails with a clear error', async () => {
  await assert.rejects(
    api.rodadaAtual('a', 12, { html: fixtures.a }),
    (error) => {
      assert.equal(error.code, 'ROUND_NOT_AVAILABLE');
      return true;
    }
  );
});

test('grouped competitions require a group when using getTable', async () => {
  await assert.rejects(
    api.getTable('d', { html: fixtures.d }),
    (error) => {
      assert.equal(error.code, 'GROUP_REQUIRED');
      return true;
    }
  );
});

test('the ESM entrypoint re-exports the same public API', async () => {
  const esm = await import(pathToFileURL(path.join(__dirname, '..', 'index.mjs')).href);

  assert.equal(typeof esm.getCompetition, 'function');
  assert.equal(typeof esm.tabela, 'function');
  assert.equal(esm.SUPPORTED_SERIES.length, 4);
});

test('the OpenAPI reference spec is valid JSON and documents the main routes', () => {
  const specPath = path.join(__dirname, '..', 'docs', 'openapi.json');
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));

  assert.equal(spec.openapi, '3.0.3');
  assert.equal(spec.info.version, '2.0.1');
  assert.ok(spec.paths['/series']);
  assert.ok(spec.paths['/competitions/{serie}']);
  assert.ok(spec.paths['/competitions/{serie}/standings']);
  assert.ok(spec.paths['/competitions/{serie}/rounds']);
  assert.ok(spec.paths['/legacy/{serie}/tabela']);
  assert.ok(spec.paths['/legacy/{serie}/rodada-atual']);
});
