import type { OwnedSkill, Rarity, RelicDef, SkillDef, EnemyDef } from '../types';
import { HEROES } from '../data/heroes';
import { SKILLS, SKILL, STARTERS } from '../data/skills';
import { RELICS, RELIC } from '../data/relics';
import { POTIONS } from '../data/potions';
import { ENEMY, ENEMIES } from '../data/enemies';
import { REGIONS, FURTHER_MODIFIERS, SUNRISE_DEPTH } from '../data/regions';
import { EVENTS } from '../data/events';
import { LORE } from '../data/lore';
import { RNG, hashStr } from './rng';
import type { Meta } from './meta';

export type NodeType = 'battle' | 'elite' | 'campfire' | 'merchant' | 'event' | 'treasure' | 'shrine' | 'boss';
export interface MapNode { col: number; row: number; type: NodeType; next: number[]; y: number }
export interface Run {
  seed: string; heroId: string; evo: number; maxHp: number; hp: number; atkBonus: number; defBonus: number; gold: number;
  skills: OwnedSkill[]; relics: string[]; potions: string[]; depth: number; stop: number; map: MapNode[][]; pos: { col: number; row: number } | null;
  lore: string[]; kills: number; energyBonus?: number; bosses: number; relicPool: string[]; mods: string[]; over: boolean; history: string[];
}
export const STOPS = 10; // per region, last is boss
export const MAX_SKILLS = 4;
export const MAX_POTIONS = 3;

export function region(depth: number) { return REGIONS[depth % REGIONS.length]; }
export function regionName(depth: number) { const r = region(depth); const loop = Math.floor(depth / REGIONS.length); if (depth === SUNRISE_DEPTH) return 'Sunrise Set'; return loop ? `Afterhours ${toRoman(loop)}: ${r.name}` : r.name; }
/** 0 = normal night, 1 = disco-ball moon, 2 = melting stages, 3 = glitching Drained. */
export function warpLevel(depth: number) { return depth >= 5 ? 3 : depth >= 4 ? 2 : depth >= 2 ? 1 : 0; }
/** Water Station: top up with a free Water Bottle if there is room. */
export function refillHydration(r: Run): boolean { if (r.potions.length >= MAX_POTIONS) return false; r.potions.push('water'); return true; }
function toRoman(n: number) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n); }
export function distance(r: Run) { return r.depth * STOPS + r.stop; }
export function nodeRng(r: Run, tag: string, col = r.pos?.col ?? -1, row = r.pos?.row ?? -1) { return new RNG(hashStr(`${r.seed}|${r.depth}|${col}|${row}|${tag}`)); }

export function relicMod(r: Run, key: keyof NonNullable<RelicDef['mods']>): number {
  let t = 0; for (const id of r.relics) t += (RELIC[id]?.mods?.[key] as number) ?? 0; return t;
}
export function heroDef(r: Run) { return HEROES.find(h => h.id === r.heroId)!; }
export function heroStats(r: Run) {
  const h = heroDef(r); const ev = h.evo[r.evo];
  return {
    name: h.name, title: ev.title, el: h.el,
    atk: h.atk + ev.atk + r.atkBonus, def: h.def + ev.def + r.defBonus + relicMod(r, 'defFlat'), spd: h.spd + ev.spd + relicMod(r, 'spd'),
    energy: h.energy + relicMod(r, 'energyMax') + (r.energyBonus ?? 0), crit: h.crit + relicMod(r, 'crit'),
  };
}

