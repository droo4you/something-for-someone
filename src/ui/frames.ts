// Generates pixel 9-slice frames (pre-scaled 2x for crisp corners) and exposes them as CSS variables.
type Ring = string | [string, string]; // solid, or [top-left colour, bottom-right colour]
function frame(rings: Ring[], radius: number, size = 24, rivet?: string, fill?: string): string {
  const s = 2, c = document.createElement('canvas'); c.width = size * s; c.height = size * s; const g = c.getContext('2d')!;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.min(x, y, size - 1 - x, size - 1 - y);
    // rounded corners
    const cx = Math.min(x, size - 1 - x), cy = Math.min(y, size - 1 - y);
    if (cx + cy < radius) continue;
    const ringIdx = cx + cy === radius && radius > 0 ? 0 : d;
    if (ringIdx >= rings.length) { if (fill) { g.fillStyle = fill; g.fillRect(x * s, y * s, s, s); } continue; }
    const r = rings[ringIdx]; let col: string;
    if (typeof r === 'string') col = r; else { const tl = (y === ringIdx || x === ringIdx) && !(x === size - 1 - ringIdx || y === size - 1 - ringIdx); col = tl ? r[0] : r[1]; }
    g.fillStyle = col; g.fillRect(x * s, y * s, s, s);
  }
  if (rivet) for (const [x, y] of [[3, 3], [size - 4, 3], [3, size - 4], [size - 4, size - 4]]) { g.fillStyle = rivet; g.fillRect(x * s, y * s, s, s); g.fillStyle = '#fff6c0'; g.fillRect(x * s, y * s, s / 2, s / 2); }
  return c.toDataURL();
}
function tile(colors: string[], size = 8, seed = 1): string {
  const c = document.createElement('canvas'); c.width = size * 2; c.height = size * 2; const g = c.getContext('2d')!;
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = colors[0]; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < size * size * 0.18; i++) { g.fillStyle = colors[1 + Math.floor(rnd() * (colors.length - 1))]; g.fillRect(Math.floor(rnd() * size) * 2, Math.floor(rnd() * size) * 2, 2, 2); }
  return c.toDataURL();
}
export function installFrames() {
  const ink = '#1a0f08';
  const vars: Record<string, string> = {
    'f-parch': frame([ink, '#6b4024', ['#b0773e', '#4a2a14'], '#8a5a2e', ink, '#fff4d8'], 2, 24, '#e8b84a', '#f3e3c3'),
    'f-dark': frame([ink, '#5a4030', ['#8a6a48', '#3a2618'], '#6a4a32', ink, '#4a3424'], 2, 24, '#c9a24a', '#2e1f15'),
    'f-btn': frame([ink, ['#fffaee', '#b89868'], ['#fff3d8', '#d6bd8e']], 1,12, undefined, '#f3e3c3'),
    'f-btn-h': frame([ink, ['#ffffff', '#c8a878'], ['#fffaea', '#e2cb9c']], 1,12, undefined, '#fbefd6'),
    'f-btn-p': frame([ink, ['#a88858', '#fff3d8'], ['#c9ae7e', '#f3e3c3']], 1,12, undefined, '#e6d2a8'),
    'f-btn-g': frame([ink, ['#fff0b0', '#a8741a'], ['#ffe07a', '#d09a2a']], 1,12, undefined, '#f2c14e'),
    'f-btn-gh': frame([ink, ['#fff8d0', '#b8842a'], ['#ffeaa0', '#e0aa3a']], 1,12, undefined, '#f8cf62'),
    'f-btn-d': frame([ink, ['#8a6a48', '#2a1a10'], ['#6a4a32', '#3a2618']], 1,12, undefined, '#4a3424'),
    'f-common': frame([ink, '#9a917f', ['#e8e0cc', '#7a7262'], ink, '#fff4d8'], 2, 24, undefined, '#f3e3c3'),
    'f-rare': frame([ink, '#2a6ac0', ['#9ad0ff', '#1a4a90'], ink, '#fff4d8'], 2, 24, '#cfeaff', '#f3e3c3'),
    'f-epic': frame([ink, '#7a3ac0', ['#e0b0ff', '#4a1a80'], ink, '#fff4d8'], 2, 24, '#f0d8ff', '#f3e3c3'),
    'f-sel': frame([ink, '#d09a2a', ['#fff0b0', '#a8741a'], ink, '#fff4d8'], 2, 24, '#ffffff', '#f3e3c3'),
    'f-cdis': frame([ink, '#5a4030', ['#7a5a3a', '#2e1c10'], ink, '#4a3424'], 2, 24, undefined, '#4a3424'),
    't-parch': tile(['#f3e3c3', '#ecd9b2', '#f8ead0', '#e8d3a8'], 8, 7),
    't-dark': tile(['#2e1f15', '#2a1b12', '#33241a', '#26180f'], 8, 9),
    't-wood': tile(['#3b2414', '#341f11', '#43291a', '#2e1b0e'], 8, 3),
  };
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty('--' + k, `url(${v})`);
}
