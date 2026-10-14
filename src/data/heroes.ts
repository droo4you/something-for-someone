import type { HeroDef } from '../types';
// Elements are internal keys: fire = Bass, water = Flow, wind = Tempo, earth = Wall.
// hp = Energy, energy = max Vibe.
export const HEROES: HeroDef[] = [
  { id: 'bass', name: 'Bass Brawler', el: 'fire', hp: 78, atk: 11, def: 4, spd: 10, energy: 3, crit: 0.05,
    skills: ['wobble_punch', 'sub_guard', 'rattle_the_rig'], passive: 'rattle', passiveDesc: 'Rattle: hits apply 1 Feedback.',
    evo: [ { title: 'Subwoofer Scrapper', hp: 0, atk: 0, def: 0, spd: 0, passiveDesc: 'Rattle: hits apply 1 Feedback.' },
           { title: 'Bass Brawler', hp: 15, atk: 3, def: 1, spd: 1, passiveDesc: 'Rattle+: hits apply 2 Feedback.' },
           { title: 'Earthquake Headliner', hp: 25, atk: 5, def: 2, spd: 2, passiveDesc: 'Rattle++: hits apply 2 Feedback; Feedback deals +1.' } ],
    pal: { h: '#ff3ec8', s: '#f6c9a0', b: '#2a2238', a: '#b04aff', w: '#e0e0ff', e: '#1a1028', o: '#140c1c' } },
  { id: 'flow', name: 'Flow Healer', el: 'water', hp: 70, atk: 10, def: 3, spd: 11, energy: 4, crit: 0.05,
    skills: ['hoop_lash', 'water_break', 'deep_house'], passive: 'groove', passiveDesc: 'Groove: recover 5% Energy each turn.',
    evo: [ { title: 'Hula Hooper', hp: 0, atk: 0, def: 0, spd: 0, passiveDesc: 'Groove: recover 5% Energy each turn.' },
           { title: 'Flow Healer', hp: 12, atk: 3, def: 1, spd: 1, passiveDesc: 'Groove+: recover 6% Energy each turn.' },
           { title: 'Four-on-the-Floor Oracle', hp: 22, atk: 5, def: 2, spd: 2, passiveDesc: 'Groove++: recover 7%; overflow becomes Guard.' } ],
    pal: { h: '#3ae8ff', s: '#f3d2b3', b: '#f0f4ff', a: '#3ae8ff', w: '#b8f6ff', e: '#10203a', o: '#0c1424' } },
  { id: 'tempo', name: 'Tempo Dancer', el: 'wind', hp: 72, atk: 13, def: 3, spd: 15, energy: 3, crit: 0.22,
    skills: ['double_step', 'footwork', 'glowstick_jab'], passive: 'doubletime', passiveDesc: 'Double-Time: first skill each fight is free.',
    evo: [ { title: 'Shuffle Kid', hp: 0, atk: 0, def: 0, spd: 0, passiveDesc: 'Double-Time: first skill each fight is free.' },
           { title: 'Tempo Dancer', hp: 10, atk: 3, def: 1, spd: 2, passiveDesc: 'Double-Time+: first skill free, +10% crit.' },
           { title: '174 BPM Phantom', hp: 18, atk: 5, def: 1, spd: 3, passiveDesc: 'Double-Time++: first 2 skills free, +10% crit.' } ],
    pal: { h: '#b8ff3a', s: '#f1c7a1', b: '#26204a', a: '#b8ff3a', w: '#e0ffc0', e: '#141028', o: '#100c1c' } },
  { id: 'wall', name: 'Wall of Sound', el: 'earth', hp: 90, atk: 10, def: 6, spd: 8, energy: 3, crit: 0.05, locked: true,
    skills: ['kick_drum', 'speaker_stance', 'hardstyle_stomp'], passive: 'kickdrum', passiveDesc: 'Kick Drum: start fights with 12 Guard.',
    evo: [ { title: 'Barricade Kid', hp: 0, atk: 0, def: 0, spd: 0, passiveDesc: 'Kick Drum: start fights with 12 Guard.' },
           { title: 'Wall of Sound', hp: 18, atk: 2, def: 2, spd: 1, passiveDesc: 'Kick Drum+: start with 20 Guard.' },
           { title: 'Hardstyle Titan', hp: 30, atk: 4, def: 3, spd: 1, passiveDesc: 'Kick Drum++: start with 28 Guard, 2 Spikes.' } ],
    pal: { h: '#ff9a2a', s: '#e9be93', b: '#3a2a48', a: '#ffcf3a', w: '#ffe8b0', e: '#1c1020', o: '#140c18' } },
];
