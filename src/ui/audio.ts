// Tiny chiptune SFX synth on WebAudio. No assets.
let ctx: AudioContext | null = null; let muted = false;
export function setMuted(m: boolean) { muted = m; }
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; } } if (ctx.state === 'suspended') ctx.resume(); return ctx; }
function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slide = 0, delay = 0) {
  const a = ac(); if (!a || muted) return;
  const t = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol = 0.05, delay = 0) {
  const a = ac(); if (!a || muted) return;
  const len = Math.floor(a.sampleRate * dur); const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource(); s.buffer = buf; const g = a.createGain(); g.gain.value = vol; s.connect(g).connect(a.destination); s.start(a.currentTime + delay);
}
export const sfx = {
  click: () => tone(660, 0.05, 'square', 0.04),
  hit: () => { noise(0.08, 0.06); tone(220, 0.08, 'square', 0.05, -120); },
  crit: () => { noise(0.15, 0.09); tone(440, 0.15, 'sawtooth', 0.06, -300); },
  heal: () => { tone(523, 0.08, 'triangle', 0.06); tone(784, 0.12, 'triangle', 0.06, 0, 0.08); },
  shield: () => tone(330, 0.12, 'triangle', 0.06, 200),
  status: () => tone(300, 0.08, 'square', 0.03, -100),
  coin: () => { tone(988, 0.05, 'square', 0.04); tone(1319, 0.1, 'square', 0.04, 0, 0.05); },
  die: () => tone(400, 0.35, 'square', 0.05, -350),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.05, 0, i * 0.1)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, 0, i * 0.18)),
  step: () => tone(180, 0.04, 'triangle', 0.05),
  boss: () => [196, 185, 175, 165].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.04, 0, i * 0.2)),
  evolve: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.1, 'square', 0.045, 0, i * 0.07)),
};