export function newRun(heroId: string, seed: string, meta: Meta): Run {
  const h = HEROES.find(x => x.id === heroId)!;
  const relicPool = RELICS.filter(x => !x.meta || meta.relics.includes(x.id)).map(x => x.id);
  const r: Run = {
    seed, heroId, evo: 0, maxHp: h.hp + meta.perks.hp * 6, hp: 0, atkBonus: 0, defBonus: 0, gold: 40 + meta.perks.gold * 20,
    skills: h.skills.map(id => ({ id, up: false })), relics: [], potions: meta.perks.satchel ? ['water', 'water'] : ['water'],
    depth: 0, stop: 0, map: [], pos: null, lore: [], kills: 0, bosses: 0, relicPool, mods: [], over: false, history: [],
  };
  r.energyBonus = meta.perks.insight ? 1 : 0;
  r.hp = r.maxHp;
  r.map = genMap(r);
  return r;
}

export function genMap(r: Run): MapNode[][] {
  const rng = new RNG(hashStr(`${r.seed}|map|${r.depth}`));
  const cols: MapNode[][] = [];
  for (let c = 0; c < STOPS; c++) {
    const n = c === STOPS - 1 ? 1 : c === 0 ? 3 : rng.int(2, 4);
    const col: MapNode[] = [];
    for (let i = 0; i < n; i++) {
      let type: NodeType;
      if (c === STOPS - 1) type = 'boss';
      else if (c === 0) type = 'battle';
      else if (c === STOPS - 2) type = 'campfire';
      else if (c === 5 && i === 0) type = 'treasure';
      else type = rng.weighted<NodeType>([['battle', 40], ['event', 18], ['elite', c >= 3 ? 12 : 0], ['campfire', c >= 3 ? 9 : 0], ['merchant', c >= 2 ? 10 : 0], ['shrine', 6], ['treasure', 4]]);
      col.push({ col: c, row: i, type, next: [], y: n === 1 ? 0.5 : 0.12 + (0.76 * i) / (n - 1) });
    }
    cols.push(col);
  }
  for (let c = 0; c < STOPS - 1; c++) {
    const a = cols[c], b = cols[c + 1];
    for (const node of a) {
      let best = 0; b.forEach((m, j) => { if (Math.abs(m.y - node.y) < Math.abs(b[best].y - node.y)) best = j; });
      node.next.push(best);
      const alt = best + (rng.chance(0.5) ? 1 : -1);
      if (alt >= 0 && alt < b.length && rng.chance(0.55)) node.next.push(alt);
    }
    b.forEach((m, j) => { if (!a.some(n => n.next.includes(j))) { let best = 0; a.forEach((n, i) => { if (Math.abs(n.y - m.y) < Math.abs(a[best].y - m.y)) best = i; }); a[best].next.push(j); } });
    a.forEach(n => n.next.sort());
  }
  // Region modifier in Further Lands
  r.mods = [];
  if (r.depth >= REGIONS.length) { const loop = Math.floor(r.depth / REGIONS.length); const ms = rng.shuffle(FURTHER_MODIFIERS); r.mods = ms.slice(0, Math.min(loop, ms.length)).map(m => m.id); }
  return cols;
}
export function reachable(r: Run): MapNode[] {
  if (!r.pos) return r.map[0];
  const cur = r.map[r.pos.col][r.pos.row]; const nxt = r.map[r.pos.col + 1]; if (!nxt) return [];
  return cur.next.map(i => nxt[i]);
}

export function encounter(r: Run, type: NodeType): EnemyDef[] {
  const rng = nodeRng(r, 'enc'); const reg = region(r.depth);
  if (type === 'boss') return [ENEMY[reg.boss]];
  if (type === 'elite') { const e = rng.chance(0.5) ? ENEMY[reg.elite] : rng.pick(ENEMIES.filter(x => x.tier === 'elite')); const out = [e]; if (r.depth >= 2) out.push(ENEMY[rng.pick(reg.enemyIds)]); return out; }
  const col = r.pos?.col ?? 0;
  const n = col === 0 && r.depth === 0 ? 1 : rng.weighted([[1, 2], [2, 5], [3, col >= 4 ? 3 : 1]]);
  return Array.from({ length: n }, () => ENEMY[rng.pick(reg.enemyIds)]);
}

