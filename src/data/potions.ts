import type { PotionDef } from '../types';
// Hydration: small, free, cleanses minor debuffs (Muffled, Tired). Food: big heal + fight-long buff, costs your turn.
export const POTIONS: PotionDef[] = [
  { id: 'water', name: 'Water Bottle', kind: 'hydration', desc: 'Free action. Recover 18% Energy. Clears Muffled and Tired.', price: 18, fx: [{ t: 'heal', pct: 0.18 }, { t: 'cleanse', minor: true }] },
  { id: 'electrolyte', name: 'Electrolyte Packet', kind: 'hydration', desc: 'Free action. Recover 12% Energy, +2 Vibe. Clears Muffled and Tired.', price: 26, fx: [{ t: 'heal', pct: 0.12 }, { t: 'energy', n: 2 }, { t: 'cleanse', minor: true }] },
  { id: 'coconut', name: 'Coconut Water', kind: 'hydration', desc: 'Free action. Recover 24% Energy. Clears Muffled and Tired.', price: 30, fx: [{ t: 'heal', pct: 0.24 }, { t: 'cleanse', minor: true }] },
  { id: 'burrito', name: 'Festival Burrito', kind: 'food', desc: 'Takes your turn. Recover 45% Energy. +20% ATK this fight.', price: 42, fx: [{ t: 'heal', pct: 0.45 }, { t: 'fed', atk: 0.2, label: 'Well fed!' }] },
  { id: 'fries', name: 'Loaded Fries', kind: 'food', desc: 'Takes your turn. Recover 35% Energy, 16 Guard. +3 DEF this fight.', price: 38, fx: [{ t: 'heal', pct: 0.35 }, { t: 'shield', n: 16 }, { t: 'fed', def: 3, label: 'Grounded!' }] },
  { id: 'pineapple_whip', name: 'Pineapple Whip', kind: 'food', desc: 'Takes your turn. Recover 30% Energy. +3 Vibe, 2 Hype.', price: 36, fx: [{ t: 'heal', pct: 0.3 }, { t: 'energy', n: 3 }, { t: 'status', key: 'strength', n: 2, to: 'self' }, { t: 'fed', label: 'Sugar rush!' }] },
];
export const POTION = Object.fromEntries(POTIONS.map(p => [p.id, p])) as Record<string, PotionDef>;
