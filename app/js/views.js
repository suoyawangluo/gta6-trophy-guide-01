// Rendering for the trophy guide: checklist rows, the guide detail pane, the
// roadmap and the missables list, plus the progress header. No network calls:
// everything renders from the data already loaded and the saved progress.
import { saveEarned } from './store.js';

/** A story trophy is hidden while spoilers are on and it is not earned yet. */
export function isHidden(trophy, state) {
  return state.spoilersOn && trophy.kinds.includes('story') && !state.earned.has(trophy.id);
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function sourceLink(name, sources) {
  const found = sources.find((s) => s.name === name);
  if (found && found.url) {
    const a = document.createElement('a');
    a.href = found.url;
    a.textContent = name;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }
  return document.createTextNode(name);
}

/** The progress header: x / 55, the bar, and the earned count per grade. */
export function renderProgress(state) {
  const total = state.data.trophies.length;
  document.getElementById('earned-count').textContent = String(state.earned.size);
  document.getElementById('progress-fill').style.width = `${Math.round((state.earned.size / total) * 100)}%`;
  const byGrade = {};
  for (const t of state.data.trophies) if (state.earned.has(t.id)) byGrade[t.grade] = (byGrade[t.grade] ?? 0) + 1;
  const parts = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${byGrade[g] ?? 0} ${g}`)
    .join(' · ');
  document.getElementById('grade-counts').textContent = `Earned: ${parts} — ${total - state.earned.size} to go`;
  document.getElementById('missable-count').textContent = String(state.data.trophies.filter((t) => t.missable).length);
}

/** One checklist row (also used for the missables list). */
function trophyRow(trophy, state, onSelect) {
  const li = el('li', `trophy-item${state.earned.has(trophy.id) ? ' earned' : ''}${state.selectedId === trophy.id ? ' selected' : ''}`);
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.earned.has(trophy.id);
  box.setAttribute('aria-label', `Earned: ${trophy.name}`);
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(trophy.id);
    else state.earned.delete(trophy.id);
    saveEarned(state.earned);
    state.rerender();
  });
  li.append(box);
  li.append(el('span', `medal ${trophy.grade}`));
  const body = el('div');
  const hidden = isHidden(trophy, state);
  body.append(el('div', hidden ? 'trophy-name hidden-name' : 'trophy-name', hidden ? 'Hidden story trophy' : trophy.name));
  body.append(el('div', 'trophy-desc', hidden ? 'Hidden until earned — a story trophy. Tick it off to reveal it.' : trophy.description));
  const tags = el('div', 'trophy-tags');
  if (trophy.missable) tags.append(el('span', 'tag missable', 'Missable'));
  for (const kind of trophy.kinds) {
    if (kind === 'missable') continue;
    tags.append(el('span', 'tag', kind));
  }
  if (trophy.count_note) tags.append(el('span', 'tag', trophy.count_note));
  body.append(tags);
  if (!hidden) {
    const open = el('button', 'trophy-guide-link', 'Read the guide →');
    open.type = 'button';
    open.addEventListener('click', () => onSelect(trophy.id));
    body.append(open);
  }
  li.append(body);
  li.append(el('span', 'trophy-grade', trophy.grade));
  return li;
}

/** The checklist, filtered by kind, grade and search text. */
export function renderChecklist(state, onSelect) {
  const list = document.getElementById('trophy-list');
  const q = state.search.trim().toLowerCase();
  let shown = state.data.trophies.filter((t) => {
    if (state.kind !== 'all' && !t.kinds.includes(state.kind)) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
    return true;
  });
  list.replaceChildren();
  for (const t of shown) list.append(trophyRow(t, state, onSelect));
  document.getElementById('list-empty').hidden = shown.length > 0;
  const earnedShown = shown.filter((t) => state.earned.has(t.id)).length;
  document.getElementById('list-meta').textContent =
    state.kind === 'online' && shown.length === 0
      ? 'No online trophies in the official list — every trophy is earned in single-player.'
      : `Showing ${shown.length} of ${state.data.trophies.length} trophies · ${earnedShown} earned in this view`;
}

/** The guide detail pane for the selected trophy. */
export function renderDetail(state, onToggleEarned) {
  const pane = document.getElementById('detail');
  const trophy = state.data.trophies.find((t) => t.id === state.selectedId);
  pane.replaceChildren();
  if (!trophy) {
    pane.append(el('p', 'detail-empty', 'Pick a trophy in the checklist to read its guide, its sources and whether it can be missed.'));
    return;
  }
  const hidden = isHidden(trophy, state);
  pane.append(el('h2', null, hidden ? 'Hidden story trophy' : trophy.name));
  pane.append(el('p', 'detail-grade', `${trophy.grade} trophy${trophy.missable ? ' · Missable' : ''} · ${trophy.kinds.join(' · ')}`));
  pane.append(el('p', 'detail-label', 'Official description'));
  pane.append(el('p', 'official', hidden ? 'Hidden until earned.' : `“${trophy.description}”`));
  pane.append(el('p', 'detail-label', 'Guide'));
  pane.append(el('p', null, hidden ? 'Earn this trophy to reveal its guide.' : trophy.guide));
  if (!hidden && trophy.count_note) {
    pane.append(el('p', 'detail-label', 'PSN count'));
    pane.append(el('p', null, trophy.count_note + '.'));
  }
  if (!hidden && trophy.missable) {
    pane.append(el('p', 'detail-label', 'Why it is flagged missable'));
    pane.append(el('p', null, 'Its official description ties it to a named story moment — a chapter, a named mission, or a named character’s final mission. Play it when that moment comes.'));
  }
  if (!hidden) {
    pane.append(el('p', 'detail-label', 'Sources'));
    const ul = el('ul');
    for (const name of trophy.sources) {
      const li = el('li');
      li.append(sourceLink(name, state.data.sources));
      ul.append(li);
    }
    pane.append(ul);
  }
  const stateBox = el('p', 'earned-state');
  const earned = state.earned.has(trophy.id);
  stateBox.append(document.createTextNode(earned ? 'Earned — ticked off in your checklist.' : 'Not earned yet. '));
  const toggle = el('button', null, earned ? 'Mark as not earned' : 'Mark as earned');
  toggle.type = 'button';
  toggle.addEventListener('click', () => onToggleEarned(trophy.id));
  stateBox.append(toggle);
  pane.append(stateBox);
}

/** The seven-stage roadmap to the platinum. */
export function renderRoadmap(state, onSelect) {
  const ol = document.getElementById('roadmap');
  ol.replaceChildren();
  const byName = new Map(state.data.trophies.map((t) => [t.name, t]));
  for (const stage of state.data.roadmap) {
    const li = el('li');
    const h = el('h3');
    h.append(el('span', 'stage-num', `Stage ${stage.stage}`));
    h.append(document.createTextNode(stage.title));
    li.append(h);
    li.append(el('p', null, stage.text));
    const chips = el('div', 'stage-trophies');
    for (const name of stage.trophies) {
      const t = byName.get(name);
      if (!t) continue;
      const b = el('button', state.earned.has(t.id) ? 'done' : null, `${state.earned.has(t.id) ? '✓ ' : ''}${t.name} (${t.grade})`);
      b.type = 'button';
      b.addEventListener('click', () => onSelect(t.id));
      chips.append(b);
    }
    li.append(chips);
    ol.append(li);
  }
}

/** The missables list: every trophy flagged missable, with its guide. */
export function renderMissables(state, onSelect) {
  const list = document.getElementById('missable-list');
  list.replaceChildren();
  for (const t of state.data.trophies.filter((x) => x.missable)) list.append(trophyRow(t, state, onSelect));
}
