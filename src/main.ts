import '@fontsource/press-start-2p/400.css';
import './style.css';
import { HEROES } from './data/heroes';
import { SKILL } from './data/skills';
import { RELIC } from './data/relics';
import { POTION } from './data/potions';
import { ENEMY } from './data/enemies';
import { REGIONS, FURTHER_MODIFIERS, SUNRISE_DEPTH } from './data/regions';
import { LORE } from './data/lore';
import { Battle, elMult, type Unit, type Action } from './engine/battle';
import * as R from './engine/run';
import { loadMeta, saveMeta, UPGRADES, type Meta } from './engine/meta';
import { newSeed, RNG } from './engine/rng';
import { heroFrames, heroFramesLo, enemyFrames, staticSprite } from './ui/spritecache';
import { animSprite } from './ui/anim';
import { Scene, THEMES } from './ui/scene';
import { installFrames } from './ui/frames';
import { statusIcon, intentIcon, miscIcon, medallion } from './ui/icons';
import { tone, mix } from './ui/pix';
import { drawFestMap, landmark } from './ui/festmap';
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
const EL_COL: Record<string, string> = { fire: '#ff3ec8', water: '#3ae8ff', wind: '#b8ff3a', earth: '#ffb43a', none: '#c8c0e8' };
const GENRE: Record<string, string> = { fire: 'Bass', water: 'Flow', wind: 'Tempo', earth: 'Wall', none: 'Neutral' };
const elName = (e: string) => `<span class="el-${e}">${GENRE[e]}</span>`;
const loreCls = (src: string) => src.startsWith('Late text') ? 'text' : src.startsWith('Porta') ? 'graffiti' : src.startsWith('Flyer') ? 'flyer' : src.startsWith('Voice') ? 'voice' : src.startsWith('Glimmer') ? 'glim' : '';
const loreHtmlOf = (l: { src: string; text: string }) => `<div class="lore ${loreCls(l.src)}"><span class="src">${esc(l.src)}</span>${esc(l.text)}</div>`;
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
    <div class="small">Cost ${d.cost} &middot; ${d.el ? elName(d.el) : 'Hero element'}</div><div class="small">${kwHtml(d.desc)}${up ? ' <i>(Upgraded: +30% power, +1 status)</i>' : ''}</div>${extra}`;
}
const STATUS_DESC: Record<string, string> = { burn: 'Feedback: takes N damage at turn start, then N-1.', soak: 'Muffled: -30% SPD.', bleed: 'Drain: takes N damage at turn start; stacks decay 40%.', stun: 'Dazzled: skips its turn.', shield: 'Guard: absorbs damage; halves each turn.', strength: 'Hype: +30% damage (turns).', weak: 'Tired: -25% damage (turns).', thorns: 'Spikes: attackers take 2xN damage.' };
/** Tooltip text for a status with its live value (n). */
function statusTip(k: string, n?: number): string {
  const v = n ?? 0; const has = n !== undefined;
  switch (k) {
    case 'burn': return has ? `FEEDBACK ${v}: takes ${v} damage at the start of its turn, then it drops by 1 (${v} > ${Math.max(0, v - 1)}). Ignores DEF and Guard.` : 'FEEDBACK: takes damage equal to its stacks at the start of its turn, then loses 1 stack. Ignores DEF and Guard.';
    case 'bleed': return has ? `DRAIN ${v}: takes ${v} damage at the start of its turn, then 60% of the stacks remain (${v} > ${Math.floor(v * 0.6)}). Ignores DEF and Guard.` : 'DRAIN: takes damage equal to its stacks at turn start, then keeps 60% of them. Ignores DEF and Guard.';
    case 'soak': return `MUFFLED${has ? ' ' + v : ''}: SPD -30%, so it acts later in the turn order.${has ? ` ${v} turn${v === 1 ? '' : 's'} left.` : ' Lasts N turns.'}`;
    case 'stun': return `DAZZLED${has ? ' ' + v : ''}: skips its next turn${has && v > 1 ? 's (' + v + ')' : ''}. DJ bosses shrug it off 50% of the time.`;
    case 'shield': return has ? `GUARD ${v}: absorbs the next ${v} damage before Energy is lost. Half of it fades at the start of the owner's turn.` : 'GUARD: absorbs damage before Energy/HP. Half of it fades at the start of the owner\'s turn.';
    case 'strength': return `HYPE${has ? ' ' + v : ''}: deals +30% damage.${has ? ` ${v} turn${v === 1 ? '' : 's'} left.` : ' Lasts N turns.'}`;
    case 'weak': return `TIRED${has ? ' ' + v : ''}: deals -25% damage.${has ? ` ${v} turn${v === 1 ? '' : 's'} left.` : ' Lasts N turns.'}`;
    case 'thorns': return has ? `SPIKES ${v}: every enemy that hits you takes ${v * 2} damage back.` : 'SPIKES: every enemy that hits you takes 2 x stacks damage back.';
  }
  return '';
}
const KW: [RegExp, string][] = [
  [/\bFeedback\b/g, statusTip('burn')], [/\bMuffled\b/g, statusTip('soak')], [/\bDrain\b/g, statusTip('bleed')], [/\bDazzle[ds]?\b/g, statusTip('stun')],
  [/\bGuard\b/g, statusTip('shield')], [/\bHype\b/g, statusTip('strength')], [/\bTired\b/g, statusTip('weak')], [/\bSpikes\b/g, statusTip('thorns')],
  [/\bVibe\b/g, 'VIBE: pays for skills. +1 at the start of each of your turns, +1 for Dance or Catch the Beat.'],
  [/\bEnergy\b/g, 'ENERGY: your HP. At 0 you crash and the night ends.'],
  [/\bcrit\b/g, 'CRIT: a critical hit multiplies damage (x1.6 base) before DEF is subtracted.'],
  [/\bATK\b/g, 'ATK: your attack stat. Skill damage = ATK x power %, then minus target DEF.'],
  [/\bDEF\b/g, 'DEF: subtracted from every hit you take (minimum 1 damage).'],
  [/\bCleanse\b/g, 'CLEANSE: removes Feedback, Drain, Muffled, Tired and Dazzled from you.'],
];
/** Escape text, clarify "% dmg" and wrap keywords in tooltip spans. */
function kwHtml(text: string): string {
  let t = text.replace(/(\d+)% dmg/g, '$1% ATK dmg').replace(/for (\d+)%/g, 'for $1% ATK').replace(/(\d+)% to all/g, '$1% ATK to all').replace(/[Dd]eal (\d+)%(?! ATK)/g, m => m + ' ATK');
  t = esc(t);
  // single pass so tooltip text is never re-scanned for keywords
  const all = new RegExp(KW.map(([re]) => re.source).join('|'), 'g');
  return t.replace(all, m => { const hit = KW.find(([re]) => new RegExp('^(?:' + re.source + ')$').test(m)); return hit ? `<span class="kw" data-tip="${esc(hit[1])}">${m}</span>` : m; });
}
const STATUS_ABBR: Record<string, string> = { burn: 'FDBK', soak: 'MUFF', bleed: 'DRAIN', stun: 'DAZZ', shield: 'GUARD', strength: 'HYPE', weak: 'TIRED', thorns: 'SPIKE' };
const STATUS_COL: Record<string, string> = { burn: '#ff3ec8', soak: '#3ae8ff', bleed: '#b8ff3a', stun: '#ffe066', shield: '#ffcf3a', strength: '#ff8ae0', weak: '#b8b0e0', thorns: '#6affd8' };
const POT_COL: Record<string, string | undefined> = { water: undefined, electrolyte: '#ff9a2a', coconut: '#e8f0e0' };
const potIcon = (id: string, px = 16) => POTION[id].kind === 'food' ? miscIcon('food', px) : miscIcon('potion', px, POT_COL[id]);
const themeFor = (depth: number) => ({ ...(depth === SUNRISE_DEPTH ? THEMES.sunrise : THEMES[R.region(depth).id] ?? THEMES.lot), warp: R.warpLevel(depth) });
function heroStatic(id: string, scale: number, evo = 0) { return staticSprite(scale < 2 ? heroFramesLo(id, evo) : heroFrames(id, evo), scale); }

