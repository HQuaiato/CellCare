import type { AgentId, ContamType, Difficulty, FlaskType, GameId, LineId, MarkerId, MediumId, Morph, Readout, ScopeMode } from './types';

/** 1 minuto real = 1 hora de jogo. Um dia no lab dura 24 minutos. */
export const OFFLINE_CAP_H = 12;
export const CELLS_PER_VIAL = 1e6;
export const SPEEDS = [0, 1, 4];
export const CURRENCY = '◈';

// ---------------------------------------------------------------- frascos

export const FLASKS: Record<FlaskType, { cap: number; vol: number; trypsin: number }> = {
  T25: { cap: 2.5e6, vol: 5, trypsin: 1 },
  T75: { cap: 7.5e6, vol: 15, trypsin: 3 },
  T175: { cap: 17.5e6, vol: 35, trypsin: 6 },
};
export const FLASK_TYPES: FlaskType[] = ['T25', 'T75', 'T175'];
export const SUSPENSION_MAX_DENSITY = 2e6;

// ---------------------------------------------------------------- meios

export interface MediumDef {
  /** bicarbonato, mM: define o pH em equilíbrio com o CO2 da estufa */
  hco3: number;
  /** glicose, mM */
  glc: number;
  /** fração de SFB no meio completo */
  serum: number;
  price: number;
}

export const MEDIA: Record<MediumId, MediumDef> = {
  MEM: { hco3: 26.2, glc: 5.6, serum: 0.1, price: 40 },
  DMEM: { hco3: 44, glc: 25, serum: 0.1, price: 50 },
  F12K: { hco3: 29.8, glc: 7, serum: 0.1, price: 70 },
  MCCOY: { hco3: 26.2, glc: 16.7, serum: 0.1, price: 65 },
  RPMI: { hco3: 23.8, glc: 11.1, serum: 0.1, price: 55 },
  EGM2: { hco3: 14, glc: 5.6, serum: 0.02, price: 320 },
  MTESR: { hco3: 29, glc: 17.5, serum: 0, price: 400 },
};
export const MEDIUM_ORDER = Object.keys(MEDIA) as MediumId[];

// ---------------------------------------------------------------- linhagens

export interface LineDef {
  name: string;
  medium: MediumId;
  /** tempo de duplicação, h */
  td: number;
  suspension: boolean;
  /** multiplica a capacidade do frasco (células pequenas cabem mais) */
  size: number;
  /** consumo de glicose, µmol / 10^6 células / h */
  glcRate: number;
  /** moedas por milhão de células */
  price: number;
  hue: number;
  level: number;
  /** sensibilidade a estresse e contaminação */
  sens: number;
  p53: 'wt' | 'inactive';
  maxPassage?: number;
  startPassage: number;
  /** morfologia: define o desenho da célula e a imagem no microscópio */
  morph: Morph;
  badge: string;
}

