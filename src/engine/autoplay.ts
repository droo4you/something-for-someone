// Headless auto-player used by the simulation test (and handy for debugging).
import { Battle, type Action } from './battle';
import { SKILL } from '../data/skills';
import { EVENTS } from '../data/events';
import * as R from './run';
import type { Meta } from './meta';
import { RNG } from './rng';

export type Skill = 'novice' | 'good';
export interface SimResult { distance: number; depth: number; turns: number; battles: number; endedBy: string; hero: string }

function chooseAction(b: Battle, ai: Skill, rng: RNG): Action {
  const en = b.enemiesAlive(); const h = b.hero;
  if (ai === 'novice') {
    const usable = b.run.skills.map((_, i) => i).filter(i => b.canUse(i));
    const t = rng.pick(en).uid;
    if (usable.length && rng.chance(0.7)) { const dmg = usable.filter(i => SKILL[b.run.skills[i].id].fx.some(f => f.t === 'dmg')); return { kind: 'skill', i: dmg.length && rng.chance(0.6) ? rng.pick(dmg) : rng.pick(usable), target: t }; }
    return rng.chance(0.85) ? { kind: 'basic', target: t } : { kind: 'defend' };
  }
  const incoming = en.reduce((a, e) => a + b.intentDamage(e) * ((e.intent as any)?.hits ?? 1), 0);
  const low = h.hp / h.maxHp;
  const pi = b.run.potions.findIndex(p => p === 'red');
  if (low < 0.3 && pi >= 0) return { kind: 'potion', i: pi, target: en[0].uid };
  const other = b.run.potions.findIndex(p => p !== 'red');
  if (other >= 0 && (en.some(e => e.edef?.tier !== 'normal'))) return { kind: 'potion', i: other, target: en[0].uid };
  const target = en.slice().sort((a, c) => a.hp - c.hp)[0].uid;
  let best = -1, bestScore = 0;
  b.run.skills.forEach((s, i) => {
    if (!b.canUse(i)) return; const d = SKILL[s.id]; let sc = 0;
    for (const f of d.fx) {
      if (f.t === 'dmg') sc += f.mult * (f.hits ?? 1) * (f.aoe ? en.length : 1) * 10;
      if (f.t === 'heal') sc += low < 0.55 ? f.pct * 120 : 2;
      if (f.t === 'shield') sc += incoming > 0 ? Math.min(f.n, incoming) * 0.9 : 1;
      if (f.t === 'status') sc += f.n * (f.key === 'stun' ? 6 : 3) * (f.to === 'all' ? en.length : 1);
      if (f.t === 'energy') sc += b.energy < 2 ? f.n * 4 : 0;
      if (f.t === 'amplify') sc += (en.find(e => e.uid === target)?.st[f.key] ?? 0) * 3;
    }
    sc *= s.up ? 1.3 : 1; sc -= b.skillCost(i) * 2;
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  if (best >= 0 && bestScore > 9) return { kind: 'skill', i: best, target };
  if (incoming > h.hp * 0.4) return { kind: 'defend' };
  return { kind: 'basic', target };
}

export function fight(run: R.Run, type: R.NodeType, ai: Skill, rng: RNG, stats: { turns: number }): boolean {
  const b = new Battle(run, R.encounter(run, type), run.depth, R.nodeRng(run, 'battle').int(1, 1e9), run.mods);
  b.start();
  let steps = 0;
  while (!b.over) {
    if (++steps > 400) throw new Error(`softlock: battle exceeded 400 actions (depth ${run.depth})`);
    if (!b.waiting) throw new Error('softlock: battle not over but not waiting for hero');
    b.heroAct(chooseAction(b, ai, rng));
    b.events.length = 0;
  }
  stats.turns += b.turns;
  if (b.over === 'lose') { run.hp = 0; return false; }
  R.finishBattle(run, b.hero.hp, b.kills);
  const rw = R.genRewards(run, type); run.gold += rw.gold;
  if (rw.options.length) {
    let opt = ai === 'novice' ? rng.pick(rw.options) : rw.options.slice().sort((a, c) => score(c) - score(a))[0];
    if (!R.applyReward(run, opt)) {
      const weakest = run.skills.map((s, i) => ({ i, c: SKILL[s.id].cost + (s.up ? 1 : 0) + ({ common: 0, rare: 1, epic: 2 } as any)[SKILL[s.id].rarity] })).sort((a, c) => a.c - c.c)[0].i;
      if (ai === 'novice' && rng.chance(0.5)) run.gold += 15; else R.applyReward(run, opt, weakest);
    }
  }
  return true;
}
function score(o: R.Reward) { const r = { common: 1, rare: 2, epic: 3 }[o.rarity]; return o.kind === 'relic' ? r * 2 + 0.5 : o.kind === 'upgrade' ? 2.5 : r * 1.8; }

export function simulate(heroId: string, seed: string, ai: Skill, meta: Meta, maxDepth = 30): SimResult {
  const rng = new RNG(seed + ai);
  const run = R.newRun(heroId, seed, meta);
  const stats = { turns: 0 }; let battles = 0;
  let loops = 0;
  while (!run.over) {
    if (++loops > 2000) throw new Error('softlock: run loop');
    const opts = R.reachable(run);
    if (!opts.length) throw new Error('softlock: no reachable nodes');
    let node = rng.pick(opts);
    if (ai === 'good') {
      const pr = (t: R.NodeType) => ({ campfire: run.hp / run.maxHp < 0.5 ? 10 : 2, elite: run.hp / run.maxHp > 0.75 ? 6 : -5, merchant: run.gold >= 110 ? 7 : 0, treasure: 8, battle: 4, event: 3, shrine: 2, boss: 0 }[t]);
      node = opts.slice().sort((a, c) => pr(c.type) - pr(a.type))[0];
    }
    run.pos = { col: node.col, row: node.row }; run.stop = node.col;
    switch (node.type) {
      case 'battle': case 'elite': case 'boss':
        battles++;
        if (!fight(run, node.type, ai, rng, stats)) { run.over = true; break; }
        if (node.type === 'boss') { R.nextRegion(run); if (run.depth >= maxDepth) run.over = true; }
        else run.stop = node.col + 1;
        break;
      case 'campfire':
        if (ai === 'good' && run.hp / run.maxHp > 0.65 && run.skills.some(s => !s.up)) run.skills.find(s => !s.up)!.up = true; else R.healPct(run, 0.3);
        R.unseenLore(run, meta, rng); run.stop = node.col + 1; break;
      case 'merchant': {
        if (ai === 'good') for (const it of R.genShop(run)) {
          if (it.price > run.gold) continue;
          if (it.kind === 'relic') { run.gold -= it.price; R.gainRelic(run, it.id); }
          else if (it.kind === 'potion' && run.potions.length < R.MAX_POTIONS) { run.gold -= it.price; run.potions.push(it.id); }
        }
        run.stop = node.col + 1; break;
      }
      case 'event': {
        const ev = R.pickEvent(run); const ch = ai === 'good' ? ev.choices.find(c => !c.fx.fight && (c.fx.gold ?? 0) >= -run.gold) ?? ev.choices[1] : rng.pick(ev.choices);
        const out = R.resolveEvent(run, meta, ch);
        if (out.pendingSkill) R.learnSkill(run, out.pendingSkill, run.skills.length >= R.MAX_SKILLS ? 0 : undefined);
        if (run.hp <= 0) { run.over = true; break; }
        if (out.fight) { battles++; if (!fight(run, 'battle', ai, rng, stats)) { run.over = true; break; } }
        run.stop = node.col + 1; break;
      }
      case 'treasure': R.treasure(run); run.stop = node.col + 1; break;
      case 'shrine': R.shrine(run, ai === 'good' && run.hp / run.maxHp > 0.7 ? 'blood' : 'leave'); run.stop = node.col + 1; break;
    }
  }
  void EVENTS;
  return { distance: R.distance(run), depth: run.depth, turns: stats.turns, battles, endedBy: run.hp <= 0 ? 'death' : 'cap', hero: heroId };
}
