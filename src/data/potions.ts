import type { PotionDef } from '../types';
export const POTIONS: PotionDef[] = [
  { id: 'red', name: 'Red Tonic', desc: 'Heal 35% max HP.', price: 35, fx: [{ t: 'heal', pct: 0.35 }] },
  { id: 'blue', name: 'Blue Draught', desc: 'Gain 3 Energy.', price: 30, fx: [{ t: 'energy', n: 3 }] },
  { id: 'fire', name: 'Bottled Flame', desc: 'Apply 6 Burn to all enemies.', price: 40, fx: [{ t: 'status', key: 'burn', n: 6, to: 'all' }] },
  { id: 'iron', name: 'Iron Elixir', desc: 'Gain 20 Shield and 2 Strength.', price: 40, fx: [{ t: 'shield', n: 20 }, { t: 'status', key: 'strength', n: 2, to: 'self' }] },
];
export const POTION = Object.fromEntries(POTIONS.map(p => [p.id, p])) as Record<string, any>;
