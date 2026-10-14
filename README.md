# Something for Someone

A single-hero, turn-based roguelite about an endless journey across a medieval fantasy land, in pursuit of *Something*. Nobody knows what it is.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + single-file build -> dist/index.html
npm run preview    # serve dist/ at http://localhost:4173
npm test           # content checks + headless balance/softlock simulation
```
`dist/index.html` is one self-contained file: JS, CSS and the Press Start 2P pixel font are all inlined. Serve it from any static server, or open it straight from disk. If the font can't load, it falls back to a monospace font. There is no backend, and progress is saved in `localStorage`.

## Controls
| Where | Desktop | Mobile |
|---|---|---|
| Combat | `1`-`4` skills, `A` attack, `D` defend, `←/→`/`Tab` change target, `F` speed x1/x3 | tap skills, tap an enemy to target |
| Map | `1`-`n` pick a reachable stop | tap a glowing stop |
| Rewards / events | `1`-`3` choose, `S` skip reward | tap |
| Anywhere | `M` mute, `Enter` continue on most screens | SOUND button |

## Design overview
- **Loop:** hero select → region map (10 stops, branching) → battles / elites / campfires / merchants / wanderer events / treasure / shrines → region guardian (phase change at 50% HP) → next region. After all 7 regions the road loops into the **Further Lands**: same regions, steeper scaling, stacking modifiers (Thick Hides, Fury, Swift Winds, Armored) and Further-Lands-only lore.
- **Combat:** turn order comes from SPD (Soak cuts it by 30%) and is shown in the turn bar. Every enemy shows its next intent. Attack and Defend each give +1 Energy, you also gain +1 at the start of each turn, and skills spend it. Statuses: Burn, Soak, Bleed (stacks), Stun (bosses resist 50%), Shield, Strength/Weak, Thorns. Elements loop Fire > Wind > Earth > Water > Fire, at 1.5x when strong and 0.75x when weak, with a "Super effective!" popup. Crits shake the screen. Fights that drag past round 14 make enemies Impatient (rising ATK), so a fight can never stall forever.
- **Build:** after each fight you pick 1 of 3 rewards (new skill, skill upgrade or relic) at Common, Rare or Epic rarity, or skip for gold. You can hold at most 4 skills, so a 5th asks you to replace one. Synergies include Burn stacking (Kindle, Pyre, Inferno, Tinderbox, Phoenix Ash), Bleed (Serrate, Hemorrhage, Jagged Fang), Shield and Thorns (Stone Skin, Aegis Slam, Bramble Mail), Energy loops (Focus, Overdrive, Echo Bell, Pulse Gem) and crits (Hawk Eye, Storm Crown, Assassinate).
- **Heroes:** Ember Knight, Tide Mystic, Gale Rogue, plus Stone Warden, who unlocks with Embers. Each one evolves after the 1st and 3rd guardian, gaining a new title, stats, an upgraded passive and a new look.
- **Score:** Distance = regions × 10 + stops. The summary screen shows distance, build, lore found, Embers earned, and the **seed** (use "Replay seed" or type it into hero select). Maps, encounters and rewards are derived from the seed.
- **Meta (localStorage):** Embers of Hope unlock the 4th hero, small perks (HP, gold, a starting potion, +1 Energy) and 3 extra relics for the pool. The Journal keeps lore fragments, guardian last words, best distance per hero and total journeys.
- **Content:** 32 skills, 20 relics, 4 potions, 14 regular enemies, 4 elites, 7 guardians, 9 events, 22 lore fragments.
- **Art/audio:** all pixel sprites (chibi heroes, slimes, beasts, wisps, golems, birds, map icons) are drawn in code from string templates, and the region backdrops are generated procedurally. Sound effects are chiptune tones synthesized with WebAudio. There are no external assets.

## Code layout
```
src/data/      heroes, skills, relics, potions, enemies, regions, events, lore  (pure data, easy to reskin)
src/engine/    rng (seeded), battle (combat rules), run (map/rewards/nodes), meta (saves/upgrades), autoplay (AI)
src/ui/        sprites (pixel renderer), audio (SFX synth)
src/main.ts    screens + input
test/          sim.test.ts (vitest), shots.mjs + boss-flow.mjs (Playwright visual and UI flow checks)
```

## What I'd add next
1. Save and resume mid-journey (serialize the run to localStorage).
2. Unique pixel templates for every boss, with attack animations and per-region music loops.
3. More branch types: Further Lands-only enemies and relics, and cursed relics with an upside and a downside.
4. A daily seed with a local leaderboard, and shareable seed links.
5. Tooltips with keyword glossary on long-press for mobile, plus a settings screen (text speed, screen shake toggle).
6. A balance pass that uses the simulation to tune each hero's win rate per region.

## Art pipeline (v2)
All art is procedural pixel art; there are no image assets.
- `src/ui/pix.ts`: shapes are drawn as materials, then auto-shaded with a hue-shifted 4-tone ramp, a dithered terminator, highlights, and a selective dark outline.
- `src/ui/characters.ts`: the 48px chibi heroes, with evolution crests, capes, crowns and auras. Every enemy and elite has its own sprite. Bosses are 72-92px and each has a phase-2 form.
- `src/ui/spritecache.ts` and `anim.ts`: cached animation frames for idle, lunge, cast, hurt flash and death dissolve.
- `src/ui/scene.ts`: a low-res canvas at integer scale with a Bayer-dithered sky, parallax layers and region decorations. Also handles ambient particles, element VFX bursts, the screen flash and the title walker. Capped at 30fps.
- `src/ui/frames.ts`: 9-slice panels, buttons and rarity cards are generated on canvas and exposed as CSS variables.
- `src/ui/icons.ts`: pixel status and intent icons, plus the map medallions.
- Open `?gallery` to view every sprite, which is useful for QA.