export const LINES: Record<LineId, LineDef> = {
  L929: { name: 'L929', medium: 'MEM', td: 24, suspension: false, size: 1.2, glcRate: 0.45, price: 6, hue: 95, level: 1, sens: 0.5, p53: 'wt', startPassage: 10, morph: 'spindle', badge: '🐭' },
  HeLa: { name: 'HeLa', medium: 'DMEM', td: 24, suspension: false, size: 1, glcRate: 0.6, price: 15, hue: 330, level: 1, sens: 0.7, p53: 'inactive', startPassage: 5, morph: 'polygonal', badge: '👑' },
  HEK293T: { name: 'HEK293T', medium: 'DMEM', td: 20, suspension: false, size: 1.4, glcRate: 0.55, price: 20, hue: 200, level: 2, sens: 1.1, p53: 'inactive', startPassage: 5, morph: 'cobblestone', badge: '🏭' },
  A549: { name: 'A549', medium: 'F12K', td: 22, suspension: false, size: 1, glcRate: 0.6, price: 22, hue: 140, level: 2, sens: 0.8, p53: 'wt', startPassage: 5, morph: 'cobblestone', badge: '🫁' },
  MCF7: { name: 'MCF-7', medium: 'MEM', td: 36, suspension: false, size: 1.2, glcRate: 0.4, price: 30, hue: 280, level: 3, sens: 1, p53: 'wt', startPassage: 5, morph: 'cobblestone', badge: '🎗️' },
  U2OS: { name: 'U2OS', medium: 'MCCOY', td: 30, suspension: false, size: 0.7, glcRate: 0.5, price: 28, hue: 30, level: 3, sens: 0.9, p53: 'wt', startPassage: 5, morph: 'flat', badge: '🦴' },
  MDA231: { name: 'MDA-MB-231', medium: 'DMEM', td: 32, suspension: false, size: 0.9, glcRate: 0.65, price: 34, hue: 300, level: 4, sens: 0.8, p53: 'inactive', startPassage: 5, morph: 'spindle', badge: '🎗️' },
  A375: { name: 'A375', medium: 'DMEM', td: 22, suspension: false, size: 1, glcRate: 0.55, price: 34, hue: 10, level: 4, sens: 0.8, p53: 'wt', startPassage: 5, morph: 'star', badge: '🌑' },
  U87: { name: 'U87 MG', medium: 'MEM', td: 34, suspension: false, size: 0.7, glcRate: 0.5, price: 38, hue: 250, level: 5, sens: 0.9, p53: 'wt', startPassage: 5, morph: 'star', badge: '🧠' },
  A172: { name: 'A172', medium: 'DMEM', td: 38, suspension: false, size: 0.8, glcRate: 0.45, price: 38, hue: 225, level: 5, sens: 0.9, p53: 'wt', startPassage: 5, morph: 'star', badge: '🧠' },
  Jurkat: { name: 'Jurkat', medium: 'RPMI', td: 28, suspension: true, size: 1, glcRate: 0.35, price: 40, hue: 50, level: 6, sens: 1, p53: 'inactive', startPassage: 5, morph: 'round', badge: '🩸' },
  MRC5: { name: 'MRC-5', medium: 'MEM', td: 30, suspension: false, size: 0.45, glcRate: 0.4, price: 60, hue: 40, level: 7, sens: 1.1, p53: 'wt', maxPassage: 28, startPassage: 12, morph: 'spindle', badge: '💉' },
  IMR90: { name: 'IMR-90', medium: 'MEM', td: 32, suspension: false, size: 0.45, glcRate: 0.4, price: 65, hue: 65, level: 7, sens: 1.1, p53: 'wt', maxPassage: 26, startPassage: 10, morph: 'spindle', badge: '⏳' },
  HDF: { name: 'HDF', medium: 'DMEM', td: 40, suspension: false, size: 0.4, glcRate: 0.45, price: 75, hue: 15, level: 8, sens: 1.2, p53: 'wt', maxPassage: 18, startPassage: 5, morph: 'spindle', badge: '✋' },
  HUVEC: { name: 'HUVEC', medium: 'EGM2', td: 30, suspension: false, size: 0.6, glcRate: 0.5, price: 120, hue: 355, level: 9, sens: 1.5, p53: 'wt', maxPassage: 9, startPassage: 2, morph: 'cobblestone', badge: '🫀' },
  iPSC: { name: 'iPSC', medium: 'MTESR', td: 22, suspension: false, size: 1.6, glcRate: 0.7, price: 220, hue: 170, level: 10, sens: 2, p53: 'wt', startPassage: 25, morph: 'colony', badge: '🌱' },
};
export const LINE_ORDER = Object.keys(LINES) as LineId[];

// ---------------------------------------------------------------- marcadores (transduções)

export interface MarkerDef {
  name: string;
  bonus: number;
  price: number;
  level: number;
  color: string;
}

