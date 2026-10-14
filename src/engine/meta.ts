export interface Meta {
  embers: number; unlocked: string[]; relics: string[]; lore: string[]; bossWords: string[];
  perks: { hp: number; gold: number; satchel: boolean; insight: boolean };
  best: Record<string, number>; journeys: number; totalDistance: number; muted: boolean; fast: boolean;
}
const KEY = 'sfs_meta_v1';
export function defaultMeta(): Meta { return { embers: 0, unlocked: [], relics: [], lore: [], bossWords: [], perks: { hp: 0, gold: 0, satchel: false, insight: false }, best: {}, journeys: 0, totalDistance: 0, muted: false, fast: false }; }
export function loadMeta(): Meta {
  try { const raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY); if (raw) { const m = JSON.parse(raw); const d = defaultMeta(); return { ...d, ...m, perks: { ...d.perks, ...(m.perks || {}) } }; } } catch { /* ignore */ }
  return defaultMeta();
}
export function saveMeta(m: Meta) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ } }

export interface Upgrade { id: string; name: string; desc: string; cost: (m: Meta) => number | null; buy: (m: Meta) => void; owned: (m: Meta) => string }
export const UPGRADES: Upgrade[] = [
  { id: 'stone', name: 'Unlock: Stone Warden', desc: 'An Earth tank who starts every fight shielded.', cost: m => m.unlocked.includes('stone') ? null : 60, buy: m => m.unlocked.push('stone'), owned: m => m.unlocked.includes('stone') ? 'UNLOCKED' : '' },
  { id: 'hp', name: 'Sturdy Boots', desc: '+6 starting max HP per level (max 3).', cost: m => m.perks.hp >= 3 ? null : 20 + m.perks.hp * 20, buy: m => m.perks.hp++, owned: m => `LV ${m.perks.hp}/3` },
  { id: 'gold', name: 'Coin Pouch', desc: '+20 starting gold per level (max 3).', cost: m => m.perks.gold >= 3 ? null : 15 + m.perks.gold * 15, buy: m => m.perks.gold++, owned: m => `LV ${m.perks.gold}/3` },
  { id: 'satchel', name: 'Traveler\'s Satchel', desc: 'Start each journey with a Red Tonic.', cost: m => m.perks.satchel ? null : 30, buy: m => { m.perks.satchel = true; }, owned: m => m.perks.satchel ? 'OWNED' : '' },
  { id: 'insight', name: 'Inner Spark', desc: '+1 max Energy on every journey.', cost: m => m.perks.insight ? null : 90, buy: m => { m.perks.insight = true; }, owned: m => m.perks.insight ? 'OWNED' : '' },
  { id: 'r_wayfinder', name: "Relic: Wayfinder's Map", desc: 'Adds to relic pool. Heal 8% after each fight.', cost: m => m.relics.includes('wayfinder') ? null : 35, buy: m => m.relics.push('wayfinder'), owned: m => m.relics.includes('wayfinder') ? 'IN POOL' : '' },
  { id: 'r_lantern', name: 'Relic: Old Lantern', desc: 'Adds to relic pool. Enemies start Weak and Soaked.', cost: m => m.relics.includes('old_lantern') ? null : 50, buy: m => m.relics.push('old_lantern'), owned: m => m.relics.includes('old_lantern') ? 'IN POOL' : '' },
  { id: 'r_letter', name: "Relic: Someone's Letter", desc: 'Adds to relic pool. +20 HP, +1 Energy.', cost: m => m.relics.includes('someones_letter') ? null : 75, buy: m => m.relics.push('someones_letter'), owned: m => m.relics.includes('someones_letter') ? 'IN POOL' : '' },
];
