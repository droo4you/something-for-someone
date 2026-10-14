import type { RelicDef } from '../types';
// Gear. Hook ctx: { b: Battle } - see engine/battle.ts
export const RELICS: RelicDef[] = [
  { id: 'earplugs', name: 'Earplugs', rarity: 'common', desc: 'Protect your ears, sharpen your Feedback: +1 dmg per tick.', mods: { burnBonus: 1 } },
  { id: 'fanny_pack', name: 'Fanny Pack', rarity: 'common', desc: 'Everything within reach. +10% ATK.', mods: { atkPct: 0.1 } },
  { id: 'bucket_hat', name: 'Bucket Hat', rarity: 'common', desc: '+2 DEF.', mods: { defFlat: 2 } },
  { id: 'light_up_sneakers', name: 'Light-Up Sneakers', rarity: 'common', desc: '+3 SPD.', mods: { spd: 3 } },
  { id: 'camelbak', name: 'CamelBak', rarity: 'common', desc: 'Stay hydrated. +15 max Energy.', mods: { hpMax: 15 } },
  { id: 'glow_necklace', name: 'Glow Necklace', rarity: 'common', desc: '+25% glowsticks from fights.', mods: { goldPct: 0.25 } },
  { id: 'kandi_stack', name: 'Kandi Bracelet Stack', rarity: 'common', desc: 'Start fights with 2 Spikes.', onFightStart: c => c.b.addStatus(c.b.hero, 'thorns', 2) },
  { id: 'kaleido_glasses', name: 'Kaleidoscope Glasses', rarity: 'rare', desc: 'See every angle. +12% crit chance.', mods: { crit: 0.12 } },
  { id: 'flow_glove', name: 'Flow-Toy Glove', rarity: 'rare', desc: 'Drain deals +1 dmg per tick.', mods: { bleedBonus: 1 } },
  { id: 'headphones', name: 'Noise-Cancel Headphones', rarity: 'rare', desc: 'Lock in. +1 max Vibe.', mods: { energyMax: 1 } },
  { id: 'bandana', name: 'Festival Bandana', rarity: 'rare', desc: 'Dust-proof. Start fights with 10 Guard.', onFightStart: c => c.b.gainShield(c.b.hero, 10) },
  { id: 'portable_fan', name: 'Portable Fan', rarity: 'rare', desc: 'Recover 6% Energy on each knockout.', onKill: c => c.b.heal(c.b.hero, Math.ceil(c.b.hero.maxHp * 0.06)) },
  { id: 'led_visor', name: 'LED Visor', rarity: 'rare', desc: 'Every 3rd skill refunds its Vibe.', onSkill: c => { c.b.skillCount % 3 === 0 && c.b.gainEnergy(c.cost); } },
  { id: 'totem_flag', name: 'Totem Flag', rarity: 'epic', desc: 'Each turn, apply 1 Feedback to all enemies.', onTurnStart: c => c.b.enemiesAlive().forEach((e: any) => c.b.addStatus(e, 'burn', 1)) },
  { id: 'spare_charger', name: 'Spare Charger', rarity: 'epic', desc: 'Start fights with 2 Hype. +10 max Energy.', mods: { hpMax: 10 }, onFightStart: c => c.b.addStatus(c.b.hero, 'strength', 2) },
  { id: 'sunscreen', name: 'Sunscreen SPF 50', rarity: 'epic', desc: 'Crits deal 2.2x instead of 1.6x.', mods: { critMult: 0.6 } },
  { id: 'phone_2pct', name: 'The 2% Phone', rarity: 'epic', desc: 'Calls a friend once per fight: the first time you drop below 30% Energy, recover 30%.', onTurnStart: c => { const b = c.b; if (!b.called && b.hero.hp < b.hero.maxHp * 0.3) { b.called = true; b.emit({ k: 'text', uid: 0, s: 'Incoming call...' }); b.heal(b.hero, Math.ceil(b.hero.maxHp * 0.3)); } } },
  // Afterglow-unlocked (added to pool via meta)
  { id: 'juno_schedule', name: "Juno's Laminated Schedule", rarity: 'rare', meta: true, desc: 'Recover 8% Energy after each fight.', mods: { healPct: 0.08 } },
  { id: 'remy_totem', name: "Remy's Lost Totem", rarity: 'epic', meta: true, desc: 'Enemies start fights Tired 1 and Muffled 2.', onFightStart: c => c.b.enemiesAlive().forEach((e: any) => { c.b.addStatus(e, 'weak', 1); c.b.addStatus(e, 'soak', 2); }) },
  { id: 'unsent_text', name: 'The Unsent Text', rarity: 'epic', meta: true, desc: '+20 max Energy, +1 max Vibe. "omw"', mods: { hpMax: 20, energyMax: 1 } },
];
export const RELIC = Object.fromEntries(RELICS.map(r => [r.id, r])) as Record<string, RelicDef>;