function topbar(extra = '') {
  if (!run) return '';
  const hs = R.heroStats(run); const pct = run.hp / run.maxHp;
  return `<div class="topbar">
    <div class="stat" title="Energy">${miscIcon('heart', 16)}<div class="mini-bar"><i style="width:${pct * 100}%"></i></div>${run.hp}/${run.maxHp}</div>
    <div class="stat" title="Glowsticks">${miscIcon('coin', 16)} ${run.gold}</div>
    <div class="stat">${run.potions.map(p => `<span title="${esc(POTION[p].name + ': ' + POTION[p].desc)}">${potIcon(p)}</span>`).join('') || '<span class="tiny muted">no items</span>'}</div>
    <div class="grow"></div>
    <div class="tiny muted hide-sm">${esc(hs.title)}</div>
    <div class="dist">DEPTH <b>${R.distance(run)}</b></div>
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
      <div class="logo"><div class="logo-sm">NEON NOCTURNE &middot; LAST NIGHT</div><h1>RAVE<br><span>ROLLERS</span></h1><div class="logo-tag">find your crew &middot; reach THE SET</div></div>
      <div class="panel dark title-menu">
        <div class="sub small">The last night of the festival. Your crew is gone and your phone is at 2%. Somewhere past the main stage, Halcyon Ray might play a secret sunrise set. Nobody has ever heard it.</div>
        <div class="menu">
          <button class="primary" data-a="start">ENTER THE FESTIVAL</button>
          <button data-a="meta">${miscIcon('ember', 14)} AFTERGLOW (${meta.embers})</button>
          <button data-a="journal">JOURNAL</button>
          <button data-a="mute">${meta.muted ? 'SOUND OFF' : 'SOUND ON'}</button>
        </div>
        <div class="tiny center muted">Nights ${meta.journeys} &middot; Fragments ${meta.lore.length}/${LORE.length}</div>
      </div>
    </div></div>`,
    { start: heroSelect, meta: metaScreen, journal: () => journalScreen(), ...baseActs },
    e => { if (e.key === 'Enter') heroSelect(); });
  const cv = app.querySelector<HTMLCanvasElement>('canvas.scene')!;
  scene = new Scene(cv, THEMES.title, 0.22, true); scene.scroll = 1;
  const fr = heroFramesLo(heroId, 0); scene.walker = { frames: fr.walk, x: Math.round(scene.w * 0.18), y: scene.groundY + 4 };
  scene.start();
}

