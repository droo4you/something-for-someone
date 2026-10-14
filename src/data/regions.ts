import type { RegionDef } from '../types';
export const REGIONS: RegionDef[] = [
  { id: 'lot', name: 'Parking Lot Pregame', sky: '#1a1440', ground: '#2a2838', accent: '#ff6ad8', boss: 'boss_megaphone', enemyIds: ['glitter_gloop', 'tailgate_drained'], elite: 'elite_security' },
  { id: 'gates', name: 'Entry Gates', sky: '#181a48', ground: '#2a2a3a', accent: '#6affd8', boss: 'boss_mxrror', enemyIds: ['wristband_wraith', 'gate_drone', 'tailgate_drained'], elite: 'elite_porta' },
  { id: 'forest', name: 'Forest Stage', sky: '#0e2030', ground: '#1a3a30', accent: '#b8ff6a', boss: 'boss_kaleido', enemyIds: ['flower_crown_drained', 'moss_bouncer', 'gate_drone'], elite: 'elite_pyro' },
  { id: 'silent', name: 'Silent Disco', sky: '#100a2a', ground: '#1e1838', accent: '#ff4a8a', boss: 'boss_nullpointer', enemyIds: ['static_shusher', 'headphone_ghoul', 'flower_crown_drained'], elite: 'elite_tube' },
  { id: 'tent', name: 'Bass Tent', sky: '#1a0a28', ground: '#2a1a30', accent: '#3ae8ff', boss: 'boss_baron', enemyIds: ['fog_phantom', 'subwoofer_stack', 'camera_drone'], elite: 'elite_porta' },
  { id: 'ferris', name: 'Ferris Wheel', sky: '#20103a', ground: '#2a2040', accent: '#ffe03a', boss: 'boss_ringmaster', enemyIds: ['balloon_drained', 'neon_moth', 'fog_phantom'], elite: 'elite_security' },
  { id: 'main', name: 'Main Stage 3AM', sky: '#08061a', ground: '#16122a', accent: '#c86aff', boss: 'boss_subsonic', enemyIds: ['barricade_drained', 'camera_drone', 'moss_bouncer'], elite: 'elite_pyro' },
];
/** Reaching depth 7 means you made it to the Sunrise Set stage; after that the night loops as Afterhours. */
export const SUNRISE_DEPTH = 7;
export const FURTHER_MODIFIERS = [
  { id: 'thick', name: 'Second Wind Crowd', desc: 'Enemies have +20% Energy.' },
  { id: 'fury', name: 'Peak Hour', desc: 'Enemies start with 1 Hype.' },
  { id: 'swift', name: 'Double-Time', desc: 'Enemies have +3 SPD.' },
  { id: 'armored', name: 'Front Row', desc: 'Enemies start with 8 Guard.' },
];