// ---------- Rewards ----------
export type Reward = { kind: 'skill'; id: string; rarity: Rarity } | { kind: 'upgrade'; idx: number; rarity: Rarity } | { kind: 'relic'; id: string; rarity: Rarity };
function rollRarity(rng: RNG, boost = 0): Rarity { const x = rng.next() - boost; return x < 0.1 ? 'epic' : x < 0.4 ? 'rare' : 'common'; }
export function availableSkills(r: Run): SkillDef[] { const owned = new Set(r.skills.map(s => s.id)); return SKILLS.filter(s => !owned.has(s.id) && !STARTERS.has(s.id)); }
export function availableRelics(r: Run) { return r.relicPool.filter(id => !r.relics.includes(id)).map(id => RELIC[id]); }
export function pickSkill(r: Run, rng: RNG, rarity: Rarity): SkillDef | null {
  const pool = availableSkills(r); if (!pool.length) return null;
  const h = heroDef(r);
  const tier = pool.filter(s => s.rarity === rarity); const src = tier.length ? tier : pool;
  // Prefer own element / neutral skills
  const weighted: [SkillDef, number][] = src.map(s => [s, s.el === h.el || s.el === 'none' ? 3 : 1]);
  return rng.weighted(weighted);
}
export function pickRelic(r: Run, rng: RNG, rarity: Rarity) {
  const pool = availableRelics(r); if (!pool.length) return null;
  const tier = pool.filter(x => x.rarity === rarity); return rng.pick(tier.length ? tier : pool);
}
export function genRewards(r: Run, type: NodeType): { gold: number; options: Reward[] } {
  const rng = nodeRng(r, 'reward');
  const g = type === 'boss' ? rng.int(80, 100) : type === 'elite' ? rng.int(40, 55) : rng.int(14, 24);
  const gold = Math.round(g * (1 + relicMod(r, 'goldPct')));
  const options: Reward[] = []; const used = new Set<string>();
  const boost = type === 'boss' ? 0.3 : type === 'elite' ? 0.15 : 0;
  const forceRelic = type === 'elite' || type === 'boss';
  for (let i = 0; i < 3 && options.length < 3; i++) {
    const rar = rollRarity(rng, boost);
    const kind = i === 0 && forceRelic ? 'relic' : rng.weighted<'skill' | 'upgrade' | 'relic'>([['skill', 5], ['upgrade', r.skills.some(s => !s.up) ? 3 : 0], ['relic', forceRelic ? 3 : 1.2]]);
    if (kind === 'relic') { const x = pickRelic(r, rng, rar); if (x && !used.has(x.id)) { used.add(x.id); options.push({ kind: 'relic', id: x.id, rarity: x.rarity }); continue; } }
    if (kind === 'upgrade') { const cand = r.skills.map((s, idx) => ({ s, idx })).filter(o => !o.s.up && !used.has('u' + o.idx)); if (cand.length) { const c = rng.pick(cand); used.add('u' + c.idx); options.push({ kind: 'upgrade', idx: c.idx, rarity: SKILL[c.s.id].rarity }); continue; } }
    for (let t = 0; t < 6; t++) { const s = pickSkill(r, rng, rar); if (s && !used.has(s.id)) { used.add(s.id); options.push({ kind: 'skill', id: s.id, rarity: s.rarity }); break; } }
  }
  return { gold, options };
}
export function gainRelic(r: Run, id: string) {
  if (r.relics.includes(id)) return;
  r.relics.push(id); const m = RELIC[id].mods;
  if (m?.hpMax) { r.maxHp += m.hpMax; r.hp += m.hpMax; }
}
/** Adds a skill; returns false if a replacement is needed (caller passes replaceIdx). */
export function learnSkill(r: Run, id: string, replaceIdx?: number): boolean {
  if (r.skills.length < MAX_SKILLS) { r.skills.push({ id, up: false }); return true; }
  if (replaceIdx === undefined) return false;
  r.skills[replaceIdx] = { id, up: false }; return true;
}
export function applyReward(r: Run, rw: Reward, replaceIdx?: number): boolean {
  if (rw.kind === 'relic') { gainRelic(r, rw.id); return true; }
  if (rw.kind === 'upgrade') { r.skills[rw.idx].up = true; return true; }
  return learnSkill(r, rw.id, replaceIdx);
}
export function healPct(r: Run, pct: number) { r.hp = Math.min(r.maxHp, r.hp + Math.round(r.maxHp * pct)); }

