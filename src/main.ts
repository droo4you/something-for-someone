import '@fontsource/press-start-2p/400.css';
import './style.css';
import { HEROES } from './data/heroes';
import { SKILL } from './data/skills';
import { RELIC } from './data/relics';
import { POTION } from './data/potions';
import { ENEMY } from './data/enemies';
import { REGIONS, FURTHER_MODIFIERS } from './data/regions';
import { LORE } from './data/lore';
import { Battle, elMult, type Unit, type Action } from './engine/battle';
import * as R from './engine/run';
import { loadMeta, saveMeta, UPGRADES, type Meta } from './engine/meta';
import { newSeed, RNG } from './engine/rng';
import { heroFrames, enemyFrames, staticSprite } from './ui/spritecache';
import { animSprite } from './ui/anim';
import { Scene, THEMES } from './ui/scene';
import { installFrames } from './ui/frames';
import { statusIcon, intentIcon, miscIcon, medallion } from './ui/icons';
import { tone, mix } from './ui/pix';
import { sfx, setMuted } from './ui/audio';
import type { EventDef, OwnedSkill, Element as El } from './types';

installFrames();
const app = document.getElementById('app')!;
let meta: Meta = loadMeta();
setMuted(meta.muted);
let run: R.Run | null = null;
let battle: Battle | null = null;
let battleType: R.NodeType = 'battle';
let animating = false;
let target = 1;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let scene: Scene | null = null;

// ---------- helpers ----------
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const EL_COL: Record<string, string> = { fire: '#ff7a3d', water: '#4fa3ff', wind: '#7ed957', earth: '#c9a24a', none: '#e8e0d0' };
const elName = (e: string) => `<span class="el-${e}">${e === 'none' ? 'Neutral' : e[0].toUpperCase() + e.slice(1)}</span>`;
const rar = (r: string) => `<span class="rtag r-${r}">${r.toUpperCase()}</span>`;
function bindIn(root: ParentNode, acts: Record<string, (el: HTMLElement) => void>) {
  root.querySelectorAll<HTMLElement>('[data-a]').forEach(el => {
    const f = acts[el.dataset.a!]; if (f) el.addEventListener('click', ev => { ev.stopPropagation(); if ((el as HTMLButtonElement).disabled) return; sfx.click(); f(el); });
  });
}
function stopScene() { scene?.stop(); scene = null; }
function mount(html: string, acts: Record<string, (el: HTMLElement) => void> = {}, keys?: (e: KeyboardEvent) => void) {
  stopScene();
  app.innerHTML = html; bindIn(app, acts);
  keyHandler = keys ?? null;
  window.scrollTo(0, 0);
}
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
  if (e.key === 'm' || e.key === 'M') { toggleMute(); return; }
  keyHandler?.(e);
});
let resizeT = 0;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = window.setTimeout(() => scene?.resize(), 150); });
function toggleMute() { meta.muted = !meta.muted; setMuted(meta.muted); saveMeta(meta); document.querySelectorAll('[data-a="mute"]').forEach(b => (b.textContent = meta.muted ? 'SOUND OFF' : 'SOUND ON')); }
function put(sel: string, el: HTMLElement) { app.querySelector(sel)?.replaceChildren(el); }
function relicChips(ids: string[]) { return ids.map(id => { const r = RELIC[id]; return `<span class="relic-chip r-${r.rarity}" title="${esc(r.name + ': ' + r.desc)}">${esc(r.name)}</span>`; }).join(''); }
function skillLine(s: OwnedSkill) { const d = SKILL[s.id]; return `${esc(d.name)}${s.up ? '+' : ''}`; }
function skillCard(id: string, up = false, extra = '') {
  const d = SKILL[id];
  return `<div class="row"><b>${esc(d.name)}${up ? '+' : ''}</b><span class="grow"></span>${rar(d.rarity)}</div>
    <div class="small">Cost ${d.cost} &middot; ${d.el ? elName(d.el) : 'Hero element'}</div><div class="small">${esc(d.desc)}${up ? ' <i>(Upgraded: +30% power, +1 status)</i>' : ''}</div>${extra}`;
}
const STATUS_DESC: Record<string, string> = { burn: 'Burn: takes N damage at turn start, then N-1.', soak: 'Soak: -30% SPD.', bleed: 'Bleed: takes N damage at turn start; stacks decay 40%.', stun: 'Stun: skips its turn.', shield: 'Shield: absorbs damage; halves each turn.', strength: 'Strength: +30% damage (turns).', weak: 'Weak: -25% damage (turns).', thorns: 'Thorns: attackers take 2xN damage.' };
const STATUS_ABBR: Record<string, string> = { burn: 'BRN', soak: 'SOK', bleed: 'BLD', stun: 'STN', shield: 'SHD', strength: 'STR', weak: 'WEAK', thorns: 'THN' };
const STATUS_COL: Record<string, string> = { burn: '#ff8a3d', soak: '#6fb6ff', bleed: '#ff5a6a', stun: '#ffe066', shield: '#a8d8ff', strength: '#ffb070', weak: '#b8a8d8', thorns: '#8fe08a' };
const POT_COL: Record<string, string | undefined> = { red: undefined, blue: '#4fa3ff', fire: '#ff7a3d', iron: '#c0c8d0' };
const themeFor = (depth: number) => THEMES[R.region(depth).id] ?? THEMES.meadow;
function heroStatic(id: string, scale: number, evo = 0) { return staticSprite(heroFrames(id, evo), scale); }

function topbar(extra = '') {
  if (!run) return '';
  const hs = R.heroStats(run); const pct = run.hp / run.maxHp;
  return `<div class="topbar">
    <div class="stat">${miscIcon('heart', 16)}<div class="mini-bar"><i style="width:${pct * 100}%"></i></div>${run.hp}/${run.maxHp}</div>
    <div class="stat">${miscIcon('coin', 16)} ${run.gold}</div>
    <div class="stat">${run.potions.map(p => `<span title="${esc(POTION[p].name + ': ' + POTION[p].desc)}">${miscIcon('potion', 16, POT_COL[p])}</span>`).join('') || '<span class="tiny muted">no potions</span>'}</div>
    <div class="grow"></div>
    <div class="tiny muted hide-sm">${esc(hs.title)}</div>
    <div class="dist">DISTANCE <b>${R.distance(run)}</b></div>
    ${extra}
    <button class="sm" data-a="mute">${meta.muted ? 'SOUND OFF' : 'SOUND ON'}</button>
  </div>`;
}
const baseActs = { mute: () => toggleMute() };

// ---------- Title ----------
function titleScreen() {
  const heroId = HEROES[Math.floor(Math.random() * 3)].id;
  mount(`<div class="title-wrap"><canvas class="scene px"></canvas>
    <div class="title-ui">
      <div class="logo"><div class="logo-sm">~ an endless journey ~</div><h1>SOMETHING<br><span>FOR</span> SOMEONE</h1></div>
      <div class="panel dark title-menu">
        <div class="sub small">A hero walks an endless road toward Something. He does not know what it is. Only that it is out there.</div>
        <div class="menu">
          <button class="primary" data-a="start">BEGIN JOURNEY</button>
          <button data-a="meta">${miscIcon('ember', 14)} EMBERS OF HOPE (${meta.embers})</button>
          <button data-a="journal">JOURNAL</button>
          <button data-a="mute">${meta.muted ? 'SOUND OFF' : 'SOUND ON'}</button>
        </div>
        <div class="tiny center muted">Journeys ${meta.journeys} &middot; Lore ${meta.lore.length}/${LORE.length}</div>
      </div>
    </div></div>`,
    { start: heroSelect, meta: metaScreen, journal: () => journalScreen(), ...baseActs },
    e => { if (e.key === 'Enter') heroSelect(); });
  const cv = app.querySelector<HTMLCanvasElement>('canvas.scene')!;
  scene = new Scene(cv, THEMES.title, 0.22, true); scene.scroll = 1;
  const fr = heroFrames(heroId, 0); scene.walker = { frames: fr.walk, x: Math.round(scene.w * 0.18), y: scene.groundY + 4 };
  scene.start();
}

