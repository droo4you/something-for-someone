import type { EventDef } from '../types';
export const EVENTS: EventDef[] = [
  { id: 'signpost', title: 'The Blank Signpost', text: 'A signpost with every arrow scratched out except one. Under it, carved small: "THIS WAY TO".', choices: [
    { label: 'Follow the arrow', result: 'The path is easier than it looks. You find a coin purse in the grass.', fx: { gold: 40, lore: true } },
    { label: 'Carve your own words', result: 'You write "SOMETHING". Your hands feel steadier.', fx: { atk: 1 } } ] },
  { id: 'stranger', title: 'A Stranger at the Well', text: 'A hooded traveler draws water. "You look like someone who is looking," they say.', choices: [
    { label: 'Share your bread (-20 gold)', result: 'They smile and press a trinket into your palm.', fx: { gold: -20, relic: true } },
    { label: 'Ask what they are looking for', result: '"The same as you. Except I think mine is behind me."', fx: { lore: true, hpPct: 0.1 } } ] },
  { id: 'cursed_chest', title: 'An Ornate Chest', text: 'A chest sits alone in the road. It hums faintly.', choices: [
    { label: 'Open it', result: 'Treasure! A relic gleams inside.', fx: { relic: true }, chance: 0.6, fail: 'It bites. Hard.', failFx: { hpPct: -0.2 } },
    { label: 'Leave it', result: 'Wise, maybe. You walk on.', fx: {} } ] },
  { id: 'dream', title: 'A Dream of Doors', text: 'You doze by the road and dream of a hall of doors. One is warm.', choices: [
    { label: 'Open the warm door', result: 'You wake remembering a technique you never learned.', fx: { skill: true, lore: true } },
    { label: 'Keep dreaming', result: 'You rest deeply.', fx: { hpPct: 0.3 } } ] },
  { id: 'bandit_toll', title: 'A Rickety Toll', text: 'Two bandits block a bridge. "Toll\'s 30 gold, or your teeth."', choices: [
    { label: 'Pay (-30 gold)', result: 'They let you pass, slightly disappointed.', fx: { gold: -30 } },
    { label: 'Fight', result: 'They draw blades.', fx: { fight: true } } ] },
  { id: 'shrine_child', title: 'The Child and the Kite', text: 'A child\'s kite is stuck in a tall tree.', choices: [
    { label: 'Climb for it', result: 'You fall once, but get it. The child gives you a smooth stone "for luck".', fx: { hpPct: -0.1, maxHp: 8, lore: true } },
    { label: 'Tell them it is gone', result: 'They cry. You feel lighter of pocket and heavier of heart.', fx: { gold: 15 } } ] },
  { id: 'alchemist', title: 'Wandering Alchemist', text: 'A cart rattles with bottles. "Free sample! Mostly safe!"', choices: [
    { label: 'Take a sample', result: 'It is a real potion.', fx: { potion: true } },
    { label: 'Drink it on the spot', result: 'Power surges through you.', fx: { maxHp: 12 }, chance: 0.5, fail: 'You turn green for an hour.', failFx: { hpPct: -0.15 } } ] },
  { id: 'old_knight', title: 'The Retired Knight', text: 'An old knight sharpens a sword he will never use again. "Want a lesson?"', choices: [
    { label: 'Train (-15% HP)', result: 'Your technique improves.', fx: { hpPct: -0.15, upgrade: true } },
    { label: 'Ask about Something', result: '"I chased it forty years. Best forty years of my life."', fx: { lore: true } } ] },
  { id: 'mirror_pool', title: 'The Mirror Pool', text: 'Your reflection does not quite match you. It is holding something.', choices: [
    { label: 'Reach in', result: 'Your hand closes on gold, cold and real.', fx: { gold: 60 }, chance: 0.7, fail: 'The water bites with ice.', failFx: { hpPct: -0.2 } },
    { label: 'Ask the reflection', result: 'It mouths a word. You almost read it.', fx: { lore: true } } ] },
];
