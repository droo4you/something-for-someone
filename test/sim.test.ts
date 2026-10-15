import { describe, it, expect } from 'vitest';
import { simulate } from '../src/engine/autoplay';
import { defaultMeta } from '../src/engine/meta';
import { HEROES } from '../src/data/heroes';
import { SKILLS } from '../src/data/skills';
import { RELICS } from '../src/data/relics';
import { POTIONS } from '../src/data/potions';
import { ENEMIES } from '../src/data/enemies';
import { EVENTS } from '../src/data/events';
import { LORE } from '../src/data/lore';
import { Battle } from '../src/engine/battle';
import { newRun } from '../src/engine/run';

const N = Number(process.env.SIM_RUNS ?? 60);
function stats(ai: 'novice' | 'good') {
  const res = [] as ReturnType<typeof simulate>[];
  for (const h of HEROES) for (let i = 0; i < N; i++) res.push(simulate(h.id, `SIM${i}`, ai, defaultMeta()));
  const depths = res.map(r => r.depth).sort((a, b) => a - b);
  const avg = depths.reduce((a, b) => a + b, 0) / depths.length;
  const further = res.filter(r => r.depth >= 7).length / res.length;
  const perHero = Object.fromEntries(HEROES.map(h => [h.id, +(res.filter(r => r.hero === h.id).reduce((a, r) => a + r.depth, 0) / N).toFixed(2)]));
  const turns = res.reduce((a, r) => a + r.turns, 0) / res.length;
  console.log(`[${ai}] runs=${res.length} avgRegionsCleared=${avg.toFixed(2)} median=${depths[depths.length >> 1]} max=${depths[depths.length - 1]} sunriseSet=${(further * 100).toFixed(1)}% avgHeroTurns=${turns.toFixed(0)} perHero=${JSON.stringify(perHero)}`);
  return { avg, further, res };
}

describe('content minimums', () => {
  it('meets spec counts', () => {
    expect(SKILLS.length).toBeGreaterThanOrEqual(20);
    expect(RELICS.length).toBeGreaterThanOrEqual(12);
    expect(POTIONS.length).toBeGreaterThanOrEqual(3);
    expect(ENEMIES.filter(e => e.tier === 'normal').length).toBeGreaterThanOrEqual(14);
    expect(ENEMIES.filter(e => e.tier === 'elite').length).toBeGreaterThanOrEqual(4);
    expect(ENEMIES.filter(e => e.tier === 'boss').length).toBeGreaterThanOrEqual(4);
    expect(ENEMIES.filter(e => e.tier === 'boss').every(b => b.phase2)).toBe(true);
    expect(EVENTS.length).toBeGreaterThanOrEqual(8);
    expect(LORE.length).toBeGreaterThanOrEqual(25);
    expect(POTIONS.filter(p => p.kind === 'hydration').length).toBeGreaterThanOrEqual(2);
    expect(POTIONS.filter(p => p.kind === 'food').length).toBeGreaterThanOrEqual(2);
    expect(HEROES.map(h => h.id)).toEqual(['bass', 'flow', 'tempo', 'wall']);
    expect(new Set(ENEMIES.filter(e => e.tier === 'boss').map(b => b.gimmick)).size).toBeGreaterThanOrEqual(5);
  });
  it('keeps it wholesome: no drug references anywhere in player-facing text', () => {
    const banned = /\b(molly|mdma|ecstasy|acid|lsd|shroom|mushroom|weed|pill|roll(ing)? (on|face)|high af|stoned|trip(ping)? balls|xtc|ketamine|k-hole|cocaine|coke|drug)/i;
    const blobs = [HEROES, SKILLS, RELICS, POTIONS, ENEMIES, EVENTS, LORE].map(x => JSON.stringify(x));
    for (const b of blobs) expect(b.match(banned)?.[0] ?? null).toBeNull();
  });
});

describe('headless simulation', () => {
  it('novice AI: no crashes/softlocks, clears ~1-2 regions', () => {
    const s = stats('novice');
    expect(s.avg).toBeGreaterThan(0.4); expect(s.avg).toBeLessThan(3);
  });
  it('good AI: no crashes/softlocks, sometimes reaches the Sunrise Set', () => {
    const s = stats('good');
    expect(s.avg).toBeGreaterThan(2);
    expect(s.further).toBeGreaterThan(0.02);
  });
  it('player always acts first, even against faster enemies; damage previews match real hits', () => {
    const run = newRun('wall', 'FIRST', defaultMeta());
    const fast = { ...ENEMIES.find(e => e.tier === 'normal')!, spd: 99 };
    const b = new Battle(run, [fast, fast], 0, 7); b.start();
    expect(b.waiting).toBe(true); expect(b.round).toBe(1);
    expect(b.hero.hp).toBe(run.hp); // nobody hit us before our first choice
    const before = b.enemies[0].hp; const exp = b.calc(b.hero, b.enemies[0], 1, b.hero.el).n; b.crit = 0;
    b.heroAct({ kind: 'basic', target: 1 });
    const dealt = before - b.enemies[0].hp; expect(dealt).toBe(exp);
    expect(b.order[0].isHero).toBe(false); // round 2+ (or rest of round 1) back to SPD order
  });
  it('seeded runs are deterministic', () => {
    const a = simulate('bass', 'DETERMINISM', 'good', defaultMeta());
    const b = simulate('bass', 'DETERMINISM', 'good', defaultMeta());
    expect(a).toEqual(b);
  });
});
