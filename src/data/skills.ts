import type { SkillDef } from '../types';
// el omitted = hero's element. Basic Attack / Defend are built-in actions, not skills.
export const SKILLS: SkillDef[] = [
  // Ember starters
  { id: 'flame_slash', name: 'Flame Slash', cost: 1, rarity: 'common', desc: 'Deal 150% dmg. Apply 2 Burn.', fx: [{ t: 'dmg', mult: 1.5 }, { t: 'status', key: 'burn', n: 2, to: 'enemy' }] },
  { id: 'ember_guard', name: 'Ember Guard', cost: 1, rarity: 'common', desc: 'Gain 10 Shield (+DEF). 1 Thorns.', fx: [{ t: 'shield', n: 10, defMult: 1 }, { t: 'status', key: 'thorns', n: 1, to: 'self' }] },
  { id: 'kindling', name: 'Kindling', cost: 2, rarity: 'common', desc: 'Apply 4 Burn to all enemies.', fx: [{ t: 'status', key: 'burn', n: 4, to: 'all' }] },
  // Tide starters
  { id: 'tidal_lash', name: 'Tidal Lash', cost: 1, rarity: 'common', desc: 'Deal 140% dmg. Apply 2 Soak.', fx: [{ t: 'dmg', mult: 1.4 }, { t: 'status', key: 'soak', n: 2, to: 'enemy' }] },
  { id: 'mend_water', name: 'Mending Water', cost: 2, rarity: 'common', desc: 'Heal 22% max HP. Cleanse.', fx: [{ t: 'heal', pct: 0.22 }, { t: 'cleanse' }] },
  { id: 'riptide', name: 'Riptide', cost: 2, rarity: 'common', desc: 'Deal 90% dmg to all. Apply 1 Soak.', fx: [{ t: 'dmg', mult: 0.9, aoe: true }, { t: 'status', key: 'soak', n: 1, to: 'all' }] },
  // Gale starters
  { id: 'twin_cut', name: 'Twin Cut', cost: 1, rarity: 'common', desc: 'Hit twice for 75%. Each applies 1 Bleed.', fx: [{ t: 'dmg', mult: 0.75, hits: 2 }, { t: 'status', key: 'bleed', n: 2, to: 'enemy' }] },
  { id: 'wind_step', name: 'Wind Step', cost: 1, rarity: 'common', desc: 'Gain 6 Shield and 2 Strength.', fx: [{ t: 'shield', n: 6 }, { t: 'status', key: 'strength', n: 2, to: 'self' }] },
  { id: 'quick_jab', name: 'Quick Jab', cost: 0, rarity: 'common', desc: 'Deal 70% dmg. +15% crit.', fx: [{ t: 'dmg', mult: 0.7, critBonus: 0.15 }] },
  // Stone starters
  { id: 'rock_smash', name: 'Rock Smash', cost: 1, rarity: 'common', desc: 'Deal 120% dmg + 50% of your Shield.', fx: [{ t: 'dmg', mult: 1.2, perShield: 0.5 }] },
  { id: 'stone_skin', name: 'Stone Skin', cost: 1, rarity: 'common', desc: 'Gain 12 Shield (+2xDEF).', fx: [{ t: 'shield', n: 12, defMult: 2 }] },
  { id: 'quake', name: 'Quake', cost: 2, rarity: 'common', desc: 'Deal 100% to all. Weak 1.', fx: [{ t: 'dmg', mult: 1.0, aoe: true }, { t: 'status', key: 'weak', n: 1, to: 'all' }] },
  // Draft pool
  { id: 'cleave', name: 'Cleave', cost: 1, rarity: 'common', el: 'none', desc: 'Deal 80% dmg to all enemies.', fx: [{ t: 'dmg', mult: 0.8, aoe: true }] },
  { id: 'second_wind', name: 'Second Wind', cost: 0, rarity: 'common', el: 'none', desc: 'Gain 2 Energy. Heal 5%.', fx: [{ t: 'energy', n: 2 }, { t: 'heal', pct: 0.05 }] },
  { id: 'iron_wall', name: 'Iron Wall', cost: 1, rarity: 'common', el: 'none', desc: 'Gain 14 Shield.', fx: [{ t: 'shield', n: 14 }] },
  { id: 'serrate', name: 'Serrate', cost: 1, rarity: 'common', el: 'none', desc: 'Deal 60% dmg. Apply 4 Bleed.', fx: [{ t: 'dmg', mult: 0.6 }, { t: 'status', key: 'bleed', n: 4, to: 'enemy' }] },
  { id: 'fireball', name: 'Fireball', cost: 2, rarity: 'rare', el: 'fire', desc: 'Fire. Deal 220% dmg. Apply 3 Burn.', fx: [{ t: 'dmg', mult: 2.2 }, { t: 'status', key: 'burn', n: 3, to: 'enemy' }] },
  { id: 'pyre', name: 'Pyre', cost: 1, rarity: 'rare', el: 'fire', desc: 'Deal 50% dmg; double target Burn first.', fx: [{ t: 'amplify', key: 'burn', factor: 2 }, { t: 'dmg', mult: 0.5 }] },
  { id: 'hailstorm', name: 'Hailstorm', cost: 2, rarity: 'rare', el: 'water', desc: 'Water. Hit all 3x for 45%. Soak 1.', fx: [{ t: 'dmg', mult: 0.45, hits: 3, aoe: true }, { t: 'status', key: 'soak', n: 1, to: 'all' }] },
  { id: 'gust_flurry', name: 'Gust Flurry', cost: 2, rarity: 'rare', el: 'wind', desc: 'Wind. Hit 4x for 50%, +10% crit.', fx: [{ t: 'dmg', mult: 0.5, hits: 4, critBonus: 0.1 }] },
  { id: 'boulder', name: 'Boulder Toss', cost: 2, rarity: 'rare', el: 'earth', desc: 'Earth. Deal 200% dmg. Stun 1.', fx: [{ t: 'dmg', mult: 2.0 }, { t: 'status', key: 'stun', n: 1, to: 'enemy' }] },
  { id: 'war_cry', name: 'War Cry', cost: 1, rarity: 'rare', el: 'none', desc: 'Gain 3 Strength. Enemies Weak 2.', fx: [{ t: 'status', key: 'strength', n: 3, to: 'self' }, { t: 'status', key: 'weak', n: 2, to: 'all' }] },
  { id: 'bramble', name: 'Bramble Mail', cost: 1, rarity: 'rare', el: 'none', desc: 'Gain 8 Shield and 3 Thorns.', fx: [{ t: 'shield', n: 8 }, { t: 'status', key: 'thorns', n: 3, to: 'self' }] },
  { id: 'focus', name: 'Focus', cost: 0, rarity: 'rare', el: 'none', desc: 'Gain 3 Energy. Gain 1 Weak.', fx: [{ t: 'energy', n: 3 }, { t: 'status', key: 'weak', n: 1, to: 'self' }] },
  { id: 'assassinate', name: 'Assassinate', cost: 2, rarity: 'rare', el: 'none', desc: 'Deal 160% dmg, +40% crit.', fx: [{ t: 'dmg', mult: 1.6, critBonus: 0.4 }] },
  { id: 'inferno', name: 'Inferno', cost: 3, rarity: 'epic', el: 'fire', desc: 'Deal 100% to all + 3 per Burn they have.', fx: [{ t: 'dmg', mult: 1.0, aoe: true, perBurn: 3 }] },
  { id: 'maelstrom', name: 'Maelstrom', cost: 3, rarity: 'epic', el: 'water', desc: 'Deal 170% to all. Heal 15%.', fx: [{ t: 'dmg', mult: 1.7, aoe: true }, { t: 'heal', pct: 0.15 }] },
  { id: 'tempest', name: 'Tempest Edge', cost: 3, rarity: 'epic', el: 'wind', desc: 'Hit 6x for 55%. Bleed 1 each.', fx: [{ t: 'dmg', mult: 0.55, hits: 6 }, { t: 'status', key: 'bleed', n: 6, to: 'enemy' }] },
  { id: 'aegis', name: 'Aegis Slam', cost: 2, rarity: 'epic', el: 'earth', desc: 'Gain 18 Shield, then deal 100% + all Shield.', fx: [{ t: 'shield', n: 18 }, { t: 'dmg', mult: 1.0, perShield: 1 }] },
  { id: 'hemorrhage', name: 'Hemorrhage', cost: 2, rarity: 'epic', el: 'none', desc: 'Triple target Bleed, then deal 60%.', fx: [{ t: 'amplify', key: 'bleed', factor: 3 }, { t: 'dmg', mult: 0.6 }] },
  { id: 'overdrive', name: 'Overdrive', cost: 0, rarity: 'epic', el: 'none', desc: 'Gain 4 Energy and 2 Strength.', fx: [{ t: 'energy', n: 4 }, { t: 'status', key: 'strength', n: 2, to: 'self' }] },
];
export const SKILL = Object.fromEntries(SKILLS.map(s => [s.id, s])) as Record<string, SkillDef>;
export const STARTERS = new Set(['flame_slash','ember_guard','kindling','tidal_lash','mend_water','riptide','twin_cut','wind_step','quick_jab','rock_smash','stone_skin','quake']);