// ---------- Hero select ----------
function heroSelect() {
  let sel = 'bass';
  const render = () => {
    mount(`<div class="panel dark"><h2>CHOOSE YOUR RAVER</h2><div class="small muted">Your crew is out there somewhere. Pick who goes looking. Genre wheel: Bass &gt; Tempo &gt; Wall &gt; Flow &gt; Bass.</div></div>
      <div class="cards">${HEROES.map(h => {
        const locked = h.locked && !meta.unlocked.includes(h.id);
        return `<div class="card hero-card ${locked ? 'locked' : ''} ${sel === h.id ? 'sel' : ''}" data-a="${locked ? 'x' : 'h_' + h.id}">
        <div class="row"><b>${esc(h.name)}</b><span class="grow"></span>${elName(h.el)}</div>
        <div class="spr-stage" style="--el:${EL_COL[h.el]}"><div class="spr" id="hs_${h.id}"></div></div>
        <div class="stats"><span>ENERGY ${h.hp + meta.perks.hp * 6}</span><span>ATK ${h.atk}</span><span>DEF ${h.def}</span><span>SPD ${h.spd}</span><span>VIBE ${h.energy + (meta.perks.insight ? 1 : 0)}</span><span>CRIT ${Math.round(h.crit * 100)}%</span></div>
        <div class="small"><b>${esc(h.passiveDesc)}</b></div>
        <div class="tiny">${h.skills.map(s => esc(SKILL[s].name)).join(' / ')}</div>
        ${locked ? '<div class="small"><b>LOCKED</b>: unlock with 60 Afterglow</div>' : `<div class="tiny muted">Best depth: ${meta.best[h.id] ?? 0}</div>`}
      </div>`; }).join('')}</div>
      <div class="panel row"><span class="small">Seed</span><input id="seed" maxlength="10" placeholder="random"><span class="grow"></span>
        <button data-a="back">BACK</button><button class="primary" data-a="go">LET'S GO</button></div>`,
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
  const fr = heroFramesLo(run.heroId, run.evo); scene.walker = { frames: walk ? fr.walk : fr.idle, x: Math.round(scene.w * 0.42), y: scene.groundY + 6 };
  scene.start();
}
function regionIntro() {
  const r = run!; const reg = R.region(r.depth);
  const mods = r.mods.map(id => FURTHER_MODIFIERS.find(m => m.id === id)!);
  let loreHtml = '';
  if (r.depth >= REGIONS.length && r.depth % REGIONS.length === 0) { const l = R.unseenLore(r, meta, R.nodeRng(r, 'further'), 'further'); saveMeta(meta); loreHtml = loreHtmlOf(l); }
  mount(`${topbar()}<div class="vista"><canvas class="scene px"></canvas><div class="vista-title"><div class="small">${r.depth === SUNRISE_DEPTH ? 'THE EDGE OF THE NIGHT' : r.depth > SUNRISE_DEPTH ? 'AFTERHOURS' : 'STAGE ' + (r.depth + 1)}</div><h2 style="color:${reg.accent}">${esc(R.regionName(r.depth))}</h2></div></div>
    <div class="panel dark center">
    ${r.depth === SUNRISE_DEPTH ? '<p class="small">The Sunrise Set stage. The sky is going pink at the edges. The decks are set up, but the booth is empty. Not yet. Not quite yet. Keep dancing.</p>' : ''}${mods.length ? `<p class="small">Afterhours is harsher: ${mods.map(m => `<b>${esc(m.name)}</b> (${esc(m.desc)})`).join(', ')}</p>` : r.depth === SUNRISE_DEPTH ? '' : `<p class="small">${esc(INTRO_LINES[r.depth % INTRO_LINES.length])}</p>`}
    ${loreHtml}<button class="primary" data-a="go">KEEP DANCING</button></div>`, { go: mapScreen, ...baseActs }, e => { if (e.key === 'Enter' || e.key === ' ') mapScreen(); });
  sceneBanner(r.depth, true);
}

const INTRO_LINES = [
  'Car stereos, folding chairs, glitter in the gravel. The pregame is turning grey at the edges.',
  'Wristband scanners blink red, then green, then a colour that does not exist.',
  'The trees are wrapped in fairy lights. The moon looks a lot like a disco ball tonight.',
  'A thousand people dancing in total silence. You can hear every song except yours.',
  'The tent breathes in and out with the sub. The speaker stacks are starting to melt.',
  'The wheel turns slow and bright. From the top, the festival looks like a circuit board.',
  '3AM. The main stage is a cathedral of lasers. The Drained flicker like bad video.',
];
// ---------- Map ----------
const NODE_LABEL: Record<R.NodeType, string> = { battle: 'Drained', elite: 'Elite', campfire: 'Water Station', merchant: 'Food Truck', event: 'Crew Sighting', treasure: 'Lost & Found', shrine: 'Totem Shrine', boss: 'DJ Boss' };
let MAP_W = 820; const MAP_H = 340, MS = 2; // css size and pixel scale
function drawMap(cv: HTMLCanvasElement, r: R.Run) { return drawFestMap(cv, r.map, r.pos, themeFor(r.depth), hashSeed(r.seed + r.depth), MAP_W, MAP_H, MS, R.STOPS); }
const hashSeed = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
function mapScreen() {
  const r = run!; const reg = R.region(r.depth);
  const avail = R.reachable(r);
  const acts: Record<string, () => void> = { ...baseActs, journal: () => journalScreen(mapScreen), build: buildModal };
  avail.forEach(n => (acts[`n_${n.col}_${n.row}`] = () => enterNode(n)));
  mount(`${topbar('<button class="sm" data-a="build">BUILD</button><button class="sm" data-a="journal">JOURNAL</button>')}
    <div class="panel dark row map-head"><div class="grow"><h2 style="color:${reg.accent};margin:0">${esc(R.regionName(r.depth))}</h2>
      <div class="tiny muted">Stop ${r.stop}/${R.STOPS} &middot; Seed ${esc(r.seed)} &middot; pick a glowing stop</div></div><div id="map_h"></div></div>
    <div class="mapwrap"><div class="map"><canvas class="px" id="mapcv"></canvas><div id="nodes"></div></div></div>
    <div class="legend">${(Object.keys(NODE_LABEL) as R.NodeType[]).map(t => `<span class="row"><img class="px" src="${landmark(t, 'avail')}" width="24" height="24" alt=""> ${NODE_LABEL[t]}</span>`).join('')}</div>
    <div class="panel"><div class="small"><b>Moves:</b> ${r.skills.map(skillLine).join(' / ')}</div><div style="margin-top:6px">${relicChips(r.relics) || '<span class="tiny muted">No gear yet</span>'}</div></div>`,
    acts, e => { const k = parseInt(e.key); if (k >= 1 && k <= avail.length) enterNode(avail[k - 1]); });
  const wrapEl = app.querySelector<HTMLElement>('.mapwrap')!; MAP_W = Math.max(820, wrapEl.clientWidth - (wrapEl.clientWidth % 2)); app.querySelector<HTMLElement>('.map')!.style.width = MAP_W + 'px';
  const pos = drawMap(app.querySelector<HTMLCanvasElement>('#mapcv')!, r);
  const nodesEl = app.querySelector('#nodes')!;
  nodesEl.innerHTML = r.map.flat().map(n => {
    const isAvail = avail.includes(n); const cur = r.pos && r.pos.col === n.col && r.pos.row === n.row; const done = r.pos ? n.col < r.pos.col || (n.col === r.pos.col && !cur) : false;
    const st = cur ? 'cur' : isAvail ? 'avail' : done ? 'done' : 'locked'; const sz = n.type === 'boss' ? 64 : 48;
    return `<button class="node ${st} ${n.type}" style="left:${pos.xOf(n.col)}px;top:${pos.yOf(n.y)}px" ${isAvail ? `data-a="n_${n.col}_${n.row}"` : 'disabled'} title="${NODE_LABEL[n.type]}"><img class="px" src="${landmark(n.type, st as any)}" width="${sz}" height="${sz}" alt="${NODE_LABEL[n.type]}"></button>`;
  }).join('') + (r.pos ? `<div class="map-hero" style="left:${pos.xOf(r.pos.col)}px;top:${pos.yOf(r.map[r.pos.col][r.pos.row].y)}px"></div>` : `<div class="map-hero" style="left:${pos.xOf(0) - 34}px;top:${pos.yOf(0.5)}px"></div>`);
  bindIn(nodesEl, acts);
  const mh = app.querySelector('.map-hero'); if (mh) mh.appendChild(animSprite(heroFramesLo(r.heroId, r.evo), 1).el);
  put('#map_h', animSprite(heroFrames(r.heroId, r.evo), 2).el);
  const mw = app.querySelector<HTMLElement>('.mapwrap'); if (mw && r.pos) mw.scrollLeft = Math.max(0, pos.xOf(r.pos.col) - 120);
}
function buildModal() {
  const r = run!; const hs = R.heroStats(r);
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="panel"><h2>${esc(hs.title)}</h2><div class="stats"><span>ENERGY ${r.hp}/${r.maxHp}</span><span>ATK ${hs.atk}</span><span>DEF ${hs.def}</span><span>SPD ${hs.spd}</span><span>VIBE ${hs.energy}</span><span>CRIT ${Math.round(hs.crit * 100)}%</span></div>
    <p class="small">${esc(R.heroDef(r).evo[r.evo].passiveDesc)}</p>${r.skills.map(s => `<div class="card r-${SKILL[s.id].rarity}" style="cursor:default">${skillCard(s.id, s.up)}</div>`).join('')}
    <h3>Gear</h3>${r.relics.map(id => `<div class="small">${rar(RELIC[id].rarity)} <b>${esc(RELIC[id].name)}</b>: ${esc(RELIC[id].desc)}</div>`).join('') || '<div class="small muted">None</div>'}
    <h3>Hydration &amp; Food</h3>${r.potions.map(p => `<div class="small"><b>${esc(POTION[p].name)}</b>: ${esc(POTION[p].desc)}</div>`).join('') || '<div class="small muted">None</div>'}
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
    case 'treasure': simpleResult('Lost & Found', 'A bin of other people\'s nights: single shoes, fans, a bucket hat that says BEST NIGHT EVER. Finders keepers, apparently.', R.treasure(r), 'treasure'); break;
    case 'shrine': shrineScreen(); break;
  }
}
function stopDone() { const r = run!; r.stop = (r.pos?.col ?? 0) + 1; saveMeta(meta); mapScreen(); }
const med = (t: string, px = 48) => `<img class="px med" src="${medallion(t, 'avail')}" width="${px}" height="${px}" alt="">`;
function vista(): string { return `<div class="vista sm"><canvas class="scene px"></canvas></div>`; }
function simpleResult(title: string, text: string, lines: string[], ic: string, next: () => void = stopDone) {
  mount(`${topbar()}${vista()}<div class="panel"><div class="row">${med(ic)}<h2>${esc(title)}</h2></div><p class="small">${esc(text)}</p>
    ${lines.map(l => l.startsWith('Lore:') ? `<div class="lore voice">${esc(l.slice(6))}</div>` : `<div class="small gain"><b>${esc(l)}</b></div>`).join('')}
    <div style="margin-top:12px"><button class="primary" data-a="go">CONTINUE</button></div></div>`, { go: next, ...baseActs }, e => { if (e.key === 'Enter' || e.key === ' ') next(); });
  sceneBanner(run!.depth, false);
  if (lines.length) sfx.coin();
}

// ---------- Campfire ----------
function campfire() {
  const r = run!; const lore = R.unseenLore(r, meta, R.nodeRng(r, 'camp')); saveMeta(meta);
  const heal = Math.round(r.maxHp * 0.3);
  const refilled = R.refillHydration(r);
  mount(`${topbar()}${vista()}<div class="panel dark"><div class="row">${med('campfire')}<div><h2>Water Station</h2><div class="small muted">Cold water, a bench, and a volunteer who says "you're doing great". You check your phone.</div></div></div>
    ${refilled ? `<div class="small gain"><b>Refilled: +1 Water Bottle</b></div>` : '<div class="small muted">Your bag is already full of water.</div>'}
    ${loreHtmlOf(lore)}
    <div class="row"><button class="primary" data-a="rest">CHILL OUT (+${heal} ENERGY)</button><button data-a="up" ${r.skills.some(s => !s.up) ? '' : 'disabled'}>PRACTISE A MOVE</button></div></div>`,
    { ...baseActs, rest: () => { R.healPct(r, 0.3); sfx.heal(); stopDone(); }, up: () => upgradePicker(() => stopDone(), campfire) });
  sceneBanner(r.depth, false);
  if (scene) { const s = scene; const fx = Math.round(s.w * 0.55), fy = s.groundY + 4; const iv = window.setInterval(() => { if (!s.cv.isConnected) return clearInterval(iv); s.burst('water', fx, fy, 3); }, 160); }
}
function upgradePicker(done: () => void, cancel: () => void, price = 0) {
  const r = run!;
  mount(`${topbar()}<div class="panel"><h2>Practise which move?</h2><div class="small muted">Practised moves (+) gain +30% power and +1 to applied statuses.</div></div>
    <div class="cards">${r.skills.map((s, i) => `<div class="card r-${SKILL[s.id].rarity} ${s.up ? 'locked' : ''}" data-a="${s.up ? 'x' : 'u' + i}">${skillCard(s.id, s.up)}</div>`).join('')}</div>
    <div class="panel"><button data-a="cancel">BACK</button></div>`,
    { ...baseActs, cancel, ...Object.fromEntries(r.skills.map((_, i) => ['u' + i, () => { r.gold -= price; r.skills[i].up = true; sfx.evolve(); done(); }])) });
}

// ---------- Merchant ----------
const VENDORS = [
  { name: "Nana Bao's Bun Truck", line: 'Eat something, baby. The night is long and you are all elbows.' },
  { name: 'Taco Luis', line: 'Every taco is a little sunrise. Trust me.' },
  { name: 'The Pineapple Whip Hut', line: 'Cold, sweet, and it glows a little under UV. Totally normal.' },
  { name: 'Fry Day Night', line: 'Loaded fries for loaded hearts. That is the slogan. We workshop it.' },
];
function merchant(items: R.ShopItem[]) {
  const r = run!; const vendor = R.nodeRng(r, 'vendor').pick(VENDORS);
  const desc = (it: R.ShopItem) => it.kind === 'skill' ? `<div class="tiny kind">SKILL</div>${skillCard(it.id)}` : it.kind === 'relic' ? `<div class="tiny kind">GEAR</div><div class="row"><b>${esc(RELIC[it.id].name)}</b><span class="grow"></span>${rar(RELIC[it.id].rarity)}</div><div class="small">${esc(RELIC[it.id].desc)}</div>` : it.kind === 'potion' ? `<div class="tiny kind">${POTION[it.id].kind === 'food' ? 'FOOD' : 'HYDRATION'}</div><div class="row">${potIcon(it.id, 24)}<b>${esc(POTION[it.id].name)}</b></div><div class="small">${esc(POTION[it.id].desc)}</div>` : `<div class="tiny kind">LESSON</div><b>Remix Tutorial</b><div class="small">Practise one of your moves (+).</div>`;
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
  mount(`${topbar()}<div class="panel dark"><div class="row">${med('merchant')}<div><h2>${esc(vendor.name)}</h2><div class="small muted">"${esc(vendor.line)}"</div></div></div></div>
    <div class="cards">${items.map((it, i) => `<div class="card ${cls(it)} ${it.sold ? 'locked' : ''}" style="cursor:default">${desc(it)}<div class="grow"></div><button class="${can(it) ? 'primary' : ''}" data-a="b${i}" ${can(it) ? '' : 'disabled'}>${it.sold ? 'SOLD' : `BUY ${it.price}`} ${it.sold ? '' : miscIcon('coin', 12)}</button></div>`).join('')}</div>
    <div class="panel"><button data-a="leave">LEAVE</button></div>`, acts, e => { if (e.key === 'Escape') stopDone(); });
}
function learnFlow(id: string, onDone: () => void, onCancel: () => void) {
  const r = run!;
  if (R.learnSkill(r, id)) return onDone();
  mount(`${topbar()}<div class="panel"><h2>Too many moves</h2><div class="small">You can only remember 4. Swap one for:</div><div class="card r-${SKILL[id].rarity}" style="cursor:default">${skillCard(id)}</div></div>
    <div class="cards">${r.skills.map((s, i) => `<div class="card r-${SKILL[s.id].rarity}" data-a="r${i}"><div class="tiny kind">REPLACE</div>${skillCard(s.id, s.up)}</div>`).join('')}</div>
    <div class="panel"><button data-a="cancel">KEEP MY MOVES</button></div>`,
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
  R.SHRINE_OPTIONS.forEach(o => (acts[o.id] = () => { const txt = R.shrine(r, o.id); simpleResult('Glimmerwick', txt, [], 'shrine'); }));
  const lines = GLIM[Math.min(GLIM.length - 1, Math.floor(r.depth / 2))]; const line = R.nodeRng(r, 'glim').pick(lines);
  mount(`${topbar()}${vista()}<div class="panel dark"><div class="row">${med('shrine')}<div><h2>Totem Pole Shrine</h2><div class="small muted">A festival totem, a pole topped with a pool noodle, a disco ball and a cardboard wizard face, stands alone in the dirt. It is talking.</div></div></div>
    <div class="lore glim"><span class="src">Glimmerwick</span>${esc(line)}</div>
    <div class="col" style="margin-top:10px">${R.SHRINE_OPTIONS.map(o => `<button data-a="${o.id}" style="text-align:left">${esc(o.label)}</button>`).join('')}</div></div>`, acts);
  sceneBanner(r.depth, false);
}

// Glimmerwick grows more cryptic the deeper the night goes.
const GLIM = [
  ['Hey! Lost? Everyone is lost. That is what festivals are for. Leave something, take something.', 'Remy put me here. Big guy, soft heart, terrible at knots. If you see him, tell him I am fine.'],
  ['The moon got swapped out around midnight. Nobody minds. It spins so nicely.', 'Your crew walked past an hour ago. Or they will walk past in an hour. Time is a lineup with no set times.'],
  ['Every stage is the same stage, wearing a different hat.', 'The bass is a heartbeat. Whose? Do not ask whose.'],
  ['you are looking for a set. the set is looking for a crowd. be a crowd.', 'the stages are melting because they are tired of standing still. so are you. so dance.'],
  ['one hundred twenty eight. one hundred twenty eight. you are on the one. you have always been on the one.', 'the sun is a mirrorball the size of a promise. hold out your hands. no. higher.'],
];
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
function dmgLine(b: Battle, i: number, tgt: Unit): string {
  const pv = b.skillPreview(i, tgt); if (!pv.length) return '';
  return pv.map(p => `<span class="dmgl"><b class="dn">${p.n}</b> dmg${p.hits > 1 ? ` x${p.hits}` : ''}${p.aoe ? ' to all' : ''} <span class="muted">(${p.pct}% ATK${p.flat ? ` +${p.flat}` : ''}${p.em > 1 ? ' x1.5 SUPER' : p.em < 1 ? ' x0.75 resisted' : ''})</span></span>`).join('');
}
function helpPanel(b: Battle) {
  closeHelp();
  const h = b.hero; const wheel = `<span class="el-fire">Bass</span> &gt; <span class="el-wind">Tempo</span> &gt; <span class="el-earth">Wall</span> &gt; <span class="el-water">Flow</span> &gt; <span class="el-fire">Bass</span>`;
  const ov = document.createElement('div'); ov.className = 'help-ov'; ov.innerHTML = `<div class="panel dark help">
    <div class="row"><h2>How combat works</h2><span class="grow"></span><button data-x="1">CLOSE</button></div>
    <h3>Turn order</h3><p class="small">You always move first in a fight. After that, everyone acts once per round from highest to lowest <b>SPD</b> (yours: ${h.spd}). The strip at the top shows who's next. Muffled slows a unit by 30%.</p>
    <h3>Energy &amp; Vibe</h3><p class="small"><b>Energy</b> is your HP (${h.hp}/${h.maxHp}). At 0 you crash. <b>Vibe</b> (${b.energy}/${b.maxEnergy}) pays for skills: +1 at the start of your turn, +1 when you Dance or Catch the Beat.</p>
    <h3>Your actions</h3><p class="small"><b>Dance</b>: basic attack, 100% ATK, +1 Vibe. <b>Catch the Beat</b>: take 50% less damage until your next turn, gain 3 + DEF Guard (${3 + h.def}), +1 Vibe. <b>Skills</b> cost Vibe and show their real damage against your target. <b>Hydration</b> is a free action; <b>Food</b> uses your turn.</p>
    <h3>Damage</h3><p class="small dmgf">damage = ATK x power% x Hype 1.3 / Tired 0.75 x genre (1.5 or 0.75) - target DEF <span class="muted">(min 1; crits x${b.critMult} before DEF; Catch the Beat halves it; Guard absorbs it first)</span></p>
    <p class="small">Your ATK right now: <b>${Math.round(b.atkOf(h))}</b>, DEF <b>${h.def}</b>. Enemy intents show the exact damage they will deal you.</p>
    <h3>Genre wheel</h3><p class="small">${wheel}. Hitting the genre you beat is <b>SUPER EFFECTIVE x1.5</b>; hitting the genre that beats you is <b>RESISTED x0.75</b>.</p>
    <h3>Status effects</h3><div class="small help-st">${['burn', 'bleed', 'soak', 'stun', 'shield', 'strength', 'weak', 'thorns'].map(k => `<div class="row" style="align-items:flex-start;gap:6px">${statusIcon(k, 14)}<span>${esc(statusTip(k))}</span></div>`).join('')}</div>
  </div>`;
  ov.addEventListener('click', e => { if (e.target === ov || (e.target as HTMLElement).closest('[data-x]')) closeHelp(); });
  document.body.appendChild(ov);
}
function closeHelp() { document.querySelectorAll('.help-ov').forEach(x => x.remove()); }
// ---- tooltips: hover on desktop, long-press (or tap on info-only items) on touch
const tipEl = document.createElement('div'); tipEl.className = 'tip'; document.body.appendChild(tipEl);
let tipFor: Element | null = null; let pressT = 0; let suppressClick = false; let lastTouch = 0;
function showTip(el: Element) {
  const t = el.getAttribute('data-tip'); if (!t) return; tipFor = el; tipEl.textContent = t; tipEl.style.display = 'block';
  const r = el.getBoundingClientRect(); const tw = Math.min(300, window.innerWidth - 16); tipEl.style.maxWidth = tw + 'px';
  const th = tipEl.offsetHeight; let x = r.left + r.width / 2 - tipEl.offsetWidth / 2; x = Math.max(8, Math.min(window.innerWidth - tipEl.offsetWidth - 8, x));
  let y = r.top - th - 8; if (y < 8) y = r.bottom + 8; tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
}
function hideTip() { tipFor = null; tipEl.style.display = 'none'; }
document.addEventListener('mouseover', e => { if (performance.now() - lastTouch < 1200) return; const el = (e.target as Element).closest?.('[data-tip]'); if (el && el !== tipFor) showTip(el); else if (!el && tipFor) hideTip(); });
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return; lastTouch = performance.now(); const el = (e.target as Element).closest?.('[data-tip]'); clearTimeout(pressT);
  if (!el) { hideTip(); return; }
  pressT = window.setTimeout(() => { showTip(el); suppressClick = true; }, 420);
});
document.addEventListener('pointerup', e => { clearTimeout(pressT); if (e.pointerType === 'touch') lastTouch = performance.now(); });
document.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); return; }
  const el = (e.target as Element).closest?.('[data-tip]');
  if (el && !el.closest('button') && !el.closest('[data-a]')) { if (tipFor === el) hideTip(); else showTip(el); return; }
  if (!el) hideTip();
}, true);
window.addEventListener('scroll', hideTip, true);
function intentHtml(b: Battle, u: Unit) {
  const m = u.intent; if (!m || !u.alive) return '';
  if (m.k === 'atk') { const d = b.intentDamage(u); const em = elMult(u.el, b.hero.el); const hits = m.hits ?? 1;
    const tip = `${m.name}: will hit you for ${d}${hits > 1 ? ` x${hits} (${d * hits} total)` : ''} damage. ${u.name} ATK ${Math.round(b.atkOf(u))} x ${Math.round(m.mult * 100)}%${u.st.strength ? ' x1.3 Hype' : ''}${u.st.weak ? ' x0.75 Tired' : ''}${em !== 1 ? ` x${em} ${em > 1 ? 'SUPER EFFECTIVE vs your genre' : 'resisted by your genre'}` : ''} - your DEF ${b.hero.def}.${m.status ? ' Then applies ' + statusTip(m.status[0]).split(':')[0] + ' ' + m.status[1] + '.' : ''} Catch the Beat halves it; Guard absorbs it.`;
    return `<div class="intent atk" data-tip="${esc(tip)}">${intentIcon('atk')}<b>${d}${m.hits && m.hits > 1 ? 'x' + m.hits : ''}</b>${m.status ? statusIcon(m.status[0], 12) : ''}${em > 1 ? '<i>!</i>' : ''}</div>`; }
  const ik = m.k === 'guard' ? 'guard' : m.k === 'heal' ? 'heal' : m.k === 'buff' ? 'buff' : 'debuff';
  const what = m.k === 'guard' ? 'is going to gain Guard' : m.k === 'heal' ? 'is going to heal' : m.k === 'buff' ? `is going to buff itself (${statusTip(m.status[0]).split(':')[0]})` : `is going to debuff you (${statusTip(m.status[0]).split(':')[0]})`;
  return `<div class="intent ${m.k}" data-tip="${esc(m.name + ': ' + what + '. No damage this turn.')}">${intentIcon(ik)}${m.k === 'debuff' || m.k === 'buff' ? statusIcon(m.status[0], 12) : ''}</div>`;
}
function statusHtml(u: Unit) { return Object.entries(u.st).filter(([, v]) => v).map(([k, v]) => `<span class="st" style="--sc:${STATUS_COL[k]}" data-tip="${esc(statusTip(k, v as number))}">${statusIcon(k, 14)}<b>${v}</b></span>`).join(''); }
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
      ${battleType === 'boss' ? `<div class="boss-title">DJ BOSS &middot; ${esc(b.enemies[0].name)}</div>${b.enemies[0].edef!.gimmickDesc ? `<div class="gimmick">${esc(b.enemies[0].edef!.gimmickDesc!)}</div>` : ''}` : ''}
      <div class="stage" id="stage">
        <div class="side left"><div class="unit hero" id="u0"><div class="sts"></div><div class="spr"></div><div class="plate"><div class="nm">${esc(R.heroStats(r).title)}</div><div class="hp"></div></div></div></div>
        <div class="side right">${b.enemies.map(e => `<div class="unit enemy ${e.edef!.tier} ${R.warpLevel(r.depth) >= 3 ? 'glitch' : ''}" id="u${e.uid}" data-a="t${e.uid}"><div class="intentw"></div><div class="sts"></div><div class="spr"></div><div class="plate"><div class="nm">${esc(e.name)} <span class="el-${e.el}">&#9670;</span></div><div class="hp"></div></div></div>`).join('')}</div>
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
  tb.innerHTML = `<span class="tl">TURN</span>` + b.preview(mobile ? 5 : 8).map((u, i) => `<div class="tb ${u.isHero ? 'hero' : ''} ${i === 0 ? 'now' : ''}" title="${esc(u.name)}"><img class="px" src="${(u.isHero ? heroFramesLo(run!.heroId, run!.evo) : unitFrames(u)).idle[0].toDataURL()}"></div>`).join('');
  const disabled = animating || !b.waiting || !!b.over;
  const acts = app.querySelector<HTMLElement>('#actions')!;
  const tgtU = b.enemies[target - 1]?.alive ? b.enemies[target - 1] : b.enemiesAlive()[0] ?? b.enemies[0];
  const dance = b.calc(b.hero, tgtU, 1, b.hero.el); const guardGain = 3 + b.hero.def;
  const danceTip = `DANCE (basic attack): deal ${dance.n} damage to ${tgtU.name} (100% ATK${dance.em !== 1 ? ` x${dance.em} genre` : ''} - DEF ${tgtU.def}) and gain +1 Vibe.${run!.heroId === 'bass' ? ' Rattle: also applies Feedback.' : ''}`;
  const defTip = `CATCH THE BEAT (defend): until your next turn every hit on you is halved (50% less damage). Also gain ${guardGain} Guard (3 + DEF) and +1 Vibe.`;
  acts.innerHTML = `<div class="row"><button class="help-btn" data-a="help" data-tip="How combat works">?</button><div class="energy" data-tip="${esc(KW[8][1] + ' You have ' + b.energy + '/' + b.maxEnergy + '.')}"><span class="tiny">VIBE</span> ${Array.from({ length: b.maxEnergy }, (_, i) => `<i class="${i < b.energy ? 'on' : ''}"></i>`).join('')}</div>
        ${b.freeSkills ? `<span class="tiny tag">DOUBLE-TIME: NEXT SKILL FREE</span>` : ''}<span class="grow"></span><span class="tiny muted">${battleType === 'boss' ? 'DJ BOSS &middot; ' : battleType === 'elite' ? 'ELITE &middot; ' : ''}Target: ${esc(b.enemies[target - 1]?.name ?? '')}</span></div>
      <div class="skills">${r.skills.map((s, i) => { const d = SKILL[s.id]; const cost = b.skillCost(i); const el = d.el ?? b.hero.el; return `<button class="skill r-${d.rarity}" style="--elc:${EL_COL[el]}" data-a="s${i}" ${disabled || !b.canUse(i) ? 'disabled' : ''} >
        <span class="k">${i + 1}</span><span class="row nm2"><span class="gem"></span><b>${esc(d.name)}${s.up ? '+' : ''}</b></span><span class="tiny cost">${cost < d.cost ? 'FREE' : `${cost} VIBE`} &middot; ${GENRE[el].toUpperCase()}</span>${dmgLine(b, i, tgtU)}<span class="tiny">${kwHtml(d.desc)}</span></button>`; }).join('')}</div>
      <div class="basic"><button class="primary bact" data-a="atk" ${disabled ? 'disabled' : ''} data-tip="${esc(danceTip)}"><span>DANCE <span class="kbd">A</span></span><span class="tiny sub">${dance.n} dmg &middot; +1 Vibe</span></button><button class="bact" data-a="def" ${disabled ? 'disabled' : ''} data-tip="${esc(defTip)}"><span>CATCH THE BEAT <span class="kbd">D</span></span><span class="tiny sub">-50% dmg taken &middot; +${guardGain} Guard &middot; +1 Vibe</span></button>${r.potions.map((p, i) => `<button class="pot" data-a="p${i}" ${disabled ? 'disabled' : ''} title="${esc(POTION[p].desc)}">${potIcon(p)} ${esc(POTION[p].name)}${POTION[p].kind === 'food' ? ' <span class="kbd">TURN</span>' : ''}</button>`).join('')}<span class="grow"></span><span class="tiny muted hide-sm">Tap an enemy to target. Hover / long-press anything for details.</span></div>
      <div class="log" id="log"></div>`;
  bindIn(acts, {
    atk: () => act({ kind: 'basic', target }), def: () => act({ kind: 'defend' }), help: () => helpPanel(b),
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
function lunge(uid: number) { if (uid === 0) sprites.get(0)?.express('shout', 420); const el = app.querySelector(`#u${uid} .spr`); if (!el) return; const c = uid === 0 ? 'lunge-r' : 'lunge-l'; el.classList.remove(c); void (el as HTMLElement).offsetWidth; el.classList.add(c); }
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
        const u = b.unit(e.uid); const l = logEl(); if (l) l.textContent = `${u.isHero ? 'You' : u.name}: ${e.name}`; if (!u.isHero && e.name.startsWith('Remix')) sfx.crit(); showBanner(`${u.isHero ? '' : u.name + ': '}${e.name}`, u.isHero);
        const pt = unitPt(e.uid);
        if (u.isHero) {
          const a = lastHeroAct; let el: El = b.hero.el; let hasDmg = a?.kind === 'basic';
          if (a?.kind === 'skill') { const sd = SKILL[run!.skills[a.i]?.id]; if (sd) { el = sd.el ?? b.hero.el; hasDmg = sd.fx.some(f => f.t === 'dmg'); } }
          lastSrcEl = el;
          if (a?.kind === 'skill') sprites.get(0)?.express('shout', 480);
          if (a?.kind === 'skill' || a?.kind === 'potion') { scene!.castColor = EL_COL[el]; scene!.burst('cast', pt.x, pt.y); sfx.shield(); }
          if (hasDmg) lunge(0);
          lastHeroAct = a?.kind === 'potion' ? null : a;
        } else {
          lastSrcEl = u.el; const k = moveKind(u, e.name);
          if (k === 'atk') lunge(e.uid); else { scene!.castColor = { buff: '#ff6ad8', guard: '#ffcf3a', heal: '#3ae8ff', debuff: '#c86aff' }[k] ?? '#fff'; scene!.burst('cast', pt.x, pt.y); }
        }
        await wait(d * 0.9); break;
      }
      case 'dmg': {
        const pt = unitPt(e.uid); sprites.get(e.uid)?.flash(); if (e.uid === 0 && e.n > 0) setTimeout(() => sprites.get(0)?.express('hurt', 520), 120);
        const nextText = evs[i + 1]?.k === 'text' ? (evs[i + 1] as any).s : '';
        if (e.src !== undefined) { const el = e.src === 0 ? lastSrcEl : b.unit(e.src).el; scene!.burst(el === 'none' ? 'hit' : el, pt.x, pt.y); scene!.burst('hit', pt.x, pt.y); }
        else if (nextText === 'Feedback') { scene!.burst('fire', pt.x, pt.y, 8); pendingDot = 'burn'; }
        else if (nextText === 'Drain') { scene!.castColor = '#b8ff3a'; scene!.burst('status', pt.x, pt.y); pendingDot = 'bleed'; }
        else scene!.burst('hit', pt.x, pt.y);
        popNum(e.uid, e.n ? `${e.n}` : '0', e.crit ? 'crit' : pendingDot ? 'dot ' + pendingDot : e.uid === 0 ? 'hurt' : 'dmg'); pendingDot = '';
        const tags: string[] = []; if (e.crit) tags.push(`CRIT x${b.critMult}`); if (e.eff === 'super') tags.push('SUPER EFFECTIVE x1.5'); else if (e.eff === 'weak') tags.push('RESISTED x0.75');
        if (e.def) tags.push('CAUGHT THE BEAT x0.5');
        if (tags.length) popNum(e.uid, tags.join(' · '), 'txt breakdown' + (e.eff === 'super' || e.crit ? ' super' : ''));
        if (e.crit) { scene!.flash = 5; shake(true); sfx.crit(); } else { if (e.n) shake(false); sfx.hit(); }
        updUnit(e.uid); await wait(d * 0.8); break;
      }
      case 'heal': { const pt = unitPt(e.uid); scene!.burst('heal', pt.x, pt.y); popNum(e.uid, `+${e.n}`, 'heal'); sfx.heal(); updUnit(e.uid); await wait(d * 0.5); break; }
      case 'status': { const pt = unitPt(e.uid); if (e.key === 'shield') { scene!.burst('shield', pt.x, pt.y); sfx.shield(); } else { scene!.castColor = STATUS_COL[e.key]; scene!.burst('status', pt.x, pt.y); sfx.status(); } popNum(e.uid, `${STATUS_ABBR[e.key]} +${e.n}`, 'txt st-' + e.key); updUnit(e.uid); await wait(d * 0.4); break; }
      case 'text': if (e.s !== 'Feedback' && e.s !== 'Drain') popNum(e.uid, e.s, 'txt'); await wait(d * 0.3); break;
      case 'die': { const pt = unitPt(e.uid); scene!.burst('death', pt.x, pt.y); const el = app.querySelector(`#u${e.uid}`); el?.classList.add('dying'); sfx.die(); await wait(d * 1.4); el?.classList.add('dead'); break; }
      case 'phase': { const u = b.unit(e.uid); sprites.get(e.uid)?.set(enemyFrames(u.edef!.id, 2)); sprites.get(e.uid)?.flash(); scene!.flash = 6; shake(true); showBanner(e.s, false, true); if (e.s === 'THE DROP!') sfx.drop(); else sfx.boss(); const pt = unitPt(e.uid); scene!.castColor = '#ff3ec8'; scene!.burst('cast', pt.x, pt.y); scene!.burst('fire', pt.x, pt.y, 24); await wait(d * 3); break; }
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
  const card = (o: R.Reward) => o.kind === 'relic' ? `<div class="tiny kind">GEAR</div><div class="row"><b>${esc(RELIC[o.id].name)}</b><span class="grow"></span>${rar(o.rarity)}</div><div class="small">${esc(RELIC[o.id].desc)}</div>`
    : o.kind === 'upgrade' ? `<div class="tiny kind">PRACTISE</div>${skillCard(r.skills[o.idx].id, true)}` : `<div class="tiny kind">NEW MOVE</div>${skillCard(o.id)}`;
  const acts: Record<string, () => void> = { ...baseActs, skip: () => { r.gold += 15; sfx.coin(); after(); } };
  rw.options.forEach((o, i) => (acts['o' + i] = () => {
    if (o.kind === 'skill') return learnFlow(o.id, after, () => rewardScreen({ gold: 0, options: rw.options }, lastWords));
    R.applyReward(r, o); sfx.coin(); after();
  }));
  mount(`${topbar()}<div class="panel dark center"><h2 class="victory">${boss ? 'DJ DEFEATED' : 'VIBE RESTORED'}</h2><div class="small">${rw.gold ? `${miscIcon('coin', 14)} +${rw.gold} glowsticks. ` : ''}Choose one reward, or skip for 15 glowsticks.</div>
    ${lastWords ? `<div class="lore"><span class="src">Last words</span>"${esc(lastWords)}"</div>` : ''}</div>
    <div class="cards rewards">${rw.options.map((o, i) => `<div class="card reward r-${o.rarity}" data-a="o${i}" style="animation-delay:${i * 90}ms"><span class="kbd corner">${i + 1}</span>${card(o)}</div>`).join('')}</div>
    <div class="panel center"><button data-a="skip">SKIP (+15 GLOWSTICKS)</button></div>`, acts,
    e => { const k = parseInt(e.key); if (k >= 1 && k <= rw.options.length) acts['o' + (k - 1)](); if (e.key === 's' || e.key === 'S') acts.skip(); });
}
function bossCleared() {
  const r = run!; const { evolved } = R.nextRegion(r); saveMeta(meta);
  if (!evolved) return regionIntro();
  sfx.evolve(); const h = R.heroDef(r); const ev = h.evo[r.evo];
  mount(`${topbar()}<div class="panel dark center evo"><div class="small muted">YOU LEVELLED UP YOUR SOUND</div><h2 class="victory">${esc(ev.title)}</h2><div id="evo_h" class="row" style="justify-content:center;gap:30px;margin:14px 0;align-items:flex-end"></div>
    <p class="small">+${ev.hp - h.evo[r.evo - 1].hp} Energy, +${ev.atk - h.evo[r.evo - 1].atk} ATK, +${ev.def - h.evo[r.evo - 1].def} DEF, +${ev.spd - h.evo[r.evo - 1].spd} SPD</p>
    <p class="small"><b>${esc(ev.passiveDesc)}</b></p><button class="primary" data-a="go">CONTINUE</button></div>`, { ...baseActs, go: regionIntro });
  const box = app.querySelector('#evo_h')!; box.appendChild(animSprite(heroFrames(h.id, r.evo - 1), 2).el); const arrow = document.createElement('span'); arrow.className = 'evo-arrow'; arrow.textContent = '>>'; box.appendChild(arrow); box.appendChild(animSprite(heroFrames(h.id, r.evo), 3).el);
}