// ---------- Hero select ----------
function heroSelect() {
  let sel = 'ember';
  const render = () => {
    mount(`<div class="panel dark"><h2>CHOOSE YOUR WANDERER</h2><div class="small muted">Only one hero walks this road. Pick who.</div></div>
      <div class="cards">${HEROES.map(h => {
        const locked = h.locked && !meta.unlocked.includes(h.id);
        return `<div class="card hero-card ${locked ? 'locked' : ''} ${sel === h.id ? 'sel' : ''}" data-a="${locked ? 'x' : 'h_' + h.id}">
        <div class="row"><b>${esc(h.name)}</b><span class="grow"></span>${elName(h.el)}</div>
        <div class="spr-stage" style="--el:${EL_COL[h.el]}"><div class="spr" id="hs_${h.id}"></div></div>
        <div class="stats"><span>HP ${h.hp + meta.perks.hp * 6}</span><span>ATK ${h.atk}</span><span>DEF ${h.def}</span><span>SPD ${h.spd}</span><span>ENERGY ${h.energy + (meta.perks.insight ? 1 : 0)}</span><span>CRIT ${Math.round(h.crit * 100)}%</span></div>
        <div class="small"><b>${esc(h.passiveDesc)}</b></div>
        <div class="tiny">${h.skills.map(s => esc(SKILL[s].name)).join(' / ')}</div>
        ${locked ? '<div class="small"><b>LOCKED</b> - unlock with 60 Embers of Hope</div>' : `<div class="tiny muted">Best distance: ${meta.best[h.id] ?? 0}</div>`}
      </div>`; }).join('')}</div>
      <div class="panel row"><span class="small">Seed</span><input id="seed" maxlength="10" placeholder="random"><span class="grow"></span>
        <button data-a="back">BACK</button><button class="primary" data-a="go">SET OUT</button></div>`,
      { ...Object.fromEntries(HEROES.map(h => ['h_' + h.id, () => { sel = h.id; render(); }])), back: titleScreen,
        go: () => { const s = (app.querySelector<HTMLInputElement>('#seed')!.value.trim().toUpperCase()) || newSeed(); startRun(sel, s); } },
      e => { if (e.key === 'Enter') startRun(sel, newSeed()); if (e.key === 'Escape') titleScreen(); });
    HEROES.forEach(h => { const a = animSprite(heroFrames(h.id, sel === h.id ? 0 : 0), 2, { walk: sel === h.id }); put('#hs_' + h.id, a.el); });
  };
  render();
}
function startRun(heroId: string, seed: string) { run = R.newRun(heroId, seed, meta); regionIntro(); }
function sceneBanner(depth: number, walk = true) {
  const cv = app.querySelector<HTMLCanvasElement>('canvas.scene'); if (!cv || !run) return;
  scene = new Scene(cv, themeFor(depth), 0.28, walk, 80); scene.scroll = walk ? 0.8 : 1;
  const fr = heroFrames(run.heroId, run.evo); scene.walker = { frames: walk ? fr.walk : fr.idle, x: Math.round(scene.w * 0.42), y: scene.groundY + 6 };
  scene.start();
}
function regionIntro() {
  const r = run!; const reg = R.region(r.depth);
  const mods = r.mods.map(id => FURTHER_MODIFIERS.find(m => m.id === id)!);
  let loreHtml = '';
  if (r.depth >= REGIONS.length && r.depth % REGIONS.length === 0) { const l = R.unseenLore(r, meta, R.nodeRng(r, 'further'), 'further'); saveMeta(meta); loreHtml = `<div class="lore"><span class="src">${esc(l.src)}</span>${esc(l.text)}</div>`; }
  mount(`${topbar()}<div class="vista"><canvas class="scene px"></canvas><div class="vista-title"><div class="small">REGION ${r.depth + 1}</div><h2 style="color:${reg.accent}">${esc(R.regionName(r.depth))}</h2></div></div>
    <div class="panel dark center">
    ${mods.length ? `<p class="small">The Further Lands are harsher: ${mods.map(m => `<b>${esc(m.name)}</b> (${esc(m.desc)})`).join(', ')}</p>` : '<p class="small">The road continues. Something is still out there.</p>'}
    ${loreHtml}<button class="primary" data-a="go">WALK ON</button></div>`, { go: mapScreen, ...baseActs }, e => { if (e.key === 'Enter' || e.key === ' ') mapScreen(); });
  sceneBanner(r.depth, true);
}