export const MARKERS: Record<MarkerId, MarkerDef> = {
  H2B: { name: 'H2B-GFP', bonus: 0.3, price: 250, level: 2, color: '#4ade80' },
  LUC: { name: 'Luciferase', bonus: 0.4, price: 300, level: 3, color: '#eab308' },
  '53BP1': { name: '53BP1-mCherry', bonus: 0.6, price: 450, level: 3, color: '#f43f5e' },
  FUCCI: { name: 'FUCCI', bonus: 0.7, price: 500, level: 4, color: '#f97316' },
  LC3: { name: 'GFP-LC3', bonus: 0.5, price: 400, level: 5, color: '#22c55e' },
};
export const MARKER_ORDER = Object.keys(MARKERS) as MarkerId[];

// ---------------------------------------------------------------- agentes terapêuticos

export interface AgentDef {
  price: number;
  doses: number;
  level: number;
  needsIrradiator?: boolean;
}

export const AGENTS: Record<AgentId, AgentDef> = {
  cisplatin: { price: 110, doses: 5, level: 1 },
  etoposide: { price: 130, doses: 5, level: 2 },
  doxorubicin: { price: 150, doses: 5, level: 3 },
  radiation: { price: 0, doses: 0, level: 3, needsIrradiator: true },
  paclitaxel: { price: 170, doses: 5, level: 4 },
  hydroxyurea: { price: 90, doses: 5, level: 4 },
  temozolomide: { price: 160, doses: 5, level: 5 },
  rapamycin: { price: 190, doses: 5, level: 5 },
  chloroquine: { price: 100, doses: 5, level: 5 },
};
export const AGENT_ORDER = Object.keys(AGENTS) as AgentId[];

const DNA_DAMAGE: AgentId[] = ['cisplatin', 'etoposide', 'doxorubicin', 'radiation', 'temozolomide'];

// ---------------------------------------------------------------- achados científicos (relevância)

const FINDING_REL: Record<AgentId, Partial<Record<Readout, number>>> = {
  cisplatin: { MTT: 0.4, '53BP1': 0.85, FUCCI: 0.6, H2B: 0.5, LC3: 0.3, LUC: 0.45 },
  etoposide: { MTT: 0.4, '53BP1': 0.9, FUCCI: 0.7, H2B: 0.55, LC3: 0.3, LUC: 0.45 },
  doxorubicin: { MTT: 0.45, '53BP1': 0.8, FUCCI: 0.6, H2B: 0.65, LC3: 0.4, LUC: 0.45 },
  radiation: { MTT: 0.4, '53BP1': 1, FUCCI: 0.8, H2B: 0.65, LC3: 0.35, LUC: 0.6 },
  paclitaxel: { MTT: 0.45, FUCCI: 0.9, H2B: 0.9, '53BP1': 0.4, LC3: 0.35, LUC: 0.45 },
  hydroxyurea: { MTT: 0.3, FUCCI: 0.9, '53BP1': 0.6, H2B: 0.3 },
  temozolomide: { MTT: 0.5, '53BP1': 0.85, FUCCI: 0.8, H2B: 0.5, LC3: 0.7, LUC: 0.5 },
  rapamycin: { MTT: 0.3, LC3: 0.9, FUCCI: 0.65, LUC: 0.4 },
  chloroquine: { MTT: 0.3, LC3: 1, H2B: 0.3 },
};

/** chave do texto do achado + relevância (0–1) */
export function finding(agent: AgentId, readout: Readout, line: LineId) {
  let rel = FINDING_REL[agent][readout];
  const key = rel === undefined ? 'finding.none' : `finding.${agent}.${readout}`;
  rel ??= 0.2;
  if (agent === 'temozolomide' && (line === 'U87' || line === 'A172')) rel *= 1.3;
  const suffix =
    readout === 'FUCCI' && DNA_DAMAGE.includes(agent)
      ? LINES[line].p53 === 'wt'
        ? 'finding.p53wt'
        : 'finding.p53null'
      : null;
  return { key, suffix, rel };
}

