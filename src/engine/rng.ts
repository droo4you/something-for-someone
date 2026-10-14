export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export class RNG {
  s: number;
  constructor(seed: number | string) { this.s = typeof seed === 'string' ? hashStr(seed) : seed >>> 0; }
  next(): number { let t = (this.s = (this.s + 0x6d2b79f5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  int(a: number, b: number) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p: number) { return this.next() < p; }
  weighted<T>(items: [T, number][]): T { const tot = items.reduce((a, b) => a + b[1], 0); let r = this.next() * tot; for (const [v, w] of items) { if ((r -= w) < 0) return v; } return items[items.length - 1][0]; }
  shuffle<T>(arr: T[]): T[] { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
}
export function newSeed(): string { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