// ---------- Summary / meta / journal ----------
function summary() {
  const r = run!; const dist = R.distance(r); const embers = R.embersFor(r);
  meta.embers += embers; meta.journeys++; meta.totalDistance += dist; meta.best[r.heroId] = Math.max(meta.best[r.heroId] ?? 0, dist); saveMeta(meta);
  const lore = r.lore.map(id => LORE.find(l => l.id === id)!).filter(Boolean);
  const wake = r.depth >= 3 ? 'Back Home' : 'the Medical Tent';
  const wakeLine = r.depth >= 3 ? 'You wake up on your own couch, still wearing your wristband. Your phone buzzes: "next year. same crew. promise."' : 'You wake up under a foil blanket with a cup of water in your hand. A volunteer gives you a thumbs up. "Rest. Then go find them."';
  mount(`<div class="vista"><canvas class="scene px"></canvas><div class="vista-title"><div class="small">YOU CRASHED</div><h1 class="victory">DEPTH ${dist}</h1></div></div>
    <div class="panel dark center">
      <div class="small">${esc(R.heroStats(r).title)} ran out of Energy at ${esc(R.regionName(r.depth))}, stop ${r.stop}, and woke up in ${wake}.</div>
      <p class="small muted">${esc(wakeLine)}</p>
      <div class="small">Stages cleared: ${r.depth} &middot; Drained revived: ${r.kills} &middot; Seed: <b class="seed">${esc(r.seed)}</b></div>
      <h2 style="margin-top:14px">${miscIcon('ember', 20)} +${embers} AFTERGLOW</h2><div class="small muted">Best with this hero: ${meta.best[r.heroId]}</div></div>
    <div class="panel"><h3>Build</h3><div class="small">${r.skills.map(skillLine).join(' / ')}</div><div style="margin-top:6px">${relicChips(r.relics) || '<span class="tiny muted">No gear</span>'}</div>
      <h3 style="margin-top:12px">Fragments found (${lore.length})</h3>${lore.map(loreHtmlOf).join('') || '<div class="small muted">Nothing this time. THE SET is patient.</div>'}</div>
    <div class="panel row"><button class="primary" data-a="again">ONE MORE NIGHT</button><button data-a="replay">REPLAY SEED</button><button data-a="meta">SPEND AFTERGLOW</button><button data-a="journal">JOURNAL</button><button data-a="title">TITLE</button></div>`,
    { again: heroSelect, replay: () => startRun(r.heroId, r.seed), meta: metaScreen, journal: () => journalScreen(titleScreen), title: titleScreen });
  sceneBanner(r.depth, false);
  if (scene) scene.walker = undefined;
  run = null;
}
function metaScreen() {
  mount(`<div class="panel dark"><div class="row">${miscIcon('ember', 32)}<div><h2>Afterglow: ${meta.embers}</h2><div class="small muted">What you carry home from every night. It carries over between runs.</div></div></div></div>
    <div class="cards">${UPGRADES.map(u => { const c = u.cost(meta); const owned = c === null; return `<div class="card ${owned ? 'r-rare' : 'r-common'}" style="cursor:default"><b>${esc(u.name)}</b><div class="small">${esc(u.desc)}</div><div class="tiny muted">${u.owned(meta)}</div><div class="grow"></div>
      <button class="${!owned && meta.embers >= c! ? 'primary' : ''}" data-a="u_${u.id}" ${owned || meta.embers < c! ? 'disabled' : ''}>${owned ? 'MAXED' : `BUY ${c}`}</button></div>`; }).join('')}</div>
    <div class="panel"><button data-a="back">BACK</button></div>`,
    { back: titleScreen, ...Object.fromEntries(UPGRADES.map(u => ['u_' + u.id, () => { const c = u.cost(meta); if (c === null || meta.embers < c) return; meta.embers -= c; u.buy(meta); saveMeta(meta); sfx.evolve(); metaScreen(); }])) },
    e => { if (e.key === 'Escape') titleScreen(); });
}
function journalScreen(back: () => void = titleScreen) {
  const bosses = Object.values(ENEMY).filter(e => e.tier === 'boss');
  mount(`<div class="panel dark"><h2>Journal</h2><div class="small">Nights: ${meta.journeys} &middot; Total depth: ${meta.totalDistance} &middot; Fragments: ${meta.lore.length}/${LORE.length}</div>
      <div class="row journal-heroes">${HEROES.map(h => `<div class="jh"><div class="jspr" id="jh_${h.id}"></div><div class="tiny">${esc(h.name)}</div><div class="tiny muted">Best ${meta.best[h.id] ?? 0}</div></div>`).join('')}</div></div>
    <div class="panel"><h3>Fragments of THE SET</h3>${LORE.map(l => meta.lore.includes(l.id) ? loreHtmlOf(l) : `<div class="lore muted"><span class="src">???</span>Not yet found.</div>`).join('')}
      <h3 style="margin-top:12px">Last words of the DJs</h3>${bosses.map(b => meta.bossWords.includes(b.id) ? `<div class="lore"><span class="src">${esc(b.name)}</span>"${esc(b.lastWords ?? '')}"</div>` : `<div class="lore muted"><span class="src">???</span>Unheard.</div>`).join('')}</div>
    <div class="panel"><button data-a="back">BACK</button></div>`, { back }, e => { if (e.key === 'Escape') back(); });
  HEROES.forEach(h => { const locked = h.locked && !meta.unlocked.includes(h.id); const c = heroStatic(h.id, 1); if (locked) c.style.filter = 'brightness(0)'; put('#jh_' + h.id, c); });
}

if (location.search.includes('gallery')) import('./gallery').then(m => m.gallery(app)); else titleScreen();
void mix;
// Debug hooks for automated screenshots/tests.
(window as any).__sfs = { get run() { return run; }, get battle() { return battle; }, startRun, mapScreen, startBattle, enterNode, R };