export const JOURNAL_MIN = [1.1, 0.8, 0.5, 0];

// ---------------------------------------------------------------- contaminação

export const CONTAM: Record<ContamType, { level: number; growth: number; growthProtected: number }> = {
  bacteria: { level: 1, growth: 0.12, growthProtected: 0.03 },
  fungus: { level: 2, growth: 0.04, growthProtected: 0.01 },
  mycoplasma: { level: 4, growth: 0.012, growthProtected: 0.012 },
};

// ---------------------------------------------------------------- loja

export type ShopCat = 'passes' | 'cells' | 'media' | 'reagents' | 'protection' | 'plastics' | 'drugs' | 'virus' | 'equipment';
export const SHOP_CATS: ShopCat[] = ['passes', 'cells', 'media', 'reagents', 'protection', 'plastics', 'drugs', 'virus', 'equipment'];

export interface ShopItem {
  id: string;
  cat: ShopCat;
  price: number;
  level: number;
  inv?: string;
  qty?: number;
  unit?: 'mL' | 'un' | 'doses' | 'tests' | 'aliquot' | 'courses';
  special?: 'incubator' | 'irradiator' | 'scope' | 'co2' | 'vial' | 'pass';
  line?: LineId;
  medium?: MediumId;
  agent?: AgentId;
  marker?: MarkerId;
}

export const SHOP: ShopItem[] = [
  ...MEDIUM_ORDER.map<ShopItem>((m) => ({ id: `med_${m}`, cat: 'media', price: MEDIA[m].price, level: 1, inv: `med_${m}`, qty: 500, unit: 'mL', medium: m })),
  { id: 'FBS', cat: 'reagents', price: 90, level: 1, inv: 'FBS', qty: 50, unit: 'mL' },
  { id: 'trypsin', cat: 'reagents', price: 30, level: 1, inv: 'trypsin', qty: 100, unit: 'mL' },
  { id: 'PBS', cat: 'reagents', price: 15, level: 1, inv: 'PBS', qty: 500, unit: 'mL' },
  { id: 'DMSO', cat: 'reagents', price: 25, level: 1, inv: 'DMSO', qty: 50, unit: 'mL' },
  { id: 'MTT', cat: 'reagents', price: 100, level: 1, inv: 'MTT', qty: 10, unit: 'tests' },
  { id: 'penstrep', cat: 'protection', price: 25, level: 1, inv: 'penstrep', qty: 20, unit: 'mL' },
  { id: 'abx_high', cat: 'protection', price: 50, level: 1, inv: 'abx_high', qty: 3, unit: 'doses' },
  { id: 'ampho', cat: 'protection', price: 40, level: 2, inv: 'ampho', qty: 10, unit: 'mL' },
  { id: 'afx_high', cat: 'protection', price: 70, level: 2, inv: 'afx_high', qty: 3, unit: 'doses' },
  { id: 'myco_pcr', cat: 'protection', price: 80, level: 4, inv: 'myco_pcr', qty: 5, unit: 'tests' },
  { id: 'myco_treat', cat: 'protection', price: 180, level: 4, inv: 'myco_treat', qty: 2, unit: 'courses' },
  { id: 'flask_T25', cat: 'plastics', price: 25, level: 1, inv: 'flask_T25', qty: 10, unit: 'un' },
  { id: 'flask_T75', cat: 'plastics', price: 45, level: 1, inv: 'flask_T75', qty: 10, unit: 'un' },
  { id: 'flask_T175', cat: 'plastics', price: 50, level: 2, inv: 'flask_T175', qty: 5, unit: 'un' },
  { id: 'cryovial', cat: 'plastics', price: 25, level: 1, inv: 'cryovial', qty: 20, unit: 'un' },
  ...AGENT_ORDER.filter((a) => !AGENTS[a].needsIrradiator).map<ShopItem>((a) => ({ id: `drug_${a}`, cat: 'drugs', price: AGENTS[a].price, level: AGENTS[a].level, inv: `drug_${a}`, qty: AGENTS[a].doses, unit: 'doses', agent: a })),
  ...MARKER_ORDER.map<ShopItem>((m) => ({ id: `virus_${m}`, cat: 'virus', price: MARKERS[m].price, level: MARKERS[m].level, inv: `virus_${m}`, qty: 1, unit: 'aliquot', marker: m })),
  ...LINE_ORDER.map<ShopItem>((l) => ({ id: `vial_${l}`, cat: 'cells', price: Math.max(40, LINES[l].price * 12), level: LINES[l].level, special: 'vial', line: l })),
  { id: 'co2', cat: 'equipment', price: 50, level: 1, special: 'co2' },
  { id: 'incubator', cat: 'equipment', price: 1200, level: 2, special: 'incubator' },
  { id: 'scope', cat: 'equipment', price: 0, level: 1, special: 'scope' },
  { id: 'irradiator', cat: 'equipment', price: 3500, level: 3, special: 'irradiator' },
];

