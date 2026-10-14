import type { EnemyDef } from '../types';
const P = (b: string, a: string, e = '#111', o = '#140f18') => ({ b, a, e, o, s: a, h: b, w: '#ddd' });
// Base stats are for region 0; the engine scales them by journey depth.
export const ENEMIES: EnemyDef[] = [
  // 0 Meadowfold Outskirts
  { id: 'puddle_slime', name: 'Puddle Slime', el: 'water', hp: 22, atk: 6, def: 0, spd: 7, shape: 'slime', pal: P('#5fb7e8', '#a9e2ff'), tier: 'normal', regions: [0],
    moves: [{ k: 'atk', name: 'Splash', mult: 1 }, { k: 'debuff', name: 'Drench', status: ['soak', 2] }] },
  { id: 'field_rat', name: 'Field Rat', el: 'earth', hp: 18, atk: 6, def: 0, spd: 12, shape: 'beast', pal: P('#9a7b5a', '#d8b48a'), tier: 'normal', regions: [0],
    moves: [{ k: 'atk', name: 'Nibble', mult: 0.6, hits: 2 }, { k: 'atk', name: 'Gnaw', mult: 1, status: ['bleed', 2] }] },
  // 1 Whispering Woods
  { id: 'moss_sprite', name: 'Moss Sprite', el: 'wind', hp: 24, atk: 7, def: 1, spd: 13, shape: 'wisp', pal: P('#7cc47a', '#d6f5a8'), tier: 'normal', regions: [1],
    moves: [{ k: 'atk', name: 'Leaf Dart', mult: 0.5, hits: 3 }, { k: 'heal', name: 'Photosynth', pct: 0.2 }] },
  { id: 'bark_wolf', name: 'Bark Wolf', el: 'earth', hp: 32, atk: 8, def: 1, spd: 11, shape: 'beast', pal: P('#5b4a3a', '#9a8a6a'), tier: 'normal', regions: [1],
    moves: [{ k: 'atk', name: 'Maul', mult: 1.2, status: ['bleed', 2] }, { k: 'buff', name: 'Howl', status: ['strength', 2] }] },
  // 2 Old Kingdom Roads
  { id: 'road_bandit', name: 'Road Bandit', el: 'none', hp: 34, atk: 9, def: 2, spd: 10, shape: 'chibi', pal: { h: '#3a3030', s: '#e0b08a', b: '#5a3e2b', a: '#a33', w: '#bbb', e: '#111', o: '#160f0f' }, tier: 'normal', regions: [2],
    moves: [{ k: 'atk', name: 'Shiv', mult: 1, status: ['bleed', 3] }, { k: 'guard', name: 'Duck', n: 10 }, { k: 'atk', name: 'Mug', mult: 1.4 }] },
  { id: 'rust_knight', name: 'Rust Knight', el: 'earth', hp: 42, atk: 9, def: 4, spd: 6, shape: 'chibi', pal: { h: '#8a5a3a', s: '#a08070', b: '#7a6a5a', a: '#b5651d', w: '#888', e: '#f33', o: '#1a1410' }, tier: 'normal', regions: [2],
    moves: [{ k: 'guard', name: 'Brace', n: 12 }, { k: 'atk', name: 'Heavy Swing', mult: 1.6 }] },
  // 3 Ashen Highlands
  { id: 'cinder_imp', name: 'Cinder Imp', el: 'fire', hp: 34, atk: 10, def: 1, spd: 14, shape: 'wisp', pal: P('#e8582b', '#ffd27a'), tier: 'normal', regions: [3],
    moves: [{ k: 'atk', name: 'Scorch', mult: 0.9, status: ['burn', 3] }, { k: 'atk', name: 'Flicker', mult: 0.5, hits: 3 }] },
  { id: 'ash_hound', name: 'Ash Hound', el: 'fire', hp: 44, atk: 11, def: 2, spd: 12, shape: 'beast', pal: P('#4a4040', '#e86a2b'), tier: 'normal', regions: [3],
    moves: [{ k: 'atk', name: 'Ember Bite', mult: 1.2, status: ['burn', 2] }, { k: 'buff', name: 'Smolder', status: ['strength', 2] }] },
  // 4 Frostmere Pass
  { id: 'frost_wisp', name: 'Frost Wisp', el: 'water', hp: 38, atk: 11, def: 2, spd: 13, shape: 'wisp', pal: P('#9fd8f5', '#ffffff'), tier: 'normal', regions: [4],
    moves: [{ k: 'debuff', name: 'Chill', status: ['soak', 3] }, { k: 'atk', name: 'Icicle', mult: 1.3 }] },
  { id: 'snow_yeti', name: 'Snowkin', el: 'water', hp: 56, atk: 12, def: 3, spd: 7, shape: 'golem', pal: P('#e8f2f8', '#8fb8d8'), tier: 'normal', regions: [4],
    moves: [{ k: 'atk', name: 'Avalanche Fist', mult: 1.5 }, { k: 'guard', name: 'Snow Pack', n: 14 }] },
  // 5 Sunken Marsh
  { id: 'bog_toad', name: 'Bog Toad', el: 'water', hp: 46, atk: 12, def: 2, spd: 9, shape: 'slime', pal: P('#5a7a3a', '#c8d878'), tier: 'normal', regions: [5],
    moves: [{ k: 'atk', name: 'Tongue Lash', mult: 1.1, status: ['weak', 1] }, { k: 'heal', name: 'Wallow', pct: 0.15 }] },
  { id: 'reed_harpy', name: 'Reed Harpy', el: 'wind', hp: 40, atk: 13, def: 1, spd: 15, shape: 'bird', pal: P('#6a8a6a', '#e0c070'), tier: 'normal', regions: [5],
    moves: [{ k: 'atk', name: 'Talon Rake', mult: 0.6, hits: 3, status: ['bleed', 2] }, { k: 'atk', name: 'Dive', mult: 1.5 }] },
  // 6 Ruined Citadel
  { id: 'hollow_guard', name: 'Hollow Guard', el: 'earth', hp: 60, atk: 13, def: 5, spd: 8, shape: 'chibi', pal: { h: '#444', s: '#556', b: '#3a3a4a', a: '#7a5af5', w: '#aaa', e: '#b8f', o: '#0f0f18' }, tier: 'normal', regions: [6],
    moves: [{ k: 'guard', name: 'Phalanx', n: 16 }, { k: 'atk', name: 'Halberd', mult: 1.5, status: ['bleed', 2] }] },
  { id: 'gargoyle', name: 'Gargoyle', el: 'wind', hp: 50, atk: 14, def: 4, spd: 12, shape: 'bird', pal: P('#6a6a72', '#a0a0b0'), tier: 'normal', regions: [6],
    moves: [{ k: 'atk', name: 'Stone Dive', mult: 1.4 }, { k: 'debuff', name: 'Petrify Gaze', status: ['stun', 1] }, { k: 'atk', name: 'Claw', mult: 0.7, hits: 2 }] },
  // Elites (any region)
  { id: 'elite_ogre', name: 'Bridge Ogre', el: 'earth', hp: 80, atk: 12, def: 3, spd: 6, shape: 'golem', pal: P('#7a8a4a', '#c8b878'), tier: 'elite', regions: [0, 1, 2, 3, 4, 5, 6],
    moves: [{ k: 'buff', name: 'Roar', status: ['strength', 3] }, { k: 'atk', name: 'Club', mult: 1.6 }, { k: 'atk', name: 'Stomp', mult: 1.0, status: ['stun', 1] }] },
  { id: 'elite_witch', name: 'Hedge Witch', el: 'water', hp: 64, atk: 11, def: 2, spd: 12, shape: 'chibi', pal: { h: '#5a2a6a', s: '#c8e0a8', b: '#2a1a3a', a: '#b05af5', w: '#7a5a3a', e: '#ff0', o: '#120a18' }, tier: 'elite', regions: [0, 1, 2, 3, 4, 5, 6],
    moves: [{ k: 'debuff', name: 'Hex', status: ['weak', 2] }, { k: 'atk', name: 'Bog Bolt', mult: 1.3, status: ['soak', 2] }, { k: 'heal', name: 'Brew', pct: 0.2 }] },
  { id: 'elite_knight', name: 'Black Knight', el: 'fire', hp: 90, atk: 13, def: 5, spd: 9, shape: 'chibi', pal: { h: '#111', s: '#333', b: '#1a1a1a', a: '#c0392b', w: '#ccc', e: '#f33', o: '#000' }, tier: 'elite', regions: [0, 1, 2, 3, 4, 5, 6],
    moves: [{ k: 'guard', name: 'Iron Stance', n: 18 }, { k: 'atk', name: 'Searing Edge', mult: 1.4, status: ['burn', 3] }, { k: 'atk', name: 'Execute', mult: 2.0 }] },
  { id: 'elite_drake', name: 'Gale Drake', el: 'wind', hp: 70, atk: 12, def: 2, spd: 16, shape: 'bird', pal: P('#3a8a8a', '#a8f0d8'), tier: 'elite', regions: [0, 1, 2, 3, 4, 5, 6],
    moves: [{ k: 'atk', name: 'Cyclone', mult: 0.5, hits: 4 }, { k: 'buff', name: 'Tailwind', status: ['strength', 2] }, { k: 'atk', name: 'Rend', mult: 1.2, status: ['bleed', 4] }] },
  // Bosses (one per region, phase change at 50%)
  { id: 'boss_scarecrow', name: 'The Scarecrow King', el: 'fire', hp: 95, atk: 9, def: 2, spd: 8, shape: 'chibi', pal: { h: '#d8b04a', s: '#e8d8a0', b: '#7a4a2a', a: '#e8692b', w: '#6a4a2a', e: '#f80', o: '#1a1008' }, tier: 'boss', regions: [0],
    lastWords: 'I guarded the fields for... someone. They never came back for the harvest.',
    moves: [{ k: 'atk', name: 'Pitchfork', mult: 1.2 }, { k: 'debuff', name: 'Crow Swarm', status: ['bleed', 3] }, { k: 'guard', name: 'Straw Wall', n: 12 }],
    phase2: [{ k: 'atk', name: 'Bonfire Heart', mult: 1.0, status: ['burn', 4] }, { k: 'atk', name: 'Harvest', mult: 1.7 }] },
  { id: 'boss_elder_tree', name: 'Elder Hollowbark', el: 'earth', hp: 120, atk: 10, def: 3, spd: 6, shape: 'golem', pal: P('#4a3a2a', '#6aa84a'), tier: 'boss', regions: [1],
    lastWords: 'Roots remember. The something you seek... it once slept beneath me.',
    moves: [{ k: 'atk', name: 'Root Lash', mult: 1.3, status: ['soak', 1] }, { k: 'heal', name: 'Sap', pct: 0.1 }, { k: 'guard', name: 'Bark Skin', n: 14 }],
    phase2: [{ k: 'atk', name: 'Thornstorm', mult: 0.6, hits: 3, status: ['bleed', 3] }, { k: 'buff', name: 'Old Growth', status: ['strength', 3] }] },
  { id: 'boss_toll_lord', name: 'The Toll Lord', el: 'none', hp: 160, atk: 12, def: 4, spd: 10, shape: 'chibi', pal: { h: '#d4af37', s: '#e0b08a', b: '#5a1a2a', a: '#d4af37', w: '#eee', e: '#111', o: '#180a0e' }, tier: 'boss', regions: [2],
    lastWords: 'Everyone pays to pass. You paid... with what you were looking for?',
    moves: [{ k: 'atk', name: 'Levy', mult: 1.3 }, { k: 'debuff', name: 'Tax', status: ['weak', 2] }, { k: 'guard', name: 'Hired Shields', n: 18 }],
    phase2: [{ k: 'atk', name: 'Debt Collector', mult: 0.8, hits: 3 }, { k: 'buff', name: 'Bribe Fate', status: ['strength', 3] }] },
  { id: 'boss_ash_wyrm', name: 'Ash Wyrm Vharl', el: 'fire', hp: 180, atk: 13, def: 3, spd: 11, shape: 'beast', pal: P('#3a2a2a', '#ff7a2b'), tier: 'boss', regions: [3],
    lastWords: 'I burned whole kingdoms looking for it too. Ash tells no secrets.',
    moves: [{ k: 'atk', name: 'Cinder Breath', mult: 1.0, status: ['burn', 4] }, { k: 'atk', name: 'Tail Sweep', mult: 1.4 }],
    phase2: [{ k: 'buff', name: 'Kindle Scales', status: ['strength', 3] }, { k: 'atk', name: 'Magma Torrent', mult: 1.2, status: ['burn', 6] }, { k: 'atk', name: 'Devour', mult: 1.8 }] },
  { id: 'boss_frost_queen', name: 'Rimeveil, Frost Queen', el: 'water', hp: 190, atk: 13, def: 4, spd: 12, shape: 'chibi', pal: { h: '#e8f8ff', s: '#cfe8f5', b: '#5a8ad8', a: '#b8f0ff', w: '#fff', e: '#36c', o: '#0e1420' }, tier: 'boss', regions: [4],
    lastWords: 'I froze my heart so I would stop wanting. Do not make my mistake.',
    moves: [{ k: 'atk', name: 'Glacier Lance', mult: 1.4 }, { k: 'debuff', name: 'Permafrost', status: ['soak', 3] }, { k: 'guard', name: 'Ice Mirror', n: 16 }],
    phase2: [{ k: 'debuff', name: 'Frozen Time', status: ['stun', 1] }, { k: 'atk', name: 'Blizzard', mult: 0.7, hits: 3 }, { k: 'heal', name: 'Rime Mend', pct: 0.08 }] },
  { id: 'boss_marsh_mother', name: 'Mother of the Mire', el: 'water', hp: 200, atk: 14, def: 3, spd: 9, shape: 'slime', pal: P('#3a5a3a', '#a8c858'), tier: 'boss', regions: [5],
    lastWords: 'Children drown chasing lights in the fog. The light was you, once.',
    moves: [{ k: 'atk', name: 'Engulf', mult: 1.3, status: ['weak', 1] }, { k: 'heal', name: 'Spawn', pct: 0.12 }],
    phase2: [{ k: 'atk', name: 'Mire Surge', mult: 1.0, status: ['soak', 3] }, { k: 'atk', name: 'Swallow Whole', mult: 1.9 }] },
  { id: 'boss_hollow_king', name: 'The Hollow King', el: 'earth', hp: 230, atk: 15, def: 5, spd: 10, shape: 'chibi', pal: { h: '#d4af37', s: '#3a3a4a', b: '#2a2a3a', a: '#9a5af5', w: '#ccc', e: '#c9f', o: '#08080f' }, tier: 'boss', regions: [6],
    lastWords: 'I had everything, and still I looked for Something. Keep walking, little one.',
    moves: [{ k: 'atk', name: 'Crown Strike', mult: 1.4 }, { k: 'guard', name: 'Throne of Bones', n: 20 }, { k: 'debuff', name: 'Edict', status: ['weak', 2] }],
    phase2: [{ k: 'buff', name: 'Empty Crown', status: ['strength', 4] }, { k: 'atk', name: 'Regicide', mult: 0.8, hits: 4 }, { k: 'debuff', name: 'Kneel', status: ['stun', 1] }] },
];
export const ENEMY = Object.fromEntries(ENEMIES.map(e => [e.id, e])) as Record<string, EnemyDef>;