// ---------- Map ----------
const NODE_LABEL: Record<R.NodeType, string> = { battle: 'Battle', elite: 'Elite', campfire: 'Campfire', merchant: 'Merchant', event: 'Wanderer', treasure: 'Treasure', shrine: 'Shrine', boss: 'Guardian' };
let MAP_W = 820; const MAP_H = 340, MS = 2; // css size and pixel scale
function drawMap(cv: HTMLCanvasElement, r: R.Run) {
  const w = MAP_W / MS, h = MAP_H / MS; cv.width = w; cv.height = h; cv.style.width = MAP_W + 'px'; cv.style.height = MAP_H + 'px';
  const g = cv.getContext('2d')!; const th = themeFor(r.depth); const rng = new RNG(r.seed + r.depth);
  const G = th.ground, G2 = th.ground2;
  g.fillStyle = G; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 14; i++) { g.fillStyle = rng.chance(0.5) ? tone(G, 0.18) : G2; g.fillRect(rng.int(0, w), rng.int(0, h), 1, 1); }
  for (let i = 0; i < 40; i++) { const x = rng.int(0, w), y = rng.int(0, h); g.fillStyle = tone(G, 0.25); g.fillRect(x, y, 1, 2); g.fillRect(x + 2, y + 1, 1, 1); }
  const xOf = (c: number) => 20 + (c * (w - 40)) / (R.STOPS - 1); const yOf = (y: number) => 14 + y * (h - 28);
  // paths
  const stamp = (x0: number, y0: number, x1: number, y1: number, lit: boolean) => {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      g.fillStyle = tone(lit ? '#d8b070' : '#a08060', -0.45); g.fillRect(x - 2, y - 1, 5, 4);
      g.fillStyle = lit ? '#e8c880' : '#b0906a'; g.fillRect(x - 2, y - 1, 4, 3); g.fillStyle = lit ? '#fff0b8' : '#c8a880'; if (i % 3 === 0) g.fillRect(x - 1, y - 1, 1, 1); }
  };
  r.map.forEach((col, c) => col.forEach(n => n.next.forEach(j => { const m = r.map[c + 1][j]; const lit = !!r.pos && r.pos.col === c && r.pos.row === n.row; stamp(xOf(c), yOf(n.y), xOf(c + 1), yOf(m.y), lit); })));
  // decorations, avoiding nodes and paths roughly
  const nearNode = (x: number, y: number) => r.map.flat().some(n => Math.hypot(xOf(n.col) - x, yOf(n.y) - y) < 16);
  const dark = tone(th.mid, -0.25), lite = tone(th.mid, 0.3);
  for (let i = 0; i < 70; i++) {
    const x = rng.int(4, w - 4), y = rng.int(6, h - 4); if (nearNode(x, y)) continue;
    const d = g.getImageData(x, y, 1, 1).data; if (d[0] > 150 && d[1] > 120 && d[2] < 140 && th.id !== 'frost') continue; // skip path pixels
    const k = rng.next();
    if (k < 0.55) { // tree
      if (th.deco === 'pines' || th.deco === 'peaks') { for (let yy = 0; yy < 9; yy++) { const ww = Math.floor(yy / 2) + 1; g.fillStyle = yy % 3 === 2 ? dark : th.mid; g.fillRect(x - ww, y - 10 + yy, ww * 2, 1); g.fillStyle = lite; g.fillRect(x - ww, y - 10 + yy, 1, 1); } g.fillStyle = '#4a3020'; g.fillRect(x - 1, y - 1, 2, 2); if (th.id === 'frost') { g.fillStyle = '#fff'; g.fillRect(x - 1, y - 10, 2, 1); } }
      else if (th.deco === 'volcano' || th.deco === 'marsh') { g.fillStyle = dark; g.fillRect(x, y - 8, 1, 8); g.fillRect(x - 2, y - 6, 2, 1); g.fillRect(x + 1, y - 4, 2, 1); }
      else { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 3, y, 7, 1); g.fillStyle = '#5a3a22'; g.fillRect(x, y - 2, 1, 2); g.fillStyle = th.mid; g.fillRect(x - 3, y - 7, 7, 5); g.fillRect(x - 2, y - 8, 5, 7); g.fillStyle = lite; g.fillRect(x - 2, y - 7, 2, 1); g.fillStyle = dark; g.fillRect(x - 3, y - 3, 7, 1); }
    } else if (k < 0.8) { g.fillStyle = tone('#8a8a8a', th.id === 'ashen' ? -0.3 : 0); g.fillRect(x - 1, y - 1, 3, 2); g.fillStyle = '#c8c8c8'; g.fillRect(x - 1, y - 1, 1, 1); g.fillStyle = '#4a4a4a'; g.fillRect(x - 1, y + 1, 3, 1); }
    else if (th.deco === 'citadel' || th.deco === 'ruins') { g.fillStyle = dark; g.fillRect(x - 2, y - 6, 3, 6); g.fillRect(x + 2, y - 3, 2, 3); g.fillStyle = lite; g.fillRect(x - 2, y - 6, 1, 1); }
    else { g.fillStyle = th.accent; g.fillRect(x, y, 1, 1); g.fillStyle = '#ffffff'; g.fillRect(x + 2, y + 1, 1, 1); }
  }
  // frame vignette
  g.fillStyle = 'rgba(20,10,5,.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(w - 2, 0, 2, h);
  return { xOf: (c: number) => xOf(c) * MS, yOf: (y: number) => yOf(y) * MS };
}
function mapScreen() {
  const r = run!; const reg = R.region(r.depth);
  const avail = R.reachable(r);
  const acts: Record<string, () => void> = { ...baseActs, journal: () => journalScreen(mapScreen), build: buildModal };
  avail.forEach(n => (acts[`n_${n.col}_${n.row}`] = () => enterNode(n)));
  mount(`${topbar('<button class="sm" data-a="build">BUILD</button><button class="sm" data-a="journal">JOURNAL</button>')}
    <div class="panel dark row map-head"><div class="grow"><h2 style="color:${reg.accent};margin:0">${esc(R.regionName(r.depth))}</h2>
      <div class="tiny muted">Stop ${r.stop}/${R.STOPS} &middot; Seed ${esc(r.seed)} &middot; pick a glowing stop</div></div><div id="map_h"></div></div>
    <div class="mapwrap"><div class="map"><canvas class="px" id="mapcv"></canvas><div id="nodes"></div></div></div>
    <div class="legend">${(Object.keys(NODE_LABEL) as R.NodeType[]).map(t => `<span class="row"><img class="px" src="${medallion(t, 'avail')}" width="20" height="20" alt=""> ${NODE_LABEL[t]}</span>`).join('')}</div>
    <div class="panel"><div class="small"><b>Skills:</b> ${r.skills.map(skillLine).join(' / ')}</div><div style="margin-top:6px">${relicChips(r.relics) || '<span class="tiny muted">No relics yet</span>'}</div></div>`,
    acts, e => { const k = parseInt(e.key); if (k >= 1 && k <= avail.length) enterNode(avail[k - 1]); });
  const wrapEl = app.querySelector<HTMLElement>('.mapwrap')!; MAP_W = Math.max(820, wrapEl.clientWidth - (wrapEl.clientWidth % 2)); app.querySelector<HTMLElement>('.map')!.style.width = MAP_W + 'px';
  const pos = drawMap(app.querySelector<HTMLCanvasElement>('#mapcv')!, r);
  const nodesEl = app.querySelector('#nodes')!;
  nodesEl.innerHTML = r.map.flat().map(n => {
    const isAvail = avail.includes(n); const cur = r.pos && r.pos.col === n.col && r.pos.row === n.row; const done = r.pos ? n.col < r.pos.col || (n.col === r.pos.col && !cur) : false;
    const st = cur ? 'cur' : isAvail ? 'avail' : done ? 'done' : 'locked'; const sz = n.type === 'boss' ? 64 : 48;
    return `<button class="node ${st} ${n.type}" style="left:${pos.xOf(n.col)}px;top:${pos.yOf(n.y)}px" ${isAvail ? `data-a="n_${n.col}_${n.row}"` : 'disabled'} title="${NODE_LABEL[n.type]}"><img class="px" src="${medallion(n.type, st as any)}" width="${sz}" height="${sz}" alt="${NODE_LABEL[n.type]}"></button>`;
  }).join('') + (r.pos ? `<div class="map-hero" style="left:${pos.xOf(r.pos.col)}px;top:${pos.yOf(r.map[r.pos.col][r.pos.row].y)}px"></div>` : `<div class="map-hero" style="left:${pos.xOf(0) - 34}px;top:${pos.yOf(0.5)}px"></div>`);
  bindIn(nodesEl, acts);
  const mh = app.querySelector('.map-hero'); if (mh) mh.appendChild(animSprite(heroFrames(r.heroId, r.evo), 1).el);
  put('#map_h', animSprite(heroFrames(r.heroId, r.evo), 2).el);
  const mw = app.querySelector<HTMLElement>('.mapwrap'); if (mw && r.pos) mw.scrollLeft = Math.max(0, pos.xOf(r.pos.col) - 120);
}
function buildModal() {
  const r = run!; const hs = R.heroStats(r);
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel"><h2>${esc(hs.title)}</h2><div class="stats"><span>HP ${r.hp}/${r.maxHp}</span><span>ATK ${hs.atk}</span><span>DEF ${hs.def}</span><span>SPD ${hs.spd}</span><span>ENERGY ${hs.energy}</span><span>CRIT ${Math.round(hs.crit * 100)}%</span></div>
    <p class="small">${esc(R.heroDef(r).evo[r.evo].passiveDesc)}</p>${r.skills.map(s => `<div class="card r-${SKILL[s.id].rarity}" style="cursor:default">${skillCard(s.id, s.up)}</div>`).join('')}
    <h3>Relics</h3>${r.relics.map(id => `<div class="small">${rar(RELIC[id].rarity)} <b>${esc(RELIC[id].name)}</b>: ${esc(RELIC[id].desc)}</div>`).join('') || '<div class="small muted">None</div>'}
    <h3>Potions</h3>${r.potions.map(p => `<div class="small"><b>${esc(POTION[p].name)}</b>: ${esc(POTION[p].desc)}</div>`).join('') || '<div class="small muted">None</div>'}
    <div class="center"><button class="primary">CLOSE</button></div></div>`;
  m.addEventListener('click', e => { if (e.target === m || (e.target as HTMLElement).tagName === 'BUTTON') m.remove(); });
  document.body.appendChild(m);
}
function enterNode(n: R.MapNode) {
  const r = run!; r.pos = { col: n.col, row: n.row }; r.stop = n.col; sfx.step();
  switch (n.type) {
    case 'battle': case 'elite': case 'boss': startBattle(n.type); break;
    case 'campfire': campfire(); break;
    case 'merchant': merchant(R.genShop(r)); break;
    case 'event': eventScreen(R.pickEvent(r)); break;
    case 'treasure': simpleResult('Treasure', 'A forgotten chest by the roadside. Someone left it here. For someone.', R.treasure(r), 'treasure'); break;
    case 'shrine': shrineScreen(); break;
  }
}
function stopDone() { const r = run!; r.stop = (r.pos?.col ?? 0) + 1; saveMeta(meta); mapScreen(); }
const med = (t: string, px = 48) => `<img class="px med" src="${medallion(t, 'avail')}" width="${px}" height="${px}" alt="">`;
function vista(): string { return `<div class="vista sm"><canvas class="scene px"></canvas></div>`; }
function simpleResult(title: string, text: string, lines: string[], ic: string, next: () => void = stopDone) {
  mount(`${topbar()}${vista()}<div class="panel"><div class="row">${med(ic)}<h2>${esc(title)}</h2></div><p class="small">${esc(text)}</p>
    ${lines.map(l => l.startsWith('Lore:') ? `<div class="lore">${esc(l.slice(6))}</div>` : `<div class="small gain"><b>${esc(l)}</b></div>`).join('')}
    <div style="margin-top:12px"><button class="primary" data-a="go">CONTINUE</button></div></div>`, { go: next, ...baseActs }, e => { if (e.key === 'Enter' || e.key === ' ') next(); });
  sceneBanner(run!.depth, false);
  if (lines.length) sfx.coin();
}

// ---------- Campfire ----------
function campfire() {
  const r = run!; const lore = R.unseenLore(r, meta, R.nodeRng(r, 'camp')); saveMeta(meta);
  const heal = Math.round(r.maxHp * 0.3);
  mount(`${topbar()}${vista()}<div class="panel dark"><div class="row">${med('campfire')}<div><h2>Campfire</h2><div class="small muted">The fire pops. You think about the road.</div></div></div>
    <div class="lore"><span class="src">${esc(lore.src)}</span>${esc(lore.text)}</div>
    <div class="row"><button class="primary" data-a="rest">REST (+${heal} HP)</button><button data-a="up" ${r.skills.some(s => !s.up) ? '' : 'disabled'}>SHARPEN A SKILL</button></div></div>`,
    { ...baseActs, rest: () => { R.healPct(r, 0.3); sfx.heal(); stopDone(); }, up: () => upgradePicker(() => stopDone(), campfire) });
  sceneBanner(r.depth, false);
  if (scene) { const s = scene; const fx = Math.round(s.w * 0.55), fy = s.groundY + 4; const iv = window.setInterval(() => { if (!s.cv.isConnected) return clearInterval(iv); s.burst('fire', fx, fy, 3); }, 120); }
}
function upgradePicker(done: () => void, cancel: () => void, price = 0) {
  const r = run!;
  mount(`${topbar()}<div class="panel"><h2>Upgrade which skill?</h2><div class="small muted">Upgraded skills gain +30% power and +1 to applied statuses.</div></div>
    <div class="cards">${r.skills.map((s, i) => `<div class="card r-${SKILL[s.id].rarity} ${s.up ? 'locked' : ''}" data-a="${s.up ? 'x' : 'u' + i}">${skillCard(s.id, s.up)}</div>`).join('')}</div>
    <div class="panel"><button data-a="cancel">BACK</button></div>`,
    { ...baseActs, cancel, ...Object.fromEntries(r.skills.map((_, i) => ['u' + i, () => { r.gold -= price; r.skills[i].up = true; sfx.evolve(); done(); }])) });
}

// ---------- Merchant ----------
function merchant(items: R.ShopItem[]) {
  const r = run!;
  const desc = (it: R.ShopItem) => it.kind === 'skill' ? `<div class="tiny kind">SKILL</div>${skillCard(it.id)}` : it.kind === 'relic' ? `<div class="tiny kind">RELIC</div><div class="row"><b>${esc(RELIC[it.id].name)}</b><span class="grow"></span>${rar(RELIC[it.id].rarity)}</div><div class="small">${esc(RELIC[it.id].desc)}</div>` : it.kind === 'potion' ? `<div class="tiny kind">POTION</div><div class="row">${miscIcon('potion', 24, POT_COL[it.id])}<b>${esc(POTION[it.id].name)}</b></div><div class="small">${esc(POTION[it.id].desc)}</div>` : `<div class="tiny kind">SERVICE</div><b>Smithing</b><div class="small">Upgrade one of your skills.</div>`;
  const cls = (it: R.ShopItem) => it.kind === 'skill' ? 'r-' + SKILL[it.id].rarity : it.kind === 'relic' ? 'r-' + RELIC[it.id].rarity : 'r-common';
  const can = (it: R.ShopItem) => !it.sold && r.gold >= it.price && !(it.kind === 'potion' && r.potions.length >= R.MAX_POTIONS) && !(it.kind === 'upgrade' && !r.skills.some(s => !s.up));
  const acts: Record<string, () => void> = { ...baseActs, leave: stopDone };
  items.forEach((it, i) => (acts['b' + i] = () => {
    if (!can(it)) return;
    if (it.kind === 'upgrade') return upgradePicker(() => { it.sold = true; merchant(items); }, () => merchant(items), it.price);
    if (it.kind === 'skill') return learnFlow(it.id, () => { r.gold -= it.price; it.sold = true; sfx.coin(); merchant(items); }, () => merchant(items));
    r.gold -= it.price; it.sold = true; sfx.coin();
    if (it.kind === 'relic') R.gainRelic(r, it.id); else r.potions.push(it.id);
    merchant(items);
  }));
  mount(`${topbar()}<div class="panel dark"><div class="row">${med('merchant')}<div><h2>Roadside Merchant</h2><div class="small muted">"Everything here once belonged to someone looking for something."</div></div></div></div>
    <div class="cards">${items.map((it, i) => `<div class="card ${cls(it)} ${it.sold ? 'locked' : ''}" style="cursor:default">${desc(it)}<div class="grow"></div><button class="${can(it) ? 'primary' : ''}" data-a="b${i}" ${can(it) ? '' : 'disabled'}>${it.sold ? 'SOLD' : `BUY ${it.price}`} ${it.sold ? '' : miscIcon('coin', 12)}</button></div>`).join('')}</div>
    <div class="panel"><button data-a="leave">LEAVE</button></div>`, acts, e => { if (e.key === 'Escape') stopDone(); });
}
function learnFlow(id: string, onDone: () => void, onCancel: () => void) {
  const r = run!;
  if (R.learnSkill(r, id)) return onDone();
  mount(`${topbar()}<div class="panel"><h2>Too many skills</h2><div class="small">You can carry 4. Replace one with:</div><div class="card r-${SKILL[id].rarity}" style="cursor:default">${skillCard(id)}</div></div>
    <div class="cards">${r.skills.map((s, i) => `<div class="card r-${SKILL[s.id].rarity}" data-a="r${i}"><div class="tiny kind">REPLACE</div>${skillCard(s.id, s.up)}</div>`).join('')}</div>
    <div class="panel"><button data-a="cancel">KEEP CURRENT SKILLS</button></div>`,
    { ...baseActs, cancel: onCancel, ...Object.fromEntries(r.skills.map((_, i) => ['r' + i, () => { R.learnSkill(r, id, i); onDone(); }])) });
}

// ---------- Events & shrine ----------
function eventScreen(ev: EventDef) {
  const r = run!;
  const acts: Record<string, () => void> = { ...baseActs };
  ev.choices.forEach((c, i) => (acts['c' + i] = () => {
    if ((c.fx.gold ?? 0) < 0 && r.gold < -(c.fx.gold!)) return;
    const out = R.resolveEvent(r, meta, c); saveMeta(meta);
    if (r.hp <= 0) { r.hp = 1; }
    const after = () => out.fight ? startBattle('battle') : stopDone();
    const show = () => simpleResult(ev.title, out.text, out.extra, 'event', after);
    if (out.pendingSkill) { const sid = out.pendingSkill; return learnFlow(sid, () => { out.extra.push(`Learned ${SKILL[sid].name}`); show(); }, show); }
    show();
  }));
  mount(`${topbar()}${vista()}<div class="panel"><div class="row">${med('event')}<h2>${esc(ev.title)}</h2></div><p class="small" style="line-height:2">${esc(ev.text)}</p>
    <div class="col">${ev.choices.map((c, i) => `<button data-a="c${i}" ${(c.fx.gold ?? 0) < 0 && r.gold < -(c.fx.gold!) ? 'disabled' : ''} style="text-align:left">${i + 1}. ${esc(c.label)}${c.chance ? ` <span class="tiny muted">(${Math.round(c.chance * 100)}%)</span>` : ''}</button>`).join('')}</div></div>`,
    acts, e => { const k = parseInt(e.key); if (k >= 1 && k <= ev.choices.length) acts['c' + (k - 1)](); });
  sceneBanner(r.depth, false);
}
function shrineScreen() {
  const r = run!;
  const acts: Record<string, () => void> = { ...baseActs };
  R.SHRINE_OPTIONS.forEach(o => (acts[o.id] = () => { const txt = R.shrine(r, o.id); simpleResult('Shrine', txt, [], 'shrine'); }));
  mount(`${topbar()}${vista()}<div class="panel dark"><div class="row">${med('shrine')}<div><h2>Wayside Shrine</h2><div class="small muted">A worn statue with its hand outstretched, as if waiting to be given something.</div></div></div>
    <div class="col" style="margin-top:10px">${R.SHRINE_OPTIONS.map(o => `<button data-a="${o.id}" style="text-align:left">${esc(o.label)}</button>`).join('')}</div></div>`, acts);
  sceneBanner(r.depth, false);
}

// ---------- Combat ----------
const sprites = new Map<number, ReturnType<typeof animSprite>>();
let unitScale = 2;
let lastHeroAct: Action | null = null;
function startBattle(type: R.NodeType) {
  const r = run!; battleType = type;
  battle = new Battle(r, R.encounter(r, type), r.depth, R.nodeRng(r, 'battle').int(1, 1e9), r.mods);
  target = 1;
  if (type === 'boss') sfx.boss();
  mountCombat();
  battle.start();
  playEvents();
}
function intentHtml(b: Battle, u: Unit) {
  const m = u.intent; if (!m || !u.alive) return '';
  if (m.k === 'atk') { const d = b.intentDamage(u); const em = elMult(u.el, b.hero.el); return `<div class="intent atk" title="${esc(m.name)}">${intentIcon('atk')}<b>${d}${m.hits && m.hits > 1 ? 'x' + m.hits : ''}</b>${m.status ? statusIcon(m.status[0], 12) : ''}${em > 1 ? '<i>!</i>' : ''}</div>`; }
  const ik = m.k === 'guard' ? 'guard' : m.k === 'heal' ? 'heal' : m.k === 'buff' ? 'buff' : 'debuff';
  return `<div class="intent ${m.k}" title="${esc(m.name)}">${intentIcon(ik)}${m.k === 'debuff' || m.k === 'buff' ? statusIcon(m.status[0], 12) : ''}</div>`;
}
function statusHtml(u: Unit) { return Object.entries(u.st).filter(([, v]) => v).map(([k, v]) => `<span class="st" style="--sc:${STATUS_COL[k]}" title="${esc(STATUS_DESC[k])}">${statusIcon(k, 14)}<b>${v}</b></span>`).join(''); }
function hpHtml(u: Unit) { const sh = u.st.shield ?? 0; return `<div class="hpbar"><i style="width:${(100 * u.hp) / u.maxHp}%"></i>${sh ? `<b style="width:${Math.min(100, (100 * sh) / u.maxHp)}%"></b>` : ''}</div><div class="hptext">${u.hp}/${u.maxHp}${sh ? ` <span style="color:#a8d8ff">+${sh}</span>` : ''}</div>`; }
function unitFrames(u: Unit) { return u.isHero ? heroFrames(run!.heroId, run!.evo) : enemyFrames(u.edef!.id, u.phase); }
function mountCombat() {
  const b = battle!, r = run!;
  const wide = window.innerWidth >= 700; const n = b.enemies.length;
  unitScale = wide ? (n >= 3 ? 2 : 3) : (n >= 3 ? 1 : 2);
  if (!wide && n === 1 && b.enemies[0].edef!.tier !== 'normal') unitScale = 2;
  if (wide && b.enemies.some(e => e.edef!.tier === 'boss')) unitScale = 3;
  if (wide && n >= 2 && b.enemies.some(e => e.edef!.tier === 'elite')) unitScale = 2;
  const keys = (e: KeyboardEvent) => {
    if (animating || !b.waiting) return;
    const k = parseInt(e.key);
    if (k >= 1 && k <= 4) act({ kind: 'skill', i: k - 1, target });
    else if (e.key === 'a' || e.key === 'A') act({ kind: 'basic', target });
    else if (e.key === 'd' || e.key === 'D') act({ kind: 'defend' });
    else if (e.key === 'f' || e.key === 'F') toggleFast();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Tab') { e.preventDefault(); const al = b.enemiesAlive(); const ix = al.findIndex(x => x.uid === target); target = al[(ix + (e.key === 'ArrowLeft' ? al.length - 1 : 1)) % al.length].uid; updateCombat(); }
  };
  mount(`<div id="tb">${topbar(`<button class="sm" data-a="ff">${meta.fast ? 'SPEED x3' : 'SPEED x1'}</button>`)}</div>
    <div class="arena ${battleType}" id="arena"><canvas class="scene px"></canvas><div class="flashov"></div>
      <div class="turnbar" id="turnbar"></div>
      ${battleType === 'boss' ? `<div class="boss-title">REGION GUARDIAN</div>` : ''}
      <div class="stage" id="stage">
        <div class="side left"><div class="unit hero" id="u0"><div class="sts"></div><div class="spr"></div><div class="plate"><div class="nm">${esc(R.heroStats(r).title)}</div><div class="hp"></div></div></div></div>
        <div class="side right">${b.enemies.map(e => `<div class="unit enemy ${e.edef!.tier}" id="u${e.uid}" data-a="t${e.uid}"><div class="intentw"></div><div class="sts"></div><div class="spr"></div><div class="plate"><div class="nm">${esc(e.name)} <span class="el-${e.el}">&#9670;</span></div><div class="hp"></div></div></div>`).join('')}</div>
      </div>
    </div>
    <div class="panel actions" id="actions"></div>`,
    { ...baseActs, ff: toggleFast, ...Object.fromEntries(b.enemies.map(e => ['t' + e.uid, () => { if (e.alive && !animating) { target = e.uid; updateCombat(); } }])) }, keys);
  const cv = app.querySelector<HTMLCanvasElement>('#arena canvas.scene')!;
  scene = new Scene(cv, themeFor(r.depth), 0.26); scene.start();
  const stage = app.querySelector<HTMLElement>('#stage')!; stage.style.bottom = Math.round((scene.h - scene.groundY) * scene.scale * 0.32) + 'px';
  sprites.clear();
  for (const u of [b.hero, ...b.enemies]) { const a = animSprite(unitFrames(u), unitScale, { phase: u.uid }); sprites.set(u.uid, a); put(`#u${u.uid} .spr`, a.el); }
  updateCombat();
}
function toggleFast() { meta.fast = !meta.fast; saveMeta(meta); const bt = app.querySelector('[data-a="ff"]'); if (bt) bt.textContent = meta.fast ? 'SPEED x3' : 'SPEED x1'; }
function updateCombat() {
  const b = battle!, r = run!; if (!app.querySelector('#arena')) return;
  if (!b.enemies[target - 1]?.alive) target = b.enemiesAlive()[0]?.uid ?? 1;
  for (const u of [b.hero, ...b.enemies]) {
    const el = app.querySelector<HTMLElement>(`#u${u.uid}`); if (!el) continue;
    el.querySelector('.sts')!.innerHTML = statusHtml(u); el.querySelector('.hp')!.innerHTML = hpHtml(u);
    const iw = el.querySelector('.intentw'); if (iw) iw.innerHTML = intentHtml(b, u);
    el.classList.toggle('target', !u.isHero && u.uid === target && u.alive && b.waiting);
    if (!u.alive) el.classList.add('dead');
  }
  const tb = app.querySelector('#turnbar')!; const mobile = window.innerWidth < 640;
  tb.innerHTML = `<span class="tl">TURN</span>` + b.preview(mobile ? 5 : 8).map((u, i) => `<div class="tb ${u.isHero ? 'hero' : ''} ${i === 0 ? 'now' : ''}" title="${esc(u.name)}"><img class="px" src="${unitFrames(u).idle[0].toDataURL()}"></div>`).join('');
  const disabled = animating || !b.waiting || !!b.over;
  const acts = app.querySelector<HTMLElement>('#actions')!;
  acts.innerHTML = `<div class="row"><div class="energy">${miscIcon('energy', 16)} ${Array.from({ length: b.maxEnergy }, (_, i) => `<i class="${i < b.energy ? 'on' : ''}"></i>`).join('')}</div>
        ${b.freeSkills ? `<span class="tiny tag">TAILWIND: NEXT SKILL FREE</span>` : ''}<span class="grow"></span><span class="tiny muted">${battleType === 'boss' ? 'GUARDIAN &middot; ' : battleType === 'elite' ? 'ELITE &middot; ' : ''}Target: ${esc(b.enemies[target - 1]?.name ?? '')}</span></div>
      <div class="skills">${r.skills.map((s, i) => { const d = SKILL[s.id]; const cost = b.skillCost(i); const el = d.el ?? b.hero.el; return `<button class="skill r-${d.rarity}" style="--elc:${EL_COL[el]}" data-a="s${i}" ${disabled || !b.canUse(i) ? 'disabled' : ''} title="${esc(d.desc)}">
        <span class="k">${i + 1}</span><span class="row nm2"><span class="gem"></span><b>${esc(d.name)}${s.up ? '+' : ''}</b></span><span class="tiny cost">${cost < d.cost ? 'FREE' : `${cost} ENERGY`} &middot; ${el.toUpperCase()}</span><span class="tiny">${esc(d.desc)}</span></button>`; }).join('')}</div>
      <div class="basic"><button class="primary" data-a="atk" ${disabled ? 'disabled' : ''}>ATTACK <span class="kbd">A</span></button><button data-a="def" ${disabled ? 'disabled' : ''}>DEFEND <span class="kbd">D</span></button>${r.potions.map((p, i) => `<button class="pot" data-a="p${i}" ${disabled ? 'disabled' : ''} title="${esc(POTION[p].desc)}">${miscIcon('potion', 16, POT_COL[p])} ${esc(POTION[p].name)}</button>`).join('')}<span class="grow"></span><span class="tiny muted hide-sm">Attack/Defend: +1 Energy. Tap an enemy to target.</span></div>
      <div class="log" id="log"></div>`;
  bindIn(acts, {
    atk: () => act({ kind: 'basic', target }), def: () => act({ kind: 'defend' }),
    ...Object.fromEntries(r.skills.map((_, i) => ['s' + i, () => act({ kind: 'skill', i, target })])),
    ...Object.fromEntries(r.potions.map((_, i) => ['p' + i, () => act({ kind: 'potion', i, target })])),
  });
  const tbar = app.querySelector('#tb'); if (tbar) { tbar.innerHTML = topbar(`<button class="sm" data-a="ff">${meta.fast ? 'SPEED x3' : 'SPEED x1'}</button>`); bindIn(tbar, { ...baseActs, ff: toggleFast }); }
}
function act(a: Action) {
  const b = battle!; if (animating || !b.waiting) return;
  if (a.kind === 'skill' && !b.canUse(a.i)) return;
  lastHeroAct = a;
  b.heroAct(a);
  playEvents();
}
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
function unitPt(uid: number) {
  const el = app.querySelector(`#u${uid} .spr-cv`), ar = app.querySelector('#arena');
  if (!el || !ar || !scene) return { x: 0, y: 0 };
  const a = el.getBoundingClientRect(), r = ar.getBoundingClientRect();
  return { x: Math.round((a.left + a.width / 2 - r.left) / scene.scale), y: Math.round((a.top + a.height * 0.5 - r.top) / scene.scale) };
}
function popNum(uid: number, text: string, cls: string) {
  const el = app.querySelector(`#u${uid} .spr`); if (!el) return;
  const f = document.createElement('div'); f.className = 'num ' + cls; f.textContent = text; f.style.left = `${45 + Math.random() * 20}%`; el.appendChild(f); setTimeout(() => f.remove(), 1100);
}
function updUnit(uid: number) {
  const b = battle!; const u = b.unit(uid); const el = app.querySelector(`#u${uid}`); if (!el || !u) return;
  el.querySelector('.sts')!.innerHTML = statusHtml(u); el.querySelector('.hp')!.innerHTML = hpHtml(u);
}
function lunge(uid: number) { const el = app.querySelector(`#u${uid} .spr`); if (!el) return; const c = uid === 0 ? 'lunge-r' : 'lunge-l'; el.classList.remove(c); void (el as HTMLElement).offsetWidth; el.classList.add(c); }
function shake(big = false) { const a = app.querySelector('#arena'); if (!a) return; const c = big ? 'shake-big' : 'shake'; a.classList.remove('shake', 'shake-big'); void (a as HTMLElement).offsetWidth; a.classList.add(c); }
function moveKind(u: Unit, name: string) { const m = [...(u.edef?.moves ?? []), ...(u.edef?.phase2 ?? [])].find(x => x.name === name); return m?.k ?? 'atk'; }
async function playEvents() {
  const b = battle!; animating = true; updateCombat();
  const evs = b.events.splice(0); const d = meta.fast ? 80 : 240;
  const logEl = () => app.querySelector('#log');
  let lastSrcEl: El = b.hero.el; let pendingDot = '';
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    if (!app.querySelector('#arena')) break;
    switch (e.k) {
      case 'turn': app.querySelectorAll('.unit').forEach(x => x.classList.remove('active')); app.querySelector(`#u${e.uid}`)?.classList.add('active'); break;
      case 'act': {
        const u = b.unit(e.uid); const l = logEl(); if (l) l.textContent = `${u.isHero ? 'You' : u.name}: ${e.name}`; showBanner(`${u.isHero ? '' : u.name + ': '}${e.name}`, u.isHero);
        const pt = unitPt(e.uid);
        if (u.isHero) {
          const a = lastHeroAct; let el: El = b.hero.el; let hasDmg = a?.kind === 'basic';
          if (a?.kind === 'skill') { const sd = SKILL[run!.skills[a.i]?.id]; if (sd) { el = sd.el ?? b.hero.el; hasDmg = sd.fx.some(f => f.t === 'dmg'); } }
          lastSrcEl = el;
          if (a?.kind === 'skill' || a?.kind === 'potion') { scene!.castColor = EL_COL[el]; scene!.burst('cast', pt.x, pt.y); sfx.shield(); }
          if (hasDmg) lunge(0);
          lastHeroAct = a?.kind === 'potion' ? null : a;
        } else {
          lastSrcEl = u.el; const k = moveKind(u, e.name);
          if (k === 'atk') lunge(e.uid); else { scene!.castColor = { buff: '#ffb070', guard: '#a8d8ff', heal: '#8aff8a', debuff: '#c9a0ff' }[k] ?? '#fff'; scene!.burst('cast', pt.x, pt.y); }
        }
        await wait(d * 0.9); break;
      }
      case 'dmg': {
        const pt = unitPt(e.uid); sprites.get(e.uid)?.flash();
        const nextText = evs[i + 1]?.k === 'text' ? (evs[i + 1] as any).s : '';
        if (e.src !== undefined) { const el = e.src === 0 ? lastSrcEl : b.unit(e.src).el; scene!.burst(el === 'none' ? 'hit' : el, pt.x, pt.y); scene!.burst('hit', pt.x, pt.y); }
        else if (nextText === 'Burn') { scene!.burst('fire', pt.x, pt.y, 8); pendingDot = 'burn'; }
        else if (nextText === 'Bleed') { scene!.castColor = '#ff4a5a'; scene!.burst('status', pt.x, pt.y); pendingDot = 'bleed'; }
        else scene!.burst('hit', pt.x, pt.y);
        popNum(e.uid, e.n ? `${e.n}` : '0', e.crit ? 'crit' : pendingDot ? 'dot ' + pendingDot : e.uid === 0 ? 'hurt' : 'dmg'); pendingDot = '';
        if (e.eff === 'super') popNum(e.uid, 'SUPER EFFECTIVE!', 'txt super'); else if (e.eff === 'weak') popNum(e.uid, 'not very effective', 'txt');
        if (e.crit) { scene!.flash = 5; shake(true); sfx.crit(); popNum(e.uid, 'CRITICAL!', 'txt critt'); } else { if (e.n) shake(false); sfx.hit(); }
        updUnit(e.uid); await wait(d * 0.8); break;
      }
      case 'heal': { const pt = unitPt(e.uid); scene!.burst('heal', pt.x, pt.y); popNum(e.uid, `+${e.n}`, 'heal'); sfx.heal(); updUnit(e.uid); await wait(d * 0.5); break; }
      case 'status': { const pt = unitPt(e.uid); if (e.key === 'shield') { scene!.burst('shield', pt.x, pt.y); sfx.shield(); } else { scene!.castColor = STATUS_COL[e.key]; scene!.burst('status', pt.x, pt.y); sfx.status(); } popNum(e.uid, `${STATUS_ABBR[e.key]} +${e.n}`, 'txt st-' + e.key); updUnit(e.uid); await wait(d * 0.4); break; }
      case 'text': if (e.s !== 'Burn' && e.s !== 'Bleed') popNum(e.uid, e.s, 'txt'); await wait(d * 0.3); break;
      case 'die': { const pt = unitPt(e.uid); scene!.burst('death', pt.x, pt.y); const el = app.querySelector(`#u${e.uid}`); el?.classList.add('dying'); sfx.die(); await wait(d * 1.4); el?.classList.add('dead'); break; }
      case 'phase': { const u = b.unit(e.uid); sprites.get(e.uid)?.set(enemyFrames(u.edef!.id, 2)); sprites.get(e.uid)?.flash(); scene!.flash = 6; shake(true); showBanner(e.s, false, true); sfx.boss(); const pt = unitPt(e.uid); scene!.castColor = '#ff5a3a'; scene!.burst('cast', pt.x, pt.y); scene!.burst('fire', pt.x, pt.y, 20); await wait(d * 3); break; }
    }
  }
  animating = false;
  if (b.over) { await wait(meta.fast ? 200 : 600); return endBattle(); }
  updateCombat();
}
function showBanner(s: string, hero = false, big = false) {
  const a = app.querySelector('#arena'); if (!a) return;
  a.querySelector('.banner')?.remove(); const bn = document.createElement('div'); bn.className = 'banner' + (hero ? ' hero' : '') + (big ? ' big' : ''); bn.textContent = s; a.appendChild(bn);
  setTimeout(() => bn.remove(), meta.fast ? 450 : 1000);
}
function endBattle() {
  const b = battle!, r = run!;
  if (b.over === 'lose') { r.hp = 0; sfx.lose(); return summary(); }
  sfx.win();
  R.finishBattle(r, b.hero.hp, b.kills);
  const rw = R.genRewards(r, battleType); r.gold += rw.gold;
  let lastWords = '';
  if (battleType === 'boss') { const boss = b.enemies[0].edef!; lastWords = boss.lastWords ?? ''; if (lastWords && !meta.bossWords.includes(boss.id)) meta.bossWords.push(boss.id); saveMeta(meta); }
  rewardScreen(rw, lastWords);
}
function rewardScreen(rw: { gold: number; options: R.Reward[] }, lastWords: string) {
  const r = run!; const boss = battleType === 'boss';
  const after = () => boss ? bossCleared() : stopDone();
  const card = (o: R.Reward) => o.kind === 'relic' ? `<div class="tiny kind">RELIC</div><div class="row"><b>${esc(RELIC[o.id].name)}</b><span class="grow"></span>${rar(o.rarity)}</div><div class="small">${esc(RELIC[o.id].desc)}</div>`
    : o.kind === 'upgrade' ? `<div class="tiny kind">UPGRADE</div>${skillCard(r.skills[o.idx].id, true)}` : `<div class="tiny kind">NEW SKILL</div>${skillCard(o.id)}`;
  const acts: Record<string, () => void> = { ...baseActs, skip: () => { r.gold += 15; sfx.coin(); after(); } };
  rw.options.forEach((o, i) => (acts['o' + i] = () => {
    if (o.kind === 'skill') return learnFlow(o.id, after, () => rewardScreen({ gold: 0, options: rw.options }, lastWords));
    R.applyReward(r, o); sfx.coin(); after();
  }));
  mount(`${topbar()}<div class="panel dark center"><h2 class="victory">${boss ? 'GUARDIAN DEFEATED' : 'VICTORY'}</h2><div class="small">${rw.gold ? `${miscIcon('coin', 14)} +${rw.gold} gold. ` : ''}Choose one reward, or skip for 15 gold.</div>
    ${lastWords ? `<div class="lore"><span class="src">Last words</span>"${esc(lastWords)}"</div>` : ''}</div>
    <div class="cards rewards">${rw.options.map((o, i) => `<div class="card reward r-${o.rarity}" data-a="o${i}" style="animation-delay:${i * 90}ms"><span class="kbd corner">${i + 1}</span>${card(o)}</div>`).join('')}</div>
    <div class="panel center"><button data-a="skip">SKIP (+15 GOLD)</button></div>`, acts,
    e => { const k = parseInt(e.key); if (k >= 1 && k <= rw.options.length) acts['o' + (k - 1)](); if (e.key === 's' || e.key === 'S') acts.skip(); });
}
function bossCleared() {
  const r = run!; const { evolved } = R.nextRegion(r); saveMeta(meta);
  if (!evolved) return regionIntro();
  sfx.evolve(); const h = R.heroDef(r); const ev = h.evo[r.evo];
  mount(`${topbar()}<div class="panel dark center evo"><div class="small muted">EVOLUTION</div><h2 class="victory">${esc(ev.title)}</h2><div id="evo_h" class="row" style="justify-content:center;gap:30px;margin:14px 0;align-items:flex-end"></div>
    <p class="small">+${ev.hp - h.evo[r.evo - 1].hp} HP, +${ev.atk - h.evo[r.evo - 1].atk} ATK, +${ev.def - h.evo[r.evo - 1].def} DEF, +${ev.spd - h.evo[r.evo - 1].spd} SPD</p>
    <p class="small"><b>${esc(ev.passiveDesc)}</b></p><button class="primary" data-a="go">CONTINUE</button></div>`, { ...baseActs, go: regionIntro });
  const box = app.querySelector('#evo_h')!; box.appendChild(animSprite(heroFrames(h.id, r.evo - 1), 2).el); const arrow = document.createElement('span'); arrow.className = 'evo-arrow'; arrow.textContent = '>>'; box.appendChild(arrow); box.appendChild(animSprite(heroFrames(h.id, r.evo), 3).el);
}