export const DISINFECT_COST = 20;

// ---------------------------------------------------------------- microscópios

export interface ScopeDef {
  id: ScopeMode;
  price: number;
  level: number;
  /** multiplica o impacto de artigos com leitura por imagem */
  impact: number;
}

export const SCOPES: ScopeDef[] = [
  { id: 'phase', price: 0, level: 1, impact: 1 },
  { id: 'fluo', price: 1800, level: 2, impact: 1 },
  { id: 'timelapse', price: 3500, level: 4, impact: 1.1 },
  { id: 'confocal', price: 7000, level: 6, impact: 1.3 },
  { id: 'superres', price: 15000, level: 8, impact: 1.6 },
  { id: 'electron', price: 25000, level: 10, impact: 1.8 },
];
export const hasScope = (tier: number, id: ScopeMode) => tier >= SCOPES.findIndex((x) => x.id === id);

// ---------------------------------------------------------------- passes

export type PassId = 'time12' | 'time48' | 'confluence' | 'autofeed' | 'shield' | 'lucky' | 'sale2x' | 'xp2x' | 'express' | 'cleanse' | 'telomerase';
export interface PassDef {
  id: PassId;
  icon: string;
  price: number;
  level: number;
  /** precisa de um frasco selecionado */
  flask?: boolean;
}

export const PASSES: PassDef[] = [
  { id: 'time12', icon: '⏩', price: 90, level: 1 },
  { id: 'time48', icon: '🚀', price: 300, level: 2 },
  { id: 'confluence', icon: '📈', price: 70, level: 1, flask: true },
  { id: 'autofeed', icon: '🤖', price: 220, level: 2 },
  { id: 'shield', icon: '🛡️', price: 140, level: 2 },
  { id: 'lucky', icon: '🍀', price: 180, level: 1 },
  { id: 'sale2x', icon: '🏷️', price: 160, level: 2 },
  { id: 'xp2x', icon: '☕', price: 110, level: 1 },
  { id: 'express', icon: '⚡', price: 120, level: 2, flask: true },
  { id: 'cleanse', icon: '✨', price: 260, level: 2, flask: true },
  { id: 'telomerase', icon: '🧬', price: 400, level: 7, flask: true },
];

// ---------------------------------------------------------------- minijogos

export const GAMES: { id: GameId; icon: string; rate: number; cap: number }[] = [
  { id: 'drop', icon: '🍬', rate: 1, cap: 120 },
  { id: 'whack', icon: '🦠', rate: 2, cap: 120 },
  { id: 'memory', icon: '🧠', rate: 1, cap: 80 },
  { id: 'count', icon: '🔢', rate: 1, cap: 60 },
  { id: 'tips', icon: '📦', rate: 2, cap: 110 },
  { id: 'pipette', icon: '💉', rate: 1, cap: 60 },
  { id: 'mix', icon: '⚗️', rate: 0, cap: 0 },
];

