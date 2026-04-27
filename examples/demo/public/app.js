const serieSelect = document.querySelector('#serieSelect');
const groupField = document.querySelector('#groupField');
const groupSelect = document.querySelector('#groupSelect');
const reloadButton = document.querySelector('#reloadButton');
const competitionName = document.querySelector('#competitionName');
const roundLabel = document.querySelector('#roundLabel');
const groupMode = document.querySelector('#groupMode');
const tableTitle = document.querySelector('#tableTitle');
const tableSubtitle = document.querySelector('#tableSubtitle');
const legendList = document.querySelector('#legendList');
const statusMessage = document.querySelector('#statusMessage');
const standingsTable = document.querySelector('#standingsTable');
const standingsBody = document.querySelector('#standingsBody');

let supportedSeries = [];

init().catch((error) => {
  renderError(error.message || 'Não foi possível iniciar o demo.');
});

serieSelect.addEventListener('change', async () => {
  await syncGroupSelector();
  await loadStandings();
});

groupSelect.addEventListener('change', async () => {
  await loadStandings();
});

reloadButton.addEventListener('click', async () => {
  await loadStandings();
});

async function init() {
  setLoading('Carregando séries...');
  const response = await fetchJson('/api/series');
  supportedSeries = response.items || [];

  renderSeriesOptions();
  await syncGroupSelector();
  await loadStandings();
}

function renderSeriesOptions() {
  serieSelect.innerHTML = supportedSeries
    .map(
      (serie) =>
        `<option value="${escapeHtml(serie.code)}">${escapeHtml(serie.name)}</option>`
    )
    .join('');
}

async function syncGroupSelector() {
  const serie = serieSelect.value;
  const isGrouped = serie === 'd';

  groupField.hidden = !isGrouped;
  groupMode.textContent = isGrouped ? 'Por grupo' : 'Tabela única';

  if (!isGrouped) {
    groupSelect.innerHTML = '';
    return;
  }

  setLoading('Carregando grupos da Série D...');
  const response = await fetchJson(`/api/groups?serie=${encodeURIComponent(serie)}`);
  const groups = response.items || [];

  groupSelect.innerHTML = groups
    .map(
      (group) =>
        `<option value="${escapeHtml(String(group.id))}">${escapeHtml(group.name)}</option>`
    )
    .join('');
}

async function loadStandings() {
  const serie = serieSelect.value;
  const isGrouped = serie === 'd';
  const group = isGrouped ? groupSelect.value : '';

  const params = new URLSearchParams({ serie });

  if (group) {
    params.set('group', group);
  }

  setLoading('Carregando classificação...');

  const standings = await fetchJson(`/api/standings?${params.toString()}`);
  const table = standings.tables?.[0];
  const competition = standings.competition;

  competitionName.textContent = competition?.name || '-';
  roundLabel.textContent = table?.round?.label || '-';
  tableTitle.textContent = table?.name || competition?.name || 'Tabela';
  tableSubtitle.textContent = isGrouped
    ? `Série ${serie.toUpperCase()} • ${table?.entries?.length || 0} times no grupo`
    : `Série ${serie.toUpperCase()} • ${table?.entries?.length || 0} times`;

  renderLegends(standings.legends || []);
  renderTable(table?.entries || []);
}

function renderLegends(legends) {
  const items = legends.filter((legend) => legend?.name);

  legendList.innerHTML = items
    .map(
      (legend) => `
        <span class="legend-pill">
          <span class="legend-dot" style="background:${escapeHtml(legend.color || '#d9d9d9')}"></span>
          ${escapeHtml(legend.name)}
        </span>
      `
    )
    .join('');
}

function renderTable(entries) {
  standingsBody.innerHTML = entries
    .map((entry) => {
      const form = (entry.recentForm || [])
        .map((result) => `<span class="form-badge form-${result.toLowerCase()}">${escapeHtml(result)}</span>`)
        .join('');
      const legendColor = entry.legend?.color || 'transparent';

      return `
        <tr>
          <td>
            <div class="position-cell">
              <span class="position-bar" style="background:${escapeHtml(legendColor)}"></span>
              <strong>${escapeHtml(String(entry.position ?? '-'))}</strong>
            </div>
          </td>
          <td>
            <div class="team-cell">
              <img class="team-badge" src="${escapeHtml(entry.team?.badge || '')}" alt="${escapeHtml(entry.team?.name || 'Time')}" loading="lazy" />
              <div>
                <strong>${escapeHtml(entry.team?.name || '-')}</strong>
                <span>${escapeHtml(entry.team?.shortName || '')}</span>
              </div>
            </div>
          </td>
          <td><strong>${escapeHtml(String(entry.points ?? '-'))}</strong></td>
          <td>${escapeHtml(String(entry.matches ?? '-'))}</td>
          <td>${escapeHtml(String(entry.wins ?? '-'))}</td>
          <td>${escapeHtml(String(entry.draws ?? '-'))}</td>
          <td>${escapeHtml(String(entry.losses ?? '-'))}</td>
          <td>${escapeHtml(String(entry.goalsFor ?? '-'))}</td>
          <td>${escapeHtml(String(entry.goalsAgainst ?? '-'))}</td>
          <td>${escapeHtml(String(entry.goalDifference ?? '-'))}</td>
          <td>${escapeHtml(String(entry.efficiency ?? '-'))}</td>
          <td><div class="form-list">${form || '<span class="form-empty">-</span>'}</div></td>
        </tr>
      `;
    })
    .join('');

  statusMessage.hidden = entries.length > 0;
  standingsTable.hidden = entries.length === 0;

  if (entries.length === 0) {
    statusMessage.textContent = 'Nenhum dado encontrado para esta seleção.';
  }
}

function setLoading(message) {
  statusMessage.hidden = false;
  standingsTable.hidden = true;
  statusMessage.textContent = message;
}

function renderError(message) {
  statusMessage.hidden = false;
  standingsTable.hidden = true;
  statusMessage.textContent = message;
  statusMessage.classList.add('status-error');
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Não foi possível carregar os dados.');
  }

  return data;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
