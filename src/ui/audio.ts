// Tiny electronic SFX synth on WebAudio: sub-bass kicks, wobbles, filtered noise sweeps. No assets.
let ctx: AudioContext | null = null; let muted = false; let master: GainNode | null = null;
export function setMuted(m: boolean) { muted = m; }
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.9; const comp = ctx.createDynamicsCompressor(); master.connect(comp).connect(ctx.destination); } catch { return null; } } if (ctx.state === 'suspended') ctx.resume(); return ctx; }
function out() { return master!; }
function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slide = 0, delay = 0, cutoff = 0) {
  const a = ac(); if (!a || muted) return;
  const t = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (cutoff) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t); f.Q.value = 8; o.connect(f).connect(g); } else o.connect(g);
  g.connect(out()); o.start(t); o.stop(t + dur + 0.02);
}
/** 808-style kick: sine with a fast pitch drop. */
function kick(vol = 0.22, delay = 0, from = 150) { const a = ac(); if (!a || muted) return; const t = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); o.connect(g).connect(out()); o.start(t); o.stop(t + 0.3); }
/** Noise burst through a sweeping band-pass (hats, risers, whooshes). */
function noise(dur: number, vol = 0.05, delay = 0, f0 = 6000, f1 = 6000, type: BiquadFilterType = 'highpass') {
  const a = ac(); if (!a || muted) return;
  const len = Math.floor(a.sampleRate * dur); const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const t = a.currentTime + delay; const s = a.createBufferSource(); s.buffer = buf; const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = a.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(out()); s.start(t);
}
/** Dubstep wobble: saw through an LFO-modulated low-pass. */
function wobble(freq: number, dur: number, rate = 8, vol = 0.06, delay = 0) {
  const a = ac(); if (!a || muted) return; const t = a.currentTime + delay;
  const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 10; f.frequency.value = 400;
  const lfo = a.createOscillator(); lfo.frequency.value = rate; const lg = a.createGain(); lg.gain.value = 700; lfo.connect(lg).connect(f.frequency);
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(out()); o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
}
export const sfx = {
  click: () => { tone(1320, 0.03, 'square', 0.025, 0, 0, 3000); noise(0.02, 0.02, 0, 9000, 9000); },
  hit: () => { kick(0.16, 0, 120); noise(0.06, 0.05, 0, 3000, 800, 'bandpass'); },
  crit: () => { kick(0.26, 0, 180); wobble(55, 0.28, 12, 0.07); noise(0.18, 0.06, 0, 8000, 400, 'lowpass'); },
  heal: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.045, 0, i * 0.05, 4000)); },
  shield: () => { tone(110, 0.18, 'sawtooth', 0.05, 110, 0, 900); noise(0.12, 0.03, 0, 400, 4000, 'bandpass'); },
  status: () => tone(330, 0.1, 'square', 0.03, -160, 0, 1800),
  coin: () => { tone(1568, 0.04, 'square', 0.03, 0, 0, 5000); tone(2093, 0.08, 'square', 0.03, 0, 0.04, 5000); },
  die: () => { noise(0.5, 0.06, 0, 6000, 120, 'lowpass'); tone(220, 0.45, 'sawtooth', 0.05, -190, 0, 1200); },
  win: () => { [0, 0.15, 0.3].forEach(d => kick(0.18, d)); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'sawtooth', 0.04, 0, 0.15 + i * 0.08, 2600)); },
  lose: () => { noise(0.9, 0.05, 0, 4000, 80, 'lowpass'); [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.06, -20, i * 0.2, 1400)); },
  step: () => { kick(0.08, 0, 90); },
  boss: () => { noise(1.1, 0.05, 0, 200, 9000, 'bandpass'); [0, 0.27, 0.54, 0.81].forEach((d, i) => kick(0.12 + i * 0.03, d)); wobble(49, 0.6, 6, 0.06, 1.05); kick(0.3, 1.05, 200); },
  evolve: () => { noise(0.6, 0.04, 0, 300, 10000, 'bandpass'); [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.035, 0, 0.3 + i * 0.06, 3500)); kick(0.24, 0.66); },
  drop: () => { noise(0.8, 0.06, 0, 300, 12000, 'bandpass'); kick(0.32, 0.8, 220); wobble(41, 0.9, 4, 0.09, 0.8); },
};