// ---------------------------------------------------------------- dificuldade

export interface DifficultyDef {
  /** risco de contaminação */
  contam: number;
  /** preços da loja */
  price: number;
  /** valor das vendas */
  sell: number;
  /** mortalidade por estresse */
  death: number;
  stipend: number;
  games: number;
  xp: number;
  startMoney: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { contam: 0.5, price: 0.8, sell: 1.15, death: 0.8, stipend: 1.5, games: 1.2, xp: 1, startMoney: 400 },
  normal: { contam: 1, price: 1, sell: 1, death: 1, stipend: 1, games: 1, xp: 1, startMoney: 250 },
  hard: { contam: 2, price: 1.35, sell: 0.9, death: 1.2, stipend: 0.6, games: 0.9, xp: 1.25, startMoney: 180 },
  expert: { contam: 3.5, price: 1.75, sell: 0.8, death: 1.4, stipend: 0.3, games: 0.8, xp: 1.5, startMoney: 120 },
};
export const DIFFICULTY_ORDER = Object.keys(DIFFICULTIES) as Difficulty[];
export const diff = (s: { difficulty?: Difficulty }) => DIFFICULTIES[s.difficulty ?? 'normal'];

/** Receita do meio completo feito na bancada (porcentagens de 500 mL). */
export const MIX_VOLUME = 500;
export function mixRecipe(m: MediumId) {
  const serum = MEDIA[m].serum * 100;
  return [
    { id: 'basal', pct: 100 - serum - 2 },
    { id: 'fbs', pct: serum },
    { id: 'gln', pct: 1 },
    { id: 'ps', pct: 1 },
  ];
}
/** jogadas no mesmo dia de jogo rendem menos: 100%, 100%, 100%, 50%, 50%, 50%, 20%... */
export const gameMult = (plays: number) => (plays < 3 ? 1 : plays < 6 ? 0.5 : 0.2);
export const EARLY_UNLOCK_MULT = 2.5;

SHOP.unshift(...PASSES.map<ShopItem>((p) => ({ id: `pass_${p.id}`, cat: 'passes', price: p.price, level: p.level, inv: `pass_${p.id}`, qty: 1, unit: 'un', special: 'pass' })));

// ---------------------------------------------------------------- níveis

export const LEVELS = [0, 100, 250, 500, 900, 1500, 2400, 3600, 5200, 7500, 10000, 14000];

export function levelOf(xp: number) {
  let lv = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lv = i + 1;
  return lv;
}

export function levelProgress(xp: number) {
  const lv = levelOf(xp);
  const lo = LEVELS[lv - 1];
  const hi = LEVELS[lv] ?? lo + 5000;
  return { lv, lo, hi, pct: (xp - lo) / (hi - lo) };
}

/** Lista para interpolação: nomes próprios crus, demais como "@chave". */
export function unlocksAt(level: number): string[] {
  return [
    ...LINE_ORDER.filter((l) => LINES[l].level === level && level > 1).map((l) => LINES[l].name),
    ...MARKER_ORDER.filter((m) => MARKERS[m].level === level).map((m) => MARKERS[m].name),
    ...AGENT_ORDER.filter((a) => AGENTS[a].level === level && level > 1).map((a) => `@agent.${a}`),
    ...SHOP.filter((i) => i.cat === 'equipment' && i.level === level && i.level > 1).map((i) => `@shop.${i.id}`),
    ...(Object.keys(CONTAM) as ContamType[]).filter((c) => CONTAM[c].level === level && level > 1).map((c) => `@unlock.${c}`),
    ...SCOPES.filter((sc) => sc.level === level && level > 1).map((sc) => `@scope.${sc.id}`),
  ];
}

export const STIPEND = (level: number) => 15 + 5 * level;
export const HELP_COOLDOWN_H = 48;