export function unseenLore(r: Run, meta: Meta, rng: RNG, src?: string) {
  const pool = LORE.filter(l => !r.lore.includes(l.id) && (src !== 'further' || l.src === 'Afterhours'));
  const unseenMeta = pool.filter(l => !meta.lore.includes(l.id));
  const p = unseenMeta.length ? unseenMeta : pool.length ? pool : LORE;
  const l = rng.pick(p); if (!r.lore.includes(l.id)) r.lore.push(l.id);
  if (!meta.lore.includes(l.id)) meta.lore.push(l.id);
  return l;
}
export function pickEvent(r: Run) { return nodeRng(r, 'event').pick(EVENTS); }

// ---------- Merchant ----------
export interface ShopItem { kind: 'skill' | 'relic' | 'potion' | 'upgrade'; id: string; price: number; sold?: boolean }
export const PRICES = { skill: { common: 45, rare: 75, epic: 115 }, relic: { common: 80, rare: 125, epic: 180 } };
export function genShop(r: Run): ShopItem[] {
  const rng = nodeRng(r, 'shop'); const items: ShopItem[] = []; const used = new Set<string>();
  for (let i = 0; i < 3; i++) { const s = pickSkill(r, rng, rollRarity(rng, 0.1)); if (s && !used.has(s.id)) { used.add(s.id); items.push({ kind: 'skill', id: s.id, price: PRICES.skill[s.rarity] }); } }
  for (let i = 0; i < 2; i++) { const x = pickRelic(r, rng, rollRarity(rng, 0.1)); if (x && !used.has(x.id)) { used.add(x.id); items.push({ kind: 'relic', id: x.id, price: PRICES.relic[x.rarity] }); } }
  for (const p of rng.shuffle(POTIONS).slice(0, 2)) items.push({ kind: 'potion', id: p.id, price: p.price });
  items.push({ kind: 'upgrade', id: 'upgrade', price: 60 });
  return items;
}

/** Called after boss defeat: advances region, evolves hero. */
export function nextRegion(r: Run): { evolved: boolean } {
  r.depth++; r.stop = 0; r.pos = null; r.bosses++;
  let evolved = false;
  const target = r.bosses >= 3 ? 2 : r.bosses >= 1 ? 1 : 0;
  if (target > r.evo) {
    const h = heroDef(r); const before = h.evo[r.evo], after = h.evo[target];
    r.maxHp += after.hp - before.hp; r.hp += after.hp - before.hp; r.evo = target; evolved = true;
  }
  healPct(r, 0.4);
  r.map = genMap(r);
  return { evolved };
}
export function embersFor(r: Run) { return Math.floor(distance(r) * 1.5) + r.bosses * 6; }

/** Sync run state after a won battle. */
export function finishBattle(r: Run, heroHp: number, kills: number) {
  r.hp = Math.max(1, heroHp); r.kills += kills;
  healPct(r, 0.08 + relicMod(r, 'healPct')); // catch your breath
}

