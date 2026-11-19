// Boot for the Leonida Trophy Guide: loads app/data/trophies.json, wires the
// checklist, filters, spoiler setting, export/import and the three views, and
// reads the page's query string (?view=, ?kind=, ?spoilers=on, ?trophy=<id>,
// ?demo=1 seeds 13 earned trophies for a first look).
import { loadEarned, saveEarned, seedDemo, exportEarned, parseImport } from './store.js';
import { renderProgress, renderChecklist, renderDetail, renderRoadmap, renderMissables } from './views.js';

/** The 13 trophies ?demo=1 marks earned, so a first look shows progress. */
const DEMO_EARNED = [2, 3, 8, 15, 19, 21, 28, 33, 35, 42, 44, 46, 52];

const params = new URLSearchParams(location.search);
const data = await (await fetch('data/trophies.json')).json();
const trophiesById = new Map(data.trophies.map((t) => [t.id, t]));
const trophiesByName = new Map(data.trophies.map((t) => [t.name, t]));

const state = {
  data,
  earned: loadEarned(),
  kind: ['story', 'missable', 'collectibles', 'activities', 'online'].includes(params.get('kind')) ? params.get('kind') : 'all',
  grade: ['platinum', 'gold', 'silver', 'bronze'].includes(params.get('grade')) ? params.get('grade') : 'all',
  search: '',
  spoilersOn: params.get('spoilers') === 'on',
  view: ['roadmap', 'missables'].includes(params.get('view')) ? params.get('view') : 'checklist',
  selectedId: Number(params.get('trophy')) || 17,
  rerender,
};

if (!trophiesById.has(state.selectedId)) state.selectedId = 17;
if (params.get('demo') === '1') seedDemo(state.earned, DEMO_EARNED);

function selectTrophy(id) {
  state.selectedId = id;
  state.view = 'checklist';
  syncViewTabs();
  rerender();
  document.getElementById('detail').scrollIntoView({ block: 'nearest' });
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveEarned(state.earned);
  rerender();
}

function syncViewTabs() {
  for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('active', tab.dataset.view === state.view);
  document.getElementById('view-checklist').hidden = state.view !== 'checklist';
  document.getElementById('view-roadmap').hidden = state.view !== 'roadmap';
  document.getElementById('view-missables').hidden = state.view !== 'missables';
  document.getElementById('controls').style.display = state.view === 'checklist' ? '' : 'none';
}

function rerender() {
  renderProgress(state);
  renderChecklist(state, selectTrophy);
  renderDetail(state, toggleEarned);
  renderRoadmap(state, selectTrophy);
  renderMissables(state, selectTrophy);
  syncViewTabs();
}

// Controls.
document.getElementById('search').addEventListener('input', (e) => {
  state.search = e.target.value;
  renderChecklist(state, selectTrophy);
});
for (const btn of document.querySelectorAll('.kind')) {
  btn.classList.toggle('active', btn.dataset.kind === state.kind);
  btn.addEventListener('click', () => {
    state.kind = btn.dataset.kind;
    for (const b of document.querySelectorAll('.kind')) b.classList.toggle('active', b === btn);
    renderChecklist(state, selectTrophy);
  });
}
const gradeSelect = document.getElementById('grade');
gradeSelect.value = state.grade;
gradeSelect.addEventListener('change', () => {
  state.grade = gradeSelect.value;
  renderChecklist(state, selectTrophy);
});
const spoilerBox = document.getElementById('spoilers');
spoilerBox.checked = state.spoilersOn;
spoilerBox.addEventListener('change', () => {
  state.spoilersOn = spoilerBox.checked;
  rerender();
});
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    state.view = tab.dataset.view;
    rerender();
  });
}
document.getElementById('export').addEventListener('click', () => {
  exportEarned(state.earned, trophiesById);
  document.getElementById('save-note').textContent = `Exported ${state.earned.size} earned trophies to a file.`;
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const note = document.getElementById('save-note');
  if (!file) return;
  try {
    const { earned, unknown } = parseImport(await file.text(), trophiesByName);
    state.earned = earned;
    saveEarned(state.earned);
    rerender();
    note.textContent = unknown.length > 0
      ? `Imported ${earned.size} earned trophies (${unknown.length} unknown names ignored).`
      : `Imported ${earned.size} earned trophies.`;
  } catch (err) {
    note.textContent = `Import failed: ${err.message}`;
  }
  e.target.value = '';
});

rerender();
