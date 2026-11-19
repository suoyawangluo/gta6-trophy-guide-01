// Progress storage for the trophy checklist: localStorage, export to a file, import back.
const KEY = 'gta6-trophy-guide-progress-v1';

/** The earned trophy ids, as a Set, from localStorage (empty when nothing is saved yet). */
export function loadEarned() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v) => Number.isInteger(v)));
  } catch {
    return new Set();
  }
}

/** Save the earned trophy ids to localStorage. */
export function saveEarned(earned) {
  localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

/** Seed a fixed demo set (13 trophies) when the page is opened with ?demo=1. */
export function seedDemo(earned, demoIds) {
  for (const id of demoIds) earned.add(id);
  saveEarned(earned);
}

/** Download the earned list as a JSON file the import can read back. */
export function exportEarned(earned, trophiesById) {
  const names = [...earned].sort((a, b) => a - b).map((id) => trophiesById.get(id).name);
  const payload = { game: 'Grand Theft Auto VI', guide: 'Leonida Trophy Guide', earned: names };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * Read an import file's text into earned ids. Accepts the export's own shape
 * ({earned: [names]}) or a plain array of trophy names. Unknown names are ignored
 * and reported, so a file from another guide cannot corrupt the checklist.
 */
export function parseImport(text, trophiesByName) {
  const parsed = JSON.parse(text);
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('not a progress file: expected a list of trophy names');
  const earned = new Set();
  const unknown = [];
  for (const name of names) {
    const t = trophiesByName.get(String(name));
    if (t) earned.add(t.id);
    else unknown.push(String(name));
  }
  return { earned, unknown };
}