// ---------- Events / Shrine / Treasure (shared by UI and simulation) ----------
import type { EventChoice } from '../types';
export interface EventOutcome { text: string; fight: boolean; pendingSkill?: string; extra: string[] }
export function resolveEvent(r: Run, meta: Meta, choice: EventChoice): EventOutcome {
  const rng = nodeRng(r, 'eventres');
  const ok = choice.chance === undefined || rng.chance(choice.chance);
  const fx = ok ? choice.fx : choice.failFx ?? {};
  const out: EventOutcome = { text: ok ? choice.result : choice.fail ?? '', fight: !!fx.fight, extra: [] };
  if (fx.gold) { r.gold = Math.max(0, r.gold + fx.gold); out.extra.push(`${fx.gold > 0 ? '+' : ''}${fx.gold} glowsticks`); }
  if (fx.maxHp) { r.maxHp += fx.maxHp; r.hp += fx.maxHp; out.extra.push(`+${fx.maxHp} max Energy`); }
  if (fx.hpPct) { const d = Math.round(r.maxHp * fx.hpPct); r.hp = Math.max(1, Math.min(r.maxHp, r.hp + d)); out.extra.push(`${d > 0 ? '+' : ''}${d} Energy`); }
  if (fx.atk) { r.atkBonus += fx.atk; out.extra.push(`+${fx.atk} ATK`); }
  if (fx.relic) { const x = pickRelic(r, rng, rng.chance(0.3) ? 'rare' : 'common'); if (x) { gainRelic(r, x.id); out.extra.push(`Gear: ${x.name}`); } }
  if (fx.potion && r.potions.length < MAX_POTIONS) { const p = rng.pick(POTIONS); r.potions.push(p.id); out.extra.push(`Item: ${p.name}`); }
  if (fx.upgrade) { const c = r.skills.map((s, i) => ({ s, i })).filter(o => !o.s.up); if (c.length) { const o = rng.pick(c); o.s.up = true; out.extra.push(`Upgraded ${SKILL[o.s.id].name}`); } }
  if (fx.skill) { const s = pickSkill(r, rng, rng.chance(0.35) ? 'rare' : 'common'); if (s) out.pendingSkill = s.id; }
  if (fx.lore) { const l = unseenLore(r, meta, rng); out.extra.push(`Lore: "${l.text}"`); }
  return out;
}
export function treasure(r: Run): string[] {
  const rng = nodeRng(r, 'treasure'); const g = rng.int(35, 65); r.gold += g; const out = [`+${g} glowsticks`];
  const x = pickRelic(r, rng, rng.chance(0.25) ? 'rare' : 'common'); if (x) { gainRelic(r, x.id); out.push(`Gear: ${x.name}`); }
  return out;
}
export const SHRINE_OPTIONS = [
  { id: 'blood', label: 'Give your Energy (-25% now): +2 ATK forever' },
  { id: 'gold', label: 'Offer 50 glowsticks: receive Rare gear' },
  { id: 'faith', label: 'Give 10% max Energy forever: +1 DEF, +1 max Vibe' },
  { id: 'leave', label: 'Wave at the totem and leave' },
];
export function shrine(r: Run, id: string): string {
  const rng = nodeRng(r, 'shrine');
  if (id === 'blood') { if (r.hp <= r.maxHp * 0.25) return 'You are too tired to give any more. Glimmerwick pats you with a noodle.'; r.hp -= Math.round(r.maxHp * 0.25); r.atkBonus += 2; return 'The disco ball drinks your light and gives it back brighter. +2 ATK.'; }
  if (id === 'gold') { if (r.gold < 50) return 'Your glowstick stash is too light.'; const x = pickRelic(r, rng, 'rare'); if (!x) return 'The totem has nothing left to give.'; r.gold -= 50; gainRelic(r, x.id); return `Something drops out of the pool noodle: ${x.name}.`; }
  if (id === 'faith') { const loss = Math.round(r.maxHp * 0.1); r.maxHp -= loss; r.hp = Math.min(r.hp, r.maxHp); r.defBonus += 1; r.energyBonus = (r.energyBonus ?? 0) + 1; return `-${loss} max Energy. +1 DEF, +1 max Vibe.`; }
  return 'You wave. The disco ball turns, very slightly, to watch you go.';
}
