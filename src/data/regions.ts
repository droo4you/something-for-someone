import type { RegionDef } from '../types';
export const REGIONS: RegionDef[] = [
  { id: 'meadow', name: 'Meadowfold Outskirts', sky: '#9fd3ff', ground: '#6bbf59', accent: '#f6e27a', boss: 'boss_scarecrow', enemyIds: ['puddle_slime', 'field_rat'], elite: 'elite_ogre' },
  { id: 'woods', name: 'Whispering Woods', sky: '#7aa88a', ground: '#2f6b3a', accent: '#c8f08a', boss: 'boss_elder_tree', enemyIds: ['moss_sprite', 'bark_wolf', 'field_rat'], elite: 'elite_witch' },
  { id: 'roads', name: 'Old Kingdom Roads', sky: '#e8c89a', ground: '#a88a5a', accent: '#d4af37', boss: 'boss_toll_lord', enemyIds: ['road_bandit', 'rust_knight', 'bark_wolf'], elite: 'elite_knight' },
  { id: 'ashen', name: 'Ashen Highlands', sky: '#8a5a5a', ground: '#4a3a3a', accent: '#ff7a2b', boss: 'boss_ash_wyrm', enemyIds: ['cinder_imp', 'ash_hound', 'road_bandit'], elite: 'elite_drake' },
  { id: 'frost', name: 'Frostmere Pass', sky: '#cfe8f8', ground: '#e8f2f8', accent: '#7ab8e8', boss: 'boss_frost_queen', enemyIds: ['frost_wisp', 'snow_yeti', 'gargoyle'], elite: 'elite_witch' },
  { id: 'marsh', name: 'Sunken Marsh', sky: '#6a7a6a', ground: '#3a4a2a', accent: '#a8c858', boss: 'boss_marsh_mother', enemyIds: ['bog_toad', 'reed_harpy', 'frost_wisp'], elite: 'elite_ogre' },
  { id: 'citadel', name: 'Ruined Citadel', sky: '#3a3a5a', ground: '#2a2a3a', accent: '#9a5af5', boss: 'boss_hollow_king', enemyIds: ['hollow_guard', 'gargoyle', 'rust_knight'], elite: 'elite_knight' },
];
export const FURTHER_MODIFIERS = [
  { id: 'thick', name: 'Thick Hides', desc: 'Enemies have +20% HP.' },
  { id: 'fury', name: 'Fury', desc: 'Enemies start with 1 Strength.' },
  { id: 'swift', name: 'Swift Winds', desc: 'Enemies have +3 SPD.' },
  { id: 'armored', name: 'Armored', desc: 'Enemies start with 8 Shield.' },
];
