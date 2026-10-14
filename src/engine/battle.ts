import type { Element, EnemyDef, Effect, Move, StatusKey, SkillDef } from '../types';
import { SKILL } from '../data/skills';
import { POTION } from '../data/potions';
import { RELIC } from '../data/relics';
import { RNG } from './rng';
import type { Run } from './run';
import { heroStats, relicMod } from './run';

export interface Unit {
  uid: number; name: string; el: Element; maxHp: number; hp: number; atk: number; def: number; spd: number;
  st: Partial<Record<StatusKey, number>>; isHero: boolean; edef?: EnemyDef; intent?: Move; lastMove?: string; phase: number; defending?: boolean; alive: boolean;
}
export type BEvent =
  | { k: 'dmg'; uid: number; n: number; hp: number; crit?: boolean; eff?: 'super' | 'weak'; src?: number }
  | { k: 'heal'; uid: number; n: number; hp: number }
  | { k: 'status'; uid: number; key: StatusKey; n: number }
  | { k: 'act'; uid: number; name: string }
  | { k: 'text'; uid: number; s: string }
  | { k: 'die'; uid: number }
  | { k: 'phase'; uid: number; s: string }
  | { k: 'turn'; uid: number };

export type Action = { kind: 'skill'; i: number; target: number } | { kind: 'basic'; target: number } | { kind: 'defend' } | { kind: 'potion'; i: number; target: number };

const BEATS: Record<string, Element> = { fire: 'wind', wind: 'earth', earth: 'water', water: 'fire' };
export function elMult(a: Element, d: Element): number {
  if (a === 'none' || d === 'none') return 1;
  if (BEATS[a] === d) return 1.5;
  if (BEATS[d] === a) return 0.75;
  return 1;
}

export class Battle {
  hero: Unit; enemies: Unit[]; order: Unit[] = []; idx = 0; round = 0;
  energy = 3; maxEnergy: number; freeSkills = 0; skillCount = 0;
  events: BEvent[] = []; waiting = false; over: 'win' | 'lose' | null = null;
  rng: RNG; crit: number; critMult: number; burnBonus: number; bleedBonus: number; atkPct: number;
  kills = 0; turns = 0; called = false; lastSkill: { id: string; up: boolean } | null = null; mirrorTick = 0;
  constructor(public run: Run, defs: EnemyDef[], public depth: number, seed: number, public mods: string[] = []) {
    this.rng = new RNG(seed);
    const hs = heroStats(run);
    this.hero = { uid: 0, name: hs.name, el: hs.el, maxHp: run.maxHp, hp: run.hp, atk: hs.atk, def: hs.def, spd: hs.spd, st: {}, isHero: true, phase: 1, alive: true };
    this.maxEnergy = hs.energy; this.crit = hs.crit; this.critMult = 1.6 + relicMod(run, 'critMult');
    this.burnBonus = relicMod(run, 'burnBonus') + (run.heroId === 'bass' && run.evo >= 2 ? 1 : 0);
    this.bleedBonus = relicMod(run, 'bleedBonus'); this.atkPct = relicMod(run, 'atkPct');
    const loop = Math.floor(depth / 7);
    const hpM = (1 + 0.24 * depth + 0.035 * depth * depth) * (mods.includes('thick') ? 1.2 : 1);
    const atkM = 1 + 0.1 * depth + 0.014 * depth * depth;
    this.enemies = defs.map((d, i) => ({
      uid: i + 1, name: d.name, el: d.el, maxHp: Math.round(d.hp * hpM), hp: Math.round(d.hp * hpM), atk: Math.round(d.atk * atkM), def: d.def + loop * 2,
      spd: d.spd + Math.floor(depth / 3) + (mods.includes('swift') ? 3 : 0), st: {}, isHero: false, edef: d, phase: 1, alive: true,
    }));
  }
  emit(e: BEvent) { this.events.push(e); }
  enemiesAlive() { return this.enemies.filter(e => e.alive); }
  unit(uid: number) { return uid === 0 ? this.hero : this.enemies[uid - 1]; }
  effSpd(u: Unit) { return u.spd * ((u.st.soak ?? 0) > 0 ? 0.7 : 1); }
  ctx(extra: any = {}) { return { b: this, ...extra }; }
  relicHook(name: 'onFightStart' | 'onTurnStart' | 'onKill' | 'onSkill', extra: any = {}) { for (const r of this.run.relics) { const f = RELIC[r]?.[name]; if (f) f(this.ctx(extra)); } }

