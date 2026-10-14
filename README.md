# Rave Rollers

*Neon Nocturne, last night.* Your crew is gone and your phone is at 2%. Somewhere past the main stage, Halcyon Ray might play THE SET. Nobody has ever heard it.

Rave Rollers is a turn-based roguelite in neon pixel art, built with Vite, TypeScript and a pixel font. It is a reskin and rebrand of *Something for Someone*.

## Play
```
npm install
npm run dev      # local
npm run build    # single-file dist/index.html
npm test         # vitest: sim balance + content checks (incl. a banned-substance-word check)
node test/shots.mjs [url]   # Playwright click-through + screenshots (needs `vite preview`)
```

## The night
- **Energy** is your HP. When it hits 0 you crash and wake up in the Medical Tent, or Back Home.
- **Vibe** pays for skills. You build it with **Dance** (attack) and **Catch the Beat** (defend).
- **Hydration** is a free action that heals a little and cleanses minor debuffs. Refill it at Water Stations.
- **Food** heals a lot and gives a buff for the whole fight, but it costs your turn. Buy it from the Food Truck.
- **Ravers:** Bass Brawler (Dubstep), Flow Healer (House), Tempo Dancer (DnB), and Wall of Sound (Hardstyle, unlocked with Afterglow). Genre wheel: Bass > Tempo > Wall > Flow > Bass.
- **Map stops:** Drained, Elite, Water Station, Food Truck, Lost Crew Sighting, Lost & Found, Totem Pole Shrine (Glimmerwick), DJ Boss.
- **Stages:** Parking Lot Pregame, Entry Gates, Forest Stage, Silent Disco, Bass Tent, Ferris Wheel, Main Stage 3AM, Sunrise Set, then the endless Afterhours loop.
- **DJ bosses** each have a gimmick: DJ Megaphone (hype), MXRROR (copies your last skill), Kaleido (you see double), DJ Nullpointer (glitches turn order), Baron Von Bassment (soaks Vibe), The Ringmaster (steals Hype), and Lady Subsonic (phase 2 is the drop).
- As the night goes on, things get stranger: the disco-ball moon comes out, the stages melt, and the Drained start to glitch.

Lore bible: `docs/LORE.md`. Power-ups are festival magic only, with no substance references.
