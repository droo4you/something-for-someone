export interface Meta {
  embers: number; unlocked: string[]; relics: string[]; lore: string[]; bossWords: string[];
  perks: { hp: number; gold: number; satchel: boolean; insight: boolean };
  best: Record<string, number>; journeys: number; totalDistance: number; muted: boolean; fast: boolean;
}
const KEY = 'rr_meta_v1';
export function defaultMeta(): Meta { return { embers: 0, unlocked: [], relics: [], lore: [], bossWords: [], perks: { hp: 0, gold: 0, satchel: false, insight: false }, best: {}, journeys: 0, totalDistance: 0, muted: false, fast: false }; }
export function loadMeta(): Meta {
  try { const raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY); if (raw) { const m = JSON.parse(raw); const d = defaultMeta(); return { ...d, ...m, perks: { ...d.perks, ...(m.perks || {}) } }; } } catch { /* ignore */ }
  return defaultMeta();
}
export function saveMeta(m: Meta) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ } }

export interface Upgrade { id: string; name: string; desc: string; cost: (m: Meta) => number | null; buy: (m: Meta) => void; owned: (m: Meta) => string }
export const UPGRADES: Upgrade[] = [
  { id: 'wall', name: 'Unlock: Wall of Sound', desc: 'A Hardstyle tank who starts every fight with Guard.', cost: m => m.unlocked.includes('wall') ? null : 60, buy: m => m.unlocked.push('wall'), owned: m => m.unlocked.includes('wall') ? 'UNLOCKED' : '' },
  { id: 'hp', name: 'Comfy Insoles', desc: '+6 starting max Energy per level (max 3).', cost: m => m.perks.hp >= 3 ? null : 20 + m.perks.hp * 20, buy: m => m.perks.hp++, owned: m => `LV ${m.perks.hp}/3` },
  { id: 'gold', name: 'Glowstick Bundle', desc: '+20 starting glowsticks per level (max 3).', cost: m => m.perks.gold >= 3 ? null : 15 + m.perks.gold * 15, buy: m => m.perks.gold++, owned: m => `LV ${m.perks.gold}/3` },
  { id: 'satchel', name: 'Hydration Pack', desc: 'Start each night with an extra Water Bottle.', cost: m => m.perks.satchel ? null : 30, buy: m => { m.perks.satchel = true; }, owned: m => m.perks.satchel ? 'OWNED' : '' },
  { id: 'insight', name: 'Pre-Show Stretch', desc: '+1 max Vibe every night.', cost: m => m.perks.insight ? null : 90, buy: m => { m.perks.insight = true; }, owned: m => m.perks.insight ? 'OWNED' : '' },
  { id: 'r_schedule', name: "Gear: Juno's Laminated Schedule", desc: 'Adds to gear pool. Recover 8% after each fight.', cost: m => m.relics.includes('juno_schedule') ? null : 35, buy: m => m.relics.push('juno_schedule'), owned: m => m.relics.includes('juno_schedule') ? 'IN POOL' : '' },
  { id: 'r_totem', name: "Gear: Remy's Lost Totem", desc: 'Adds to gear pool. Enemies start Tired and Muffled.', cost: m => m.relics.includes('remy_totem') ? null : 50, buy: m => m.relics.push('remy_totem'), owned: m => m.relics.includes('remy_totem') ? 'IN POOL' : '' },
  { id: 'r_text', name: 'Gear: The Unsent Text', desc: 'Adds to gear pool. +20 Energy, +1 Vibe.', cost: m => m.relics.includes('unsent_text') ? null : 75, buy: m => m.relics.push('unsent_text'), owned: m => m.relics.includes('unsent_text') ? 'IN POOL' : '' },
];
