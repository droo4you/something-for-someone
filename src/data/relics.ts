import type { RelicDef } from '../types';
// Hook ctx: { b: Battle } - see engine/battle.ts
export const RELICS: RelicDef[] = [
  { id: 'tinder_box', name: 'Tinderbox', rarity: 'common', desc: 'Burn deals +1 damage per tick.', mods: { burnBonus: 1 } },
  { id: 'whetstone', name: 'Whetstone', rarity: 'common', desc: '+10% ATK.', mods: { atkPct: 0.1 } },
  { id: 'oak_buckler', name: 'Oak Buckler', rarity: 'common', desc: '+2 DEF.', mods: { defFlat: 2 } },
  { id: 'feather_boots', name: 'Feather Boots', rarity: 'common', desc: '+3 SPD.', mods: { spd: 3 } },
  { id: 'hearth_stone', name: 'Hearthstone', rarity: 'common', desc: '+15 max HP.', mods: { hpMax: 15 } },
  { id: 'lucky_coin', name: 'Lucky Coin', rarity: 'common', desc: '+25% gold from fights.', mods: { goldPct: 0.25 } },
  { id: 'thorn_ring', name: 'Thorn Ring', rarity: 'common', desc: 'Start fights with 2 Thorns.', onFightStart: c => c.b.addStatus(c.b.hero, 'thorns', 2) },
  { id: 'hawk_eye', name: 'Hawk Eye', rarity: 'rare', desc: '+12% crit chance.', mods: { crit: 0.12 } },
  { id: 'jagged_fang', name: 'Jagged Fang', rarity: 'rare', desc: 'Bleed deals +1 damage per stack tick.', mods: { bleedBonus: 1 } },
  { id: 'mana_bead', name: 'Mana Bead', rarity: 'rare', desc: '+1 max Energy.', mods: { energyMax: 1 } },
  { id: 'warm_cloak', name: 'Warm Cloak', rarity: 'rare', desc: 'Start fights with 10 Shield.', onFightStart: c => c.b.gainShield(c.b.hero, 10) },
  { id: 'vampire_tooth', name: 'Vampire Tooth', rarity: 'rare', desc: 'Heal 6% max HP on each kill.', onKill: c => c.b.heal(c.b.hero, Math.ceil(c.b.hero.maxHp * 0.06)) },
  { id: 'echo_bell', name: 'Echo Bell', rarity: 'rare', desc: 'Every 3rd skill refunds its Energy.', onSkill: c => { c.b.skillCount % 3 === 0 && c.b.gainEnergy(c.cost); } },
  { id: 'phoenix_ash', name: 'Phoenix Ash', rarity: 'epic', desc: 'Each turn, apply 1 Burn to all enemies.', onTurnStart: c => c.b.enemiesAlive().forEach((e: any) => c.b.addStatus(e, 'burn', 1)) },
  { id: 'giant_belt', name: "Giant's Belt", rarity: 'epic', desc: 'Start fights with 2 Strength. +10 max HP.', mods: { hpMax: 10 }, onFightStart: c => c.b.addStatus(c.b.hero, 'strength', 2) },
  { id: 'storm_crown', name: 'Storm Crown', rarity: 'epic', desc: 'Crits deal 2.2x instead of 1.6x.', mods: { critMult: 0.6 } },
  { id: 'battery_gem', name: 'Pulse Gem', rarity: 'epic', desc: 'Gain +1 Energy at the start of each turn.', onTurnStart: c => c.b.gainEnergy(1) },
  // Meta-unlocked (added to pool via Embers)
  { id: 'wayfinder', name: "Wayfinder's Map", rarity: 'rare', meta: true, desc: 'Heal 8% max HP after each fight.', mods: { healPct: 0.08 } },
  { id: 'old_lantern', name: 'Old Lantern', rarity: 'epic', meta: true, desc: 'Enemies start fights with 1 Weak and 2 Soak.', onFightStart: c => c.b.enemiesAlive().forEach((e: any) => { c.b.addStatus(e, 'weak', 1); c.b.addStatus(e, 'soak', 2); }) },
  { id: 'someones_letter', name: "Someone's Letter", rarity: 'epic', meta: true, desc: '+20 max HP, +1 max Energy. Unsigned.', mods: { hpMax: 20, energyMax: 1 } },
];
export const RELIC = Object.fromEntries(RELICS.map(r => [r.id, r])) as Record<string, RelicDef>;