// ---------- Summary / meta / journal ----------
function summary() {
  const r = run!; const dist = R.distance(r); const embers = R.embersFor(r);
  meta.embers += embers; meta.journeys++; meta.totalDistance += dist; meta.best[r.heroId] = Math.max(meta.best[r.heroId] ?? 0, dist); saveMeta(meta);
  const lore = r.lore.map(id => LORE.find(l => l.id === id)!).filter(Boolean);
  mount(`<div class="vista"><canvas class="scene px"></canvas><div class="vista-title"><div class="small">THE JOURNEY PAUSES</div><h1 class="victory">DISTANCE ${dist}</h1></div></div>
    <div class="panel dark center">
      <div class="small">${esc(R.heroStats(r).title)} fell in ${esc(R.regionName(r.depth))}, stop ${r.stop}.</div>
      <div class="small">Regions cleared: ${r.depth} &middot; Foes defeated: ${r.kills} &middot; Seed: <b class="seed">${esc(r.seed)}</b></div>
      <h2 style="margin-top:14px">${miscIcon('ember', 20)} +${embers} EMBERS OF HOPE</h2><div class="small muted">Best with this hero: ${meta.best[r.heroId]}</div></div>
    <div class="panel"><h3>Build</h3><div class="small">${r.skills.map(skillLine).join(' / ')}</div><div style="margin-top:6px">${relicChips(r.relics) || '<span class="tiny muted">No relics</span>'}</div>
      <h3 style="margin-top:12px">Lore found (${lore.length})</h3>${lore.map(l => `<div class="lore"><span class="src">${esc(l.src)}</span>${esc(l.text)}</div>`).join('') || '<div class="small muted">Nothing this time. Something is patient.</div>'}</div>
    <div class="panel row"><button class="primary" data-a="again">NEW JOURNEY</button><button data-a="replay">REPLAY SEED</button><button data-a="meta">SPEND EMBERS</button><button data-a="journal">JOURNAL</button><button data-a="title">TITLE</button></div>`,
    { again: heroSelect, replay: () => startRun(r.heroId, r.seed), meta: metaScreen, journal: () => journalScreen(titleScreen), title: titleScreen });
  sceneBanner(r.depth, false);
  if (scene) scene.walker = undefined;
  run = null;
}
function metaScreen() {
  mount(`<div class="panel dark"><div class="row">${miscIcon('ember', 32)}<div><h2>Embers of Hope: ${meta.embers}</h2><div class="small muted">Earned by distance traveled. They carry over between journeys.</div></div></div></div>
    <div class="cards">${UPGRADES.map(u => { const c = u.cost(meta); const owned = c === null; return `<div class="card ${owned ? 'r-rare' : 'r-common'}" style="cursor:default"><b>${esc(u.name)}</b><div class="small">${esc(u.desc)}</div><div class="tiny muted">${u.owned(meta)}</div><div class="grow"></div>
      <button class="${!owned && meta.embers >= c! ? 'primary' : ''}" data-a="u_${u.id}" ${owned || meta.embers < c! ? 'disabled' : ''}>${owned ? 'MAXED' : `BUY ${c}`}</button></div>`; }).join('')}</div>
    <div class="panel"><button data-a="back">BACK</button></div>`,
    { back: titleScreen, ...Object.fromEntries(UPGRADES.map(u => ['u_' + u.id, () => { const c = u.cost(meta); if (c === null || meta.embers < c) return; meta.embers -= c; u.buy(meta); saveMeta(meta); sfx.evolve(); metaScreen(); }])) },
    e => { if (e.key === 'Escape') titleScreen(); });
}
function journalScreen(back: () => void = titleScreen) {
  const bosses = Object.values(ENEMY).filter(e => e.tier === 'boss');
  mount(`<div class="panel dark"><h2>Journal</h2><div class="small">Journeys: ${meta.journeys} &middot; Total distance: ${meta.totalDistance} &middot; Lore: ${meta.lore.length}/${LORE.length}</div>
      <div class="row journal-heroes">${HEROES.map(h => `<div class="jh"><div class="jspr" id="jh_${h.id}"></div><div class="tiny">${esc(h.name)}</div><div class="tiny muted">Best ${meta.best[h.id] ?? 0}</div></div>`).join('')}</div></div>
    <div class="panel"><h3>Fragments of Something</h3>${LORE.map(l => meta.lore.includes(l.id) ? `<div class="lore"><span class="src">${esc(l.src)}</span>${esc(l.text)}</div>` : `<div class="lore muted"><span class="src">???</span>Not yet found.</div>`).join('')}
      <h3 style="margin-top:12px">Last words of the guardians</h3>${bosses.map(b => meta.bossWords.includes(b.id) ? `<div class="lore"><span class="src">${esc(b.name)}</span>"${esc(b.lastWords ?? '')}"</div>` : `<div class="lore muted"><span class="src">???</span>Unheard.</div>`).join('')}</div>
    <div class="panel"><button data-a="back">BACK</button></div>`, { back }, e => { if (e.key === 'Escape') back(); });
  HEROES.forEach(h => { const locked = h.locked && !meta.unlocked.includes(h.id); const c = heroStatic(h.id, 1); if (locked) c.style.filter = 'brightness(0)'; put('#jh_' + h.id, c); });
}

if (location.search.includes('gallery')) import('./gallery').then(m => m.gallery(app)); else titleScreen();
void mix;
// Debug hooks for automated screenshots/tests.
(window as any).__sfs = { get run() { return run; }, get battle() { return battle; }, startRun, mapScreen, startBattle, enterNode, R };
