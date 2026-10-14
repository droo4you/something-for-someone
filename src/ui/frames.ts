// Generates neon pixel 9-slice frames (pre-scaled 2x for crisp corners) and exposes them as CSS variables.
type Ring = string | [string, string]; // solid, or [top-left colour, bottom-right colour]
function frame(rings: Ring[], radius: number, size = 24, rivet?: string, fill?: string): string {
  const s = 2, c = document.createElement('canvas'); c.width = size * s; c.height = size * s; const g = c.getContext('2d')!;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.min(x, y, size - 1 - x, size - 1 - y);
    const cx = Math.min(x, size - 1 - x), cy = Math.min(y, size - 1 - y);
    if (cx + cy < radius) continue;
    const ringIdx = cx + cy === radius && radius > 0 ? 0 : d;
    if (ringIdx >= rings.length) { if (fill) { g.fillStyle = fill; g.fillRect(x * s, y * s, s, s); } continue; }
    const r = rings[ringIdx]; let col: string;
    if (typeof r === 'string') col = r; else { const tl = (y === ringIdx || x === ringIdx) && !(x === size - 1 - ringIdx || y === size - 1 - ringIdx); col = tl ? r[0] : r[1]; }
    g.fillStyle = col; g.fillRect(x * s, y * s, s, s);
  }
  if (rivet) for (const [x, y] of [[3, 3], [size - 4, 3], [3, size - 4], [size - 4, size - 4]]) { g.fillStyle = rivet; g.fillRect(x * s, y * s, s, s); g.fillStyle = '#ffffff'; g.fillRect(x * s, y * s, s / 2, s / 2); }
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
  const ink = '#06040e';
  // panel = cyan neon tube on navy; dark = magenta neon tube on deep purple
  const vars: Record<string, string> = {
    'f-parch': frame([ink, '#1a6a8a', ['#b8f6ff', '#3ae8ff'], '#1a6a8a', ink, '#2a2a5a'], 2, 24, '#3ae8ff', '#141634'),
    'f-dark': frame([ink, '#7a1a6a', ['#ffb8f0', '#ff3ec8'], '#7a1a6a', ink, '#3a1a4a'], 2, 24, '#ff3ec8', '#140a24'),
    'f-btn': frame([ink, ['#8a8ab8', '#3a3a68'], ['#4a4a7a', '#2a2a50']], 1, 12, undefined, '#2e2e5a'),
    'f-btn-h': frame([ink, ['#b8f6ff', '#3ae8ff'], ['#4a5a8a', '#2a3a60']], 1, 12, undefined, '#34406a'),
    'f-btn-p': frame([ink, ['#2a2a50', '#3ae8ff'], ['#24244a', '#3a3a6a']], 1, 12, undefined, '#24244a'),
    'f-btn-g': frame([ink, ['#ffd0f4', '#b0208a'], ['#ff7ad8', '#d02aa8']], 1, 12, undefined, '#ff3ec8'),
    'f-btn-gh': frame([ink, ['#ffffff', '#c0309a'], ['#ffa8e8', '#e040b8']], 1, 12, undefined, '#ff5ad2'),
    'f-btn-d': frame([ink, ['#2a2440', '#120e20'], ['#1e1a34', '#16122a']], 1, 12, undefined, '#1a1630'),
    'f-common': frame([ink, '#4a4a7a', ['#a8a8d0', '#4a4a7a'], ink, '#2a2a50'], 2, 24, undefined, '#181838'),
    'f-rare': frame([ink, '#1a7aa8', ['#b8f6ff', '#1a7aa8'], ink, '#1a3a5a'], 2, 24, '#3ae8ff', '#121a3a'),
    'f-epic': frame([ink, '#8a2aa8', ['#f0b8ff', '#8a2aa8'], ink, '#3a1a5a'], 2, 24, '#ff3ec8', '#1c1238'),
    'f-sel': frame([ink, '#b8a01a', ['#ffffa0', '#b8ff3a'], ink, '#2a3a2a'], 2, 24, '#ffffff', '#1a2030'),
    'f-cdis': frame([ink, '#2a2440', ['#3a3458', '#16122a'], ink, '#1a1630'], 2, 24, undefined, '#141026'),
    't-parch': tile(['#141634', '#16183a', '#12142e', '#181a3e'], 8, 7),
    't-dark': tile(['#140a24', '#160c28', '#120820', '#1a0e2c'], 8, 9),
    't-wood': tile(['#08061a', '#0a081e', '#0c0a22', '#060414'], 8, 3),
  };
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty('--' + k, `url(${v})`);
}
