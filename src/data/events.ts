import type { EventDef } from '../types';
// Lost Crew Sightings and other festival encounters.
export const EVENTS: EventDef[] = [
  { id: 'remy_sighting', title: 'Lost Crew Sighting: Big Remy?', text: 'Someone swears a gentle giant was here ten minutes ago, asking everyone if they had seen a pool noodle. There is a trampled flyer on the ground.', choices: [
    { label: 'Follow the trail of hugs', result: 'Every stranger you pass says "he went that way" and hands you a glowstick.', fx: { gold: 40, lore: true } },
    { label: 'Write "REMY WAS HERE" on the flyer', result: 'It feels like leaving a light on. Your steps get steadier.', fx: { atk: 1 } } ] },
  { id: 'kandi_kid', title: 'The Kandi Kid', text: 'A kid in a hand-knitted rainbow hat holds out a stack of bead bracelets. "Trade? It\'s a whole thing. Peace, love, unity, respect."', choices: [
    { label: 'Trade your last glowsticks (-20)', result: 'You do the handshake wrong. They love it. They press a piece of gear into your palm.', fx: { gold: -20, relic: true } },
    { label: 'Ask if they have seen your crew', result: '"Everyone here is your crew, kind of? But also, yes, a girl with buns went toward the lasers."', fx: { lore: true, hpPct: 0.1 } } ] },
  { id: 'lost_found_bin', title: 'Unattended Lost & Found Bin', text: 'A plastic bin overflowing with single shoes, fans, and bucket hats. Something at the bottom is blinking.', choices: [
    { label: 'Dig for the blinking thing', result: 'A piece of gear, still warm.', fx: { relic: true }, chance: 0.6, fail: 'It was a camera drone. It is upset.', failFx: { hpPct: -0.2 } },
    { label: 'Leave it for its owner', result: 'Karma noted. You walk on lighter.', fx: {} } ] },
  { id: 'hammock_dream', title: 'Hammock Grove', text: 'Between two glowing trees a hammock sways, empty, like it has been waiting for you. The bass from a far stage sounds like a heartbeat.', choices: [
    { label: 'Lie down for one song', result: 'You dream a move you never practised. You wake up still knowing it.', fx: { skill: true, lore: true } },
    { label: 'Lie down for three songs', result: 'Deep rest. The trees hum along.', fx: { hpPct: 0.3 } } ] },
  { id: 'vip_bouncer', title: 'The VIP Rope', text: 'A bouncer with a clipboard blocks a shortcut. "VIP only. Or 30 glowsticks. Or you can try me."', choices: [
    { label: 'Pay (-30 glowsticks)', result: 'The rope lifts. The VIP area is just a slightly nicer porta-potty.', fx: { gold: -30 } },
    { label: 'Dance-battle your way through', result: 'The clipboard comes down. So do the Drained behind it.', fx: { fight: true } } ] },
  { id: 'tilly_text', title: 'Lost Crew Sighting: Tilly?', text: 'Your phone buzzes. A photo from Tilly that will not load. Behind you, a balloon is stuck in a tree, shaped like a sun.', choices: [
    { label: 'Climb up for the balloon', result: 'You get scratched, but you get it. Tied to the string is a smooth stone painted "4 luck".', fx: { hpPct: -0.1, maxHp: 8, lore: true } },
    { label: 'Leave it, it is free now', result: 'It drifts toward the main stage. You find dropped glowsticks underneath.', fx: { gold: 15 } } ] },
  { id: 'free_samples', title: 'Electrolyte Sample Booth', text: 'A cheerful booth with a hand-painted sign: "FREE HYDRATION. YOU LOOK THIRSTY. NO OFFENCE."', choices: [
    { label: 'Take a sample to go', result: 'They hand you a sealed bottle and a thumbs up.', fx: { potion: true } },
    { label: 'Chug it right there', result: 'Your whole body says thank you.', fx: { maxHp: 12 }, chance: 0.5, fail: 'Brain freeze. A big one.', failFx: { hpPct: -0.15 } } ] },
  { id: 'old_raver', title: 'The Veteran', text: 'A raver in a faded 1999 shirt is stretching beside a speaker. "First Nocturne? Want a tip from someone who has been to forty?"', choices: [
    { label: 'Learn the old footwork (-15% Energy)', result: 'Your legs burn. Your moves get sharper.', fx: { hpPct: -0.15, upgrade: true } },
    { label: 'Ask about THE SET', result: '"Chased it for twenty years. Never heard it. Best twenty years of my life."', fx: { lore: true } } ] },
  { id: 'mirror_tent', title: 'The Hall of Mirrors Tent', text: 'Inside, your reflection is dancing a beat ahead of you. It is holding a glowing wristband.', choices: [
    { label: 'Reach into the mirror', result: 'Your hand comes back full of glowsticks, cold and real.', fx: { gold: 60 }, chance: 0.7, fail: 'Your reflection pinches you. Hard.', failFx: { hpPct: -0.2 } },
    { label: 'Ask your reflection where everyone went', result: 'It points behind you, then mouths a word. You almost read it.', fx: { lore: true } } ] },
  { id: 'paz_voice', title: 'Lost Crew Sighting: Paz?', text: 'Someone hands you their phone: "Your friend left you a voice note on MY phone??" It is forty seconds of bass and laughing.', choices: [
    { label: 'Dance to it', result: 'For forty seconds, you are with your crew.', fx: { hpPct: 0.2, lore: true } },
    { label: 'Thank the stranger with a glowstick (-10)', result: 'They hug you. They insist you take their spare snacks.', fx: { gold: -10, potion: true } } ] },
];