  start() {
    const h = this.hero; const evo = this.run.evo;
    if (this.run.heroId === 'wall') { this.gainShield(h, [12, 20, 28][evo]); if (evo >= 2) this.addStatus(h, 'thorns', 2); }
    if (this.run.heroId === 'tempo') this.freeSkills = evo >= 2 ? 2 : 1;
    if (this.mods.includes('fury')) this.enemies.forEach(e => this.addStatus(e, 'strength', 1));
    if (this.mods.includes('armored')) this.enemies.forEach(e => this.gainShield(e, 8));
    this.relicHook('onFightStart');
    this.enemies.forEach(e => this.chooseIntent(e));
    this.newRound();
    this.advance();
  }
  newRound() {
    this.round++;
    if (this.round >= 14) { // anti-stall: long fights make enemies impatient
      for (const e of this.enemiesAlive()) { e.atk = Math.ceil(e.atk * 1.12); }
      if (this.round === 14) this.emit({ k: 'text', uid: this.enemiesAlive()[0]?.uid ?? 1, s: 'Crowd is restless!' });
    }
    this.order = [this.hero, ...this.enemiesAlive()].sort((a, b) => this.effSpd(b) - this.effSpd(a) || (a.isHero ? -1 : 1));
    const glitcher = this.enemiesAlive().find(e => e.edef?.gimmick === 'glitch');
    if (glitcher && this.round % 2 === 0) { this.order = this.rng.shuffle(this.order); this.emit({ k: 'text', uid: glitcher.uid, s: 'TURN ORDER GLITCHED' }); }
    this.idx = 0;
  }
  /** Upcoming turn order for UI (rest of this round + next round). */
  preview(n = 7): Unit[] {
    const out: Unit[] = []; const rest = this.order.slice(this.idx).filter(u => u.alive);
    out.push(...rest);
    const next = [this.hero, ...this.enemiesAlive()].sort((a, b) => this.effSpd(b) - this.effSpd(a) || (a.isHero ? -1 : 1));
    while (out.length < n && next.length) out.push(...next);
    return out.slice(0, n);
  }
  checkEnd(): boolean {
    if (!this.hero.alive) { this.over = 'lose'; this.waiting = false; return true; }
    if (this.enemiesAlive().length === 0) { this.over = 'win'; this.waiting = false; return true; }
    return false;
  }
  advance() {
    let guard = 0;
    while (!this.over) {
      if (++guard > 500) { this.over = 'lose'; break; }
      if (this.idx >= this.order.length) this.newRound();
      const u = this.order[this.idx];
      if (!u.alive) { this.idx++; continue; }
      this.emit({ k: 'turn', uid: u.uid });
      const skip = this.turnStart(u);
      if (this.checkEnd()) return;
      if (!u.alive) { this.idx++; continue; }
      if (skip) { this.endTurn(u); this.idx++; continue; }
      if (u.isHero) { this.waiting = true; return; }
      this.enemyAct(u);
      if (this.checkEnd()) return;
      this.endTurn(u); this.idx++;
    }
  }
  turnStart(u: Unit): boolean {
    u.defending = false;
    if (u.st.shield) { const keep = Math.floor(u.st.shield / 2); u.st.shield = keep || undefined; }
    if (u.st.burn) { const bonus = u.isHero ? 0 : this.burnBonus; this.rawDamage(u, u.st.burn + bonus, 'Feedback'); u.st.burn--; if (!u.st.burn) delete u.st.burn; }
    if (u.alive && u.st.bleed) { const bonus = u.isHero ? 0 : this.bleedBonus; this.rawDamage(u, u.st.bleed + bonus, 'Drain'); u.st.bleed = Math.floor(u.st.bleed * 0.6); if (!u.st.bleed) delete u.st.bleed; }
    if (!u.alive) return true;
    if (u.isHero) {
      this.turns++;
      this.gainEnergy(1);
      if (this.run.heroId === 'flow') {
        const pct = [0.05, 0.06, 0.07][this.run.evo]; const amt = Math.ceil(u.maxHp * pct);
        const over = u.hp + amt - u.maxHp; this.heal(u, amt);
        if (this.run.evo >= 2 && over > 0) this.gainShield(u, over);
      }
      this.relicHook('onTurnStart');
    }
    if (!u.isHero && u.phase === 2) {
      const g = u.edef?.gimmick;
      if (g === 'hype' && this.round % 2 === 0) this.addStatus(u, 'strength', 1);
      if (g === 'spin' && this.hero.st.strength) { const n = this.hero.st.strength; delete this.hero.st.strength; this.emit({ k: 'text', uid: u.uid, s: 'SPIN CYCLE: Hype stolen' }); this.addStatus(u, 'strength', n); }
    }
    if (u.st.stun) { this.emit({ k: 'text', uid: u.uid, s: 'Dazzled!' }); return true; }
    return false;
  }
  endTurn(u: Unit) {
    for (const k of ['soak', 'stun', 'strength', 'weak'] as StatusKey[]) { if (u.st[k]) { u.st[k]!--; if (!u.st[k]) delete u.st[k]; } }
  }
  gainEnergy(n: number) { this.energy = Math.min(this.maxEnergy, this.energy + n); }
  addStatus(u: Unit, key: StatusKey, n: number) {
    if (!u.alive || n <= 0) return;
    if (key === 'stun' && u.edef?.tier === 'boss' && (u.st.stun ?? 0) === 0 && this.rng.chance(0.5)) { this.emit({ k: 'text', uid: u.uid, s: 'Resisted' }); return; }
    if (key === 'shield') return this.gainShield(u, n);
    u.st[key] = (u.st[key] ?? 0) + n; this.emit({ k: 'status', uid: u.uid, key, n });
  }
  gainShield(u: Unit, n: number) { n = Math.round(n); u.st.shield = (u.st.shield ?? 0) + n; this.emit({ k: 'status', uid: u.uid, key: 'shield', n }); }
  heal(u: Unit, n: number) { if (!u.alive) return; const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + Math.round(n)); if (u.hp > before) this.emit({ k: 'heal', uid: u.uid, n: u.hp - before, hp: u.hp }); }
  rawDamage(u: Unit, n: number, label?: string) {
    n = Math.max(0, Math.round(n));
    u.hp = Math.max(0, u.hp - n); this.emit({ k: 'dmg', uid: u.uid, n, hp: u.hp });
    if (label) this.emit({ k: 'text', uid: u.uid, s: label });
    this.afterHit(u);
  }
  afterHit(u: Unit) {
    if (u.hp <= 0 && u.alive) {
      u.alive = false; this.emit({ k: 'die', uid: u.uid });
      if (!u.isHero) { this.kills++; this.relicHook('onKill'); }
      return;
    }
    if (!u.isHero && u.edef?.phase2 && u.phase === 1 && u.hp <= u.maxHp / 2) {
      const drop = u.edef.gimmick === 'drop';
      u.phase = 2; this.emit({ k: 'phase', uid: u.uid, s: drop ? 'THE DROP!' : `${u.name} turns it up!` });
      this.addStatus(u, 'strength', 1); this.gainShield(u, Math.round(u.maxHp * 0.08));
      if (drop && this.hero.alive) { this.emit({ k: 'act', uid: u.uid, name: 'THE DROP' }); this.strike(u, this.hero, 1.5, u.el); }
      u.intent = undefined; if (u.alive) this.chooseIntent(u);
    }
  }
  /** Returns damage dealt after shield. */
  strike(att: Unit, tgt: Unit, mult: number, el: Element, critBonus = 0, flat = 0): number {
    if (!tgt.alive) return 0;
    if (att.isHero && tgt.edef?.gimmick === 'double' && this.rng.chance(tgt.phase === 2 ? 0.3 : 0.2)) { this.emit({ k: 'text', uid: tgt.uid, s: 'Hit the reflection!' }); this.emit({ k: 'dmg', uid: tgt.uid, n: 0, hp: tgt.hp, src: att.uid }); return 0; }
    let base = att.atk * (att.isHero ? 1 + this.atkPct : 1) * mult + flat;
    if (att.st.strength) base *= 1.3;
    if (att.st.weak) base *= 0.75;
    const em = elMult(el, tgt.el); base *= em;
    let crit = false;
    if (att.isHero) { const c = this.crit + critBonus + (this.run.heroId === 'tempo' && this.run.evo >= 1 ? 0.1 : 0); if (this.rng.chance(c)) { crit = true; base *= this.critMult; } }
    let dmg = Math.max(1, Math.round(base - tgt.def));
    if (tgt.defending) dmg = Math.ceil(dmg / 2);
    let sh = tgt.st.shield ?? 0; const absorbed = Math.min(sh, dmg); sh -= absorbed; tgt.st.shield = sh || undefined;
    const real = dmg - absorbed;
    tgt.hp = Math.max(0, tgt.hp - real);
    this.emit({ k: 'dmg', uid: tgt.uid, n: real, hp: tgt.hp, crit, eff: em > 1 ? 'super' : em < 1 ? 'weak' : undefined, src: att.uid });
    if (absorbed && !real) this.emit({ k: 'text', uid: tgt.uid, s: 'Guarded' });
    if (!att.isHero && tgt.isHero && tgt.st.thorns) { this.rawDamage(att, tgt.st.thorns * 2 + relicMod(this.run, 'thorns'), 'Spikes'); }
    this.afterHit(tgt);
    return real;
  }
  kindle(t: Unit) { if (this.run.heroId === 'bass' && t.alive) this.addStatus(t, 'burn', this.run.evo >= 1 ? 2 : 1); }

  // ---------------- Hero actions ----------------
  skillCost(i: number): number { const s = this.run.skills[i]; if (!s) return 99; return this.freeSkills > 0 ? 0 : SKILL[s.id].cost; }
  canUse(i: number) { return !!this.run.skills[i] && this.skillCost(i) <= this.energy; }
  heroAct(a: Action) {
    if (!this.waiting || this.over) return;
    const h = this.hero;
    let tgt = this.unit((a as any).target ?? 1);
    if (!tgt || tgt.isHero || !tgt.alive) tgt = this.enemiesAlive()[0];
    if (a.kind === 'potion') {
      const pid = this.run.potions[a.i]; if (!pid) return;
      this.run.potions.splice(a.i, 1);
      const pd = POTION[pid];
      this.emit({ k: 'act', uid: 0, name: pd.name });
      this.applyFx(pd.fx, tgt, 'none', 1);
      if (this.checkEnd()) return;
      if (pd.kind !== 'food') return; // hydration is a free action; food takes the turn
      this.waiting = false; this.endTurn(h); this.idx++; this.advance(); return;
    }
    if (a.kind === 'skill') {
      if (!this.canUse(a.i)) return;
      const own = this.run.skills[a.i]; const sd = SKILL[own.id]; const cost = this.skillCost(a.i);
      if (this.freeSkills > 0) this.freeSkills--; else this.energy -= sd.cost;
      this.skillCount++;
      this.emit({ k: 'act', uid: 0, name: sd.name + (own.up ? '+' : '') });
      this.applyFx(sd.fx, tgt, sd.el ?? h.el, own.up ? 1.3 : 1);
      this.lastSkill = { id: own.id, up: own.up };
      this.relicHook('onSkill', { cost: sd.cost });
    } else if (a.kind === 'basic') {
      this.emit({ k: 'act', uid: 0, name: 'Dance' });
      this.strike(h, tgt, 1, h.el); this.kindle(tgt); this.gainEnergy(1);
    } else if (a.kind === 'defend') {
      this.emit({ k: 'act', uid: 0, name: 'Catch the Beat' });
      h.defending = true; this.gainEnergy(1); this.gainShield(h, 3 + h.def);
    }
    this.waiting = false;
    if (this.checkEnd()) return;
    this.endTurn(h); this.idx++;
    this.advance();
  }
  applyFx(fx: Effect[], tgt: Unit, el: Element, up: number) {
    const h = this.hero;
    for (const f of fx) {
      if (this.over) return;
      if (!tgt.alive && this.enemiesAlive().length) tgt = this.enemiesAlive()[0];
      switch (f.t) {
        case 'dmg': {
          const targets = f.aoe ? this.enemiesAlive() : [tgt];
          for (let i = 0; i < (f.hits ?? 1); i++) for (const t of targets) {
            if (!t.alive) continue;
            const flat = (f.perBurn ? (t.st.burn ?? 0) * f.perBurn : 0) + (f.perShield ? (h.st.shield ?? 0) * f.perShield : 0);
            this.strike(h, t, f.mult * up, f.el ?? el, f.critBonus ?? 0, flat);
            if (i === 0) this.kindle(t);
          }
          break;
        }
        case 'status': {
          const n = up > 1 ? f.n + 1 : f.n;
          if (f.to === 'self') this.addStatus(h, f.key, n);
          else if (f.to === 'enemy') this.addStatus(tgt, f.key, n);
          else this.enemiesAlive().forEach(e => this.addStatus(e, f.key, n));
          break;
        }
        case 'heal': this.heal(h, h.maxHp * f.pct * up); break;
        case 'shield': this.gainShield(h, (f.n + (f.defMult ?? 0) * h.def) * up); break;
        case 'energy': this.gainEnergy(up > 1 ? f.n + 1 : f.n); break;
        case 'cleanse': for (const k of (f.minor ? ['soak', 'weak'] : ['burn', 'bleed', 'soak', 'weak', 'stun']) as StatusKey[]) delete h.st[k]; this.emit({ k: 'text', uid: 0, s: f.minor ? 'Refreshed' : 'Cleansed' }); break;
        case 'fed': this.atkPct += f.atk ?? 0; h.def += f.def ?? 0; this.emit({ k: 'text', uid: 0, s: f.label }); break;
        case 'amplify': { const cur = tgt.st[f.key] ?? 0; if (cur) this.addStatus(tgt, f.key, Math.round(cur * (f.factor - 1) * (up > 1 ? 1.2 : 1))); break; }
      }
    }
  }
  // ---------------- Enemy AI ----------------
  movePool(u: Unit): Move[] { const d = u.edef!; return u.phase === 2 && d.phase2 ? [...d.phase2, ...d.moves.filter(m => m.k === 'atk')] : d.moves; }
  chooseIntent(u: Unit) {
    const pool = this.movePool(u);
    let cands = pool.filter(m => m.name !== u.lastMove);
    if (u.hp >= u.maxHp * 0.8 || (u as any).heals >= 2) cands = cands.filter(m => m.k !== 'heal');
    if (this.round >= 14) cands = cands.filter(m => m.k === 'atk').length ? cands.filter(m => m.k === 'atk') : cands;
    if (!cands.length) cands = pool;
    u.intent = this.rng.pick(cands);
    if (u.edef?.gimmick === 'mirror' && this.lastSkill && this.round < 14 && this.mirrorTick++ % 2 === 0) {
      const sd = SKILL[this.lastSkill.id]; let mult = 0; let status: [StatusKey, number] | undefined;
      for (const f of sd.fx) { if (f.t === 'dmg') mult += f.mult * (f.hits ?? 1); if (f.t === 'status' && f.to !== 'self' && !status) status = [f.key, Math.min(3, f.n)]; }
      mult = Math.max(0.9, Math.min(1.8, mult || 1));
      u.intent = { k: 'atk', name: `Remix: ${sd.name}`, mult, ...(status ? { status } : {}) };
    }
  }
  intentDamage(u: Unit): number {
    const m = u.intent; if (!m || m.k !== 'atk') return 0;
    let base = u.atk * m.mult; if (u.st.strength) base *= 1.3; if (u.st.weak) base *= 0.75; base *= elMult(u.el, this.hero.el);
    return Math.max(1, Math.round(base - this.hero.def));
  }
  enemyAct(u: Unit) {
    const m = u.intent ?? this.movePool(u)[0];
    this.emit({ k: 'act', uid: u.uid, name: m.name });
    const h = this.hero;
    switch (m.k) {
      case 'atk': for (let i = 0; i < (m.hits ?? 1) && h.alive && u.alive; i++) this.strike(u, h, m.mult, u.el); if (m.status && h.alive) this.addStatus(h, m.status[0], m.status[1]);
        if (u.edef?.gimmick === 'vibesoak' && this.energy > 0) { this.energy--; this.emit({ k: 'text', uid: 0, s: 'Vibe soaked -1' }); }
        break;
      case 'buff': this.addStatus(u, m.status[0], m.status[1]); break;
      case 'debuff': this.addStatus(h, m.status[0], m.status[1]); break;
      case 'guard': this.gainShield(u, m.n * (1 + this.depth * 0.12)); break;
      case 'heal': (u as any).heals = ((u as any).heals ?? 0) + 1; this.heal(u, u.maxHp * m.pct); break;
    }
    u.lastMove = m.name;
    if (u.alive) this.chooseIntent(u);
  }
}
export type { SkillDef };
