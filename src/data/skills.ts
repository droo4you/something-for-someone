import type { SkillDef } from '../types';
// el omitted = hero's genre. Dancing (basic attack) and Catching the Beat (defend) are built-in actions.
// Status words in descriptions: Feedback=burn, Muffled=soak, Drain=bleed, Dazzled=stun, Guard=shield, Hype=strength, Tired=weak, Spikes=thorns.
export const SKILLS: SkillDef[] = [
  // Bass Brawler starters
  { id: 'wobble_punch', name: 'Wobble Punch', cost: 1, rarity: 'common', desc: 'Deal 150% dmg. Apply 2 Feedback.', fx: [{ t: 'dmg', mult: 1.5 }, { t: 'status', key: 'burn', n: 2, to: 'enemy' }] },
  { id: 'sub_guard', name: 'Sub Guard', cost: 1, rarity: 'common', desc: 'Gain 10 Guard (+DEF). 1 Spikes.', fx: [{ t: 'shield', n: 10, defMult: 1 }, { t: 'status', key: 'thorns', n: 1, to: 'self' }] },
  { id: 'rattle_the_rig', name: 'Rattle the Rig', cost: 2, rarity: 'common', desc: 'Apply 4 Feedback to all enemies.', fx: [{ t: 'status', key: 'burn', n: 4, to: 'all' }] },
  // Flow Healer starters
  { id: 'hoop_lash', name: 'Hoop Lash', cost: 1, rarity: 'common', desc: 'Deal 140% dmg. Apply 2 Muffled.', fx: [{ t: 'dmg', mult: 1.4 }, { t: 'status', key: 'soak', n: 2, to: 'enemy' }] },
  { id: 'water_break', name: 'Water Break', cost: 2, rarity: 'common', desc: 'Recover 22% Energy. Cleanse.', fx: [{ t: 'heal', pct: 0.22 }, { t: 'cleanse' }] },
  { id: 'deep_house', name: 'Deep House', cost: 2, rarity: 'common', desc: 'Deal 90% dmg to all. Apply 1 Muffled.', fx: [{ t: 'dmg', mult: 0.9, aoe: true }, { t: 'status', key: 'soak', n: 1, to: 'all' }] },
  // Tempo Dancer starters
  { id: 'double_step', name: 'Double Step', cost: 1, rarity: 'common', desc: 'Hit twice for 75%. Apply 2 Drain.', fx: [{ t: 'dmg', mult: 0.75, hits: 2 }, { t: 'status', key: 'bleed', n: 2, to: 'enemy' }] },
  { id: 'footwork', name: 'Footwork', cost: 1, rarity: 'common', desc: 'Gain 6 Guard and 2 Hype.', fx: [{ t: 'shield', n: 6 }, { t: 'status', key: 'strength', n: 2, to: 'self' }] },
  { id: 'glowstick_jab', name: 'Glowstick Jab', cost: 0, rarity: 'common', desc: 'Deal 70% dmg. +15% crit.', fx: [{ t: 'dmg', mult: 0.7, critBonus: 0.15 }] },
  // Wall of Sound starters
  { id: 'kick_drum', name: 'Kick Drum', cost: 1, rarity: 'common', desc: 'Deal 120% dmg + 50% of your Guard.', fx: [{ t: 'dmg', mult: 1.2, perShield: 0.5 }] },
  { id: 'speaker_stance', name: 'Speaker Stance', cost: 1, rarity: 'common', desc: 'Gain 12 Guard (+2xDEF).', fx: [{ t: 'shield', n: 12, defMult: 2 }] },
  { id: 'hardstyle_stomp', name: 'Hardstyle Stomp', cost: 2, rarity: 'common', desc: 'Deal 100% to all. Tired 1.', fx: [{ t: 'dmg', mult: 1.0, aoe: true }, { t: 'status', key: 'weak', n: 1, to: 'all' }] },
  // Draft pool: festival magic power-ups
  { id: 'crowd_surf', name: 'Crowd Surf', cost: 1, rarity: 'common', el: 'none', desc: 'Deal 80% dmg to all enemies.', fx: [{ t: 'dmg', mult: 0.8, aoe: true }] },
  { id: 'second_wind', name: 'Second Wind', cost: 0, rarity: 'common', el: 'none', desc: 'Gain 2 Vibe. Recover 5% Energy.', fx: [{ t: 'energy', n: 2 }, { t: 'heal', pct: 0.05 }] },
  { id: 'barrier_hug', name: 'Barrier Hug', cost: 1, rarity: 'common', el: 'none', desc: 'Gain 14 Guard.', fx: [{ t: 'shield', n: 14 }] },
  { id: 'glowstick_crack', name: 'Glowstick Crack', cost: 1, rarity: 'common', el: 'none', desc: 'Snap, shake, go. Deal 60% dmg. Apply 4 Drain.', fx: [{ t: 'dmg', mult: 0.6 }, { t: 'status', key: 'bleed', n: 4, to: 'enemy' }] },
  { id: 'the_drop', name: 'The Drop', cost: 2, rarity: 'rare', el: 'fire', desc: 'Bass. Deal 220% dmg. Apply 3 Feedback.', fx: [{ t: 'dmg', mult: 2.2 }, { t: 'status', key: 'burn', n: 3, to: 'enemy' }] },
  { id: 'reverb_tail', name: 'Reverb Tail', cost: 1, rarity: 'rare', el: 'fire', desc: 'Double target Feedback, then deal 50%.', fx: [{ t: 'amplify', key: 'burn', factor: 2 }, { t: 'dmg', mult: 0.5 }] },
  { id: 'sprinkler', name: 'Sprinkler Dance', cost: 2, rarity: 'rare', el: 'water', desc: 'Flow. Hit all 3x for 45%. Muffled 1.', fx: [{ t: 'dmg', mult: 0.45, hits: 3, aoe: true }, { t: 'status', key: 'soak', n: 1, to: 'all' }] },
  { id: 'amen_break', name: 'Amen Break', cost: 2, rarity: 'rare', el: 'wind', desc: 'Tempo. Hit 4x for 50%, +10% crit.', fx: [{ t: 'dmg', mult: 0.5, hits: 4, critBonus: 0.1 }] },
  { id: 'gabber_kick', name: 'Gabber Kick', cost: 2, rarity: 'rare', el: 'earth', desc: 'Wall. Deal 200% dmg. Dazzle 1.', fx: [{ t: 'dmg', mult: 2.0 }, { t: 'status', key: 'stun', n: 1, to: 'enemy' }] },
  { id: 'bass_face', name: 'Bass Face', cost: 1, rarity: 'rare', el: 'none', desc: 'Make the face. Gain 3 Hype. Enemies Tired 2.', fx: [{ t: 'status', key: 'strength', n: 3, to: 'self' }, { t: 'status', key: 'weak', n: 2, to: 'all' }] },
  { id: 'kandi_trade', name: 'Kandi Trade', cost: 1, rarity: 'rare', el: 'none', desc: 'PLUR, but pointy. Gain 8 Guard and 3 Spikes.', fx: [{ t: 'shield', n: 8 }, { t: 'status', key: 'thorns', n: 3, to: 'self' }] },
  { id: 'hands_up', name: 'Hands in the Air', cost: 0, rarity: 'rare', el: 'none', desc: 'Gain 3 Vibe. Gain 1 Tired.', fx: [{ t: 'energy', n: 3 }, { t: 'status', key: 'weak', n: 1, to: 'self' }] },
  { id: 'laser_point', name: 'Laser Pointer', cost: 2, rarity: 'rare', el: 'none', desc: 'Deal 160% dmg, +40% crit.', fx: [{ t: 'dmg', mult: 1.6, critBonus: 0.4 }] },
  { id: 'wall_of_bass', name: 'Wall of Bass', cost: 3, rarity: 'epic', el: 'fire', desc: 'Deal 100% to all + 3 per Feedback they have.', fx: [{ t: 'dmg', mult: 1.0, aoe: true, perBurn: 3 }] },
  { id: 'sunrise_groove', name: 'Sunrise Groove', cost: 3, rarity: 'epic', el: 'water', desc: 'Deal 170% to all. Recover 15% Energy.', fx: [{ t: 'dmg', mult: 1.7, aoe: true }, { t: 'heal', pct: 0.15 }] },
  { id: 'jungle_rush', name: 'Jungle Rush', cost: 3, rarity: 'epic', el: 'wind', desc: 'Hit 6x for 55%. Apply 6 Drain.', fx: [{ t: 'dmg', mult: 0.55, hits: 6 }, { t: 'status', key: 'bleed', n: 6, to: 'enemy' }] },
  { id: 'reverse_bass', name: 'Reverse Bass', cost: 2, rarity: 'epic', el: 'earth', desc: 'Gain 18 Guard, then deal 100% + all Guard.', fx: [{ t: 'shield', n: 18 }, { t: 'dmg', mult: 1.0, perShield: 1 }] },
  { id: 'lighter_wave', name: 'Lighter-App Wave', cost: 2, rarity: 'epic', el: 'none', desc: 'Triple target Drain, then deal 60%.', fx: [{ t: 'amplify', key: 'bleed', factor: 3 }, { t: 'dmg', mult: 0.6 }] },
  { id: 'encore', name: 'ENCORE!', cost: 0, rarity: 'epic', el: 'none', desc: 'Gain 4 Vibe and 2 Hype.', fx: [{ t: 'energy', n: 4 }, { t: 'status', key: 'strength', n: 2, to: 'self' }] },
];
export const SKILL = Object.fromEntries(SKILLS.map(s => [s.id, s])) as Record<string, SkillDef>;
export const STARTERS = new Set(['wobble_punch','sub_guard','rattle_the_rig','hoop_lash','water_break','deep_house','double_step','footwork','glowstick_jab','kick_drum','speaker_stance','hardstyle_stomp']);
