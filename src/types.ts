export type Element = 'fire' | 'water' | 'wind' | 'earth' | 'none';
export type Rarity = 'common' | 'rare' | 'epic';
export type StatusKey = 'burn' | 'soak' | 'bleed' | 'stun' | 'shield' | 'strength' | 'weak' | 'thorns';

export type Effect =
  | { t: 'dmg'; mult: number; hits?: number; aoe?: boolean; el?: Element; critBonus?: number; perBurn?: number; perShield?: number }
  | { t: 'status'; key: StatusKey; n: number; to: 'self' | 'enemy' | 'all' }
  | { t: 'heal'; pct: number }
  | { t: 'shield'; n: number; defMult?: number }
  | { t: 'energy'; n: number }
  | { t: 'cleanse' }
  | { t: 'amplify'; key: StatusKey; factor: number };

export interface SkillDef { id: string; name: string; cost: number; rarity: Rarity; el?: Element; desc: string; fx: Effect[]; }
export interface OwnedSkill { id: string; up: boolean; }

export interface HeroDef {
  id: string; name: string; el: Element; hp: number; atk: number; def: number; spd: number; energy: number; crit: number;
  skills: string[]; passive: string; passiveDesc: string; locked?: boolean;
  evo: { title: string; hp: number; atk: number; def: number; spd: number; passiveDesc: string }[];
  pal: Record<string, string>;
}

export type Move =
  | { k: 'atk'; name: string; mult: number; hits?: number; status?: [StatusKey, number] }
  | { k: 'buff'; name: string; status: [StatusKey, number] }
  | { k: 'debuff'; name: string; status: [StatusKey, number] }
  | { k: 'guard'; name: string; n: number }
  | { k: 'heal'; name: string; pct: number };

export interface EnemyDef {
  id: string; name: string; el: Element; hp: number; atk: number; def: number; spd: number;
  shape: 'chibi' | 'slime' | 'beast' | 'wisp' | 'golem' | 'bird'; pal: Record<string, string>;
  moves: Move[]; phase2?: Move[]; tier: 'normal' | 'elite' | 'boss'; regions: number[]; lastWords?: string;
}

export interface RelicCtx { [k: string]: any }
export interface RelicDef {
  id: string; name: string; rarity: Rarity; desc: string; meta?: boolean;
  mods?: { crit?: number; burnBonus?: number; bleedBonus?: number; energyMax?: number; atkPct?: number; defFlat?: number; spd?: number; hpMax?: number; healPct?: number; goldPct?: number; thorns?: number; critMult?: number };
  onFightStart?: (c: RelicCtx) => void;
  onTurnStart?: (c: RelicCtx) => void;
  onKill?: (c: RelicCtx) => void;
  onSkill?: (c: RelicCtx) => void;
}

export interface PotionDef { id: string; name: string; desc: string; price: number; fx: Effect[]; }
export interface RegionDef { id: string; name: string; sky: string; ground: string; accent: string; boss: string; enemyIds: string[]; elite: string; }
export interface EventChoice { label: string; result: string; fx: { gold?: number; hpPct?: number; maxHp?: number; relic?: boolean; skill?: boolean; lore?: boolean; potion?: boolean; fight?: boolean; atk?: number; upgrade?: boolean }; chance?: number; fail?: string; failFx?: EventChoice['fx']; }
export interface EventDef { id: string; title: string; text: string; choices: EventChoice[]; }
