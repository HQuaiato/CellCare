import type { AgentId, FlaskType, LineId, MarkerId, MediumId, Readout } from './types';

/** 1 minuto real = 1 hora de jogo. Um dia no lab dura 24 minutos. */
export const GAME_HOURS_PER_REAL_MINUTE = 1;
/** Máximo de horas de jogo simuladas enquanto o jogador está fora. */
export const OFFLINE_CAP_H = 12;
export const CELLS_PER_VIAL = 1e6;
export const SPEEDS = [0, 1, 4];

// ---------------------------------------------------------------- frascos

export const FLASKS: Record<FlaskType, { cap: number; vol: number; trypsin: number }> = {
  T25: { cap: 2.5e6, vol: 5, trypsin: 1 },
  T75: { cap: 7.5e6, vol: 15, trypsin: 3 },
  T175: { cap: 17.5e6, vol: 35, trypsin: 6 },
};
export const FLASK_TYPES: FlaskType[] = ['T25', 'T75', 'T175'];
/** células em suspensão: densidade máxima por mL */
export const SUSPENSION_MAX_DENSITY = 2e6;

// ---------------------------------------------------------------- meios

export interface MediumDef {
  name: string;
  /** bicarbonato, mM — define o pH em equilíbrio com o CO2 da estufa */
  hco3: number;
  /** glicose, mM */
  glc: number;
  /** precisa de 10% de SFB para ficar completo */
  serum: boolean;
}

export const MEDIA: Record<MediumId, MediumDef> = {
  DMEM: { name: 'DMEM alta glicose', hco3: 44, glc: 25, serum: true },
  RPMI: { name: 'RPMI-1640', hco3: 23.8, glc: 11.1, serum: true },
  MCCOY: { name: "McCoy's 5A", hco3: 26.2, glc: 16.7, serum: true },
  F12K: { name: 'F-12K', hco3: 29.8, glc: 7, serum: true },
  MEM: { name: 'EMEM', hco3: 26.2, glc: 5.6, serum: true },
  MTESR: { name: 'mTeSR (sem soro)', hco3: 29, glc: 17.5, serum: false },
};

// ---------------------------------------------------------------- linhagens

export interface LineDef {
  name: string;
  origin: string;
  medium: MediumId;
  /** tempo de duplicação, h */
  td: number;
  suspension: boolean;
  /** multiplica a capacidade do frasco (células pequenas cabem mais) */
  size: number;
  /** consumo de glicose, µmol / 10^6 células / h */
  glcRate: number;
  /** R$ por milhão de células */
  price: number;
  hue: number;
  level: number;
  /** sensibilidade a estresse (multiplica a taxa de morte) */
  sens: number;
  p53: 'wt' | 'inactive';
  maxPassage?: number;
  fact: string;
}

export const LINES: Record<LineId, LineDef> = {
  HeLa: {
    name: 'HeLa',
    origin: 'Adenocarcinoma de colo do útero (HPV-18)',
    medium: 'DMEM',
    td: 24,
    suspension: false,
    size: 1,
    glcRate: 0.6,
    price: 15,
    hue: 330,
    level: 1,
    sens: 0.7,
    p53: 'inactive',
    fact: 'Primeira linhagem humana imortalizada (1951), derivada das células de Henrietta Lacks. A E6 do HPV degrada p53.',
  },
  HEK293T: {
    name: 'HEK293T',
    origin: 'Rim embrionário humano + antígeno T do SV40',
    medium: 'DMEM',
    td: 20,
    suspension: false,
    size: 1.4,
    glcRate: 0.55,
    price: 20,
    hue: 200,
    level: 2,
    sens: 1.1,
    p53: 'inactive',
    fact: 'A fábrica de lentivírus do laboratório. Adere fracamente: cuidado ao lavar com PBS!',
  },
  U2OS: {
    name: 'U2OS',
    origin: 'Osteossarcoma',
    medium: 'MCCOY',
    td: 30,
    suspension: false,
    size: 0.7,
    glcRate: 0.5,
    price: 28,
    hue: 30,
    level: 3,
    sens: 0.9,
    p53: 'wt',
    fact: 'Grande e achatada: a queridinha da microscopia, ótima para contar focos de 53BP1.',
  },
  MCF7: {
    name: 'MCF-7',
    origin: 'Adenocarcinoma de mama (ER+)',
    medium: 'MEM',
    td: 36,
    suspension: false,
    size: 1.2,
    glcRate: 0.4,
    price: 32,
    hue: 280,
    level: 4,
    sens: 1,
    p53: 'wt',
    fact: 'Modelo clássico de câncer de mama luminal, responsiva a estrógeno. Cresce em ilhas.',
  },
  A549: {
    name: 'A549',
    origin: 'Adenocarcinoma de pulmão (KRAS mutado)',
    medium: 'F12K',
    td: 22,
    suspension: false,
    size: 1,
    glcRate: 0.6,
    price: 30,
    hue: 140,
    level: 5,
    sens: 0.8,
    p53: 'wt',
    fact: 'Semelhante a pneumócito tipo II; muito usada em estudos de quimio e radiorresistência.',
  },
  Jurkat: {
    name: 'Jurkat',
    origin: 'Leucemia de linfócitos T',
    medium: 'RPMI',
    td: 28,
    suspension: true,
    size: 1,
    glcRate: 0.35,
    price: 38,
    hue: 50,
    level: 6,
    sens: 1,
    p53: 'inactive',
    fact: 'Cresce em suspensão: nada de tripsina, é só centrifugar e ressuspender.',
  },
  HDF: {
    name: 'HDF',
    origin: 'Fibroblasto dérmico humano primário',
    medium: 'DMEM',
    td: 40,
    suspension: false,
    size: 0.4,
    glcRate: 0.45,
    price: 70,
    hue: 15,
    level: 7,
    sens: 1.2,
    p53: 'wt',
    maxPassage: 18,
    fact: 'Célula normal: obedece ao limite de Hayflick e entra em senescência depois de muitas passagens.',
  },
  iPSC: {
    name: 'iPSC',
    origin: 'Célula-tronco pluripotente induzida',
    medium: 'MTESR',
    td: 22,
    suspension: false,
    size: 1.6,
    glcRate: 0.7,
    price: 220,
    hue: 170,
    level: 8,
    sens: 2,
    p53: 'wt',
    fact: 'Pluripotente e exigente: meio sem soro, troca frequente e nunca deixe passar da confluência.',
  },
};
export const LINE_ORDER = Object.keys(LINES) as LineId[];

// ---------------------------------------------------------------- marcadores (transduções)

export interface MarkerDef {
  name: string;
  desc: string;
  /** multiplicador de valor de venda (+bonus) */
  bonus: number;
  price: number;
  level: number;
  color: string;
}

export const MARKERS: Record<MarkerId, MarkerDef> = {
  H2B: {
    name: 'H2B-GFP',
    desc: 'Histona H2B fluorescente: núcleos verdes, mitoses e micronúcleos visíveis.',
    bonus: 0.3,
    price: 250,
    level: 2,
    color: '#4ade80',
  },
  LUC: {
    name: 'Luciferase',
    desc: 'Bioluminescência: leitura rápida de viabilidade e modelos in vivo.',
    bonus: 0.4,
    price: 300,
    level: 3,
    color: '#fde047',
  },
  '53BP1': {
    name: '53BP1-mCherry',
    desc: 'Repórter de quebras de dupla fita: cada foco é um sítio de reparo.',
    bonus: 0.6,
    price: 450,
    level: 3,
    color: '#f43f5e',
  },
  FUCCI: {
    name: 'FUCCI',
    desc: 'Ciclo celular ao vivo: G1 vermelho, S/G2/M verde.',
    bonus: 0.7,
    price: 500,
    level: 4,
    color: '#f97316',
  },
  LC3: {
    name: 'GFP-LC3',
    desc: 'Autofagossomos aparecem como puncta verdes no citoplasma.',
    bonus: 0.5,
    price: 400,
    level: 5,
    color: '#22c55e',
  },
};
export const MARKER_ORDER = Object.keys(MARKERS) as MarkerId[];

// ---------------------------------------------------------------- agentes terapêuticos

export interface AgentDef {
  name: string;
  cls: string;
  price: number;
  doses: number;
  level: number;
  needsIrradiator?: boolean;
}

export const AGENTS: Record<AgentId, AgentDef> = {
  cisplatin: { name: 'Cisplatina', cls: 'Quimio — ligações cruzadas no DNA', price: 120, doses: 5, level: 1 },
  etoposide: { name: 'Etoposídeo', cls: 'Quimio — inibidor de topoisomerase II', price: 140, doses: 5, level: 2 },
  doxorubicin: { name: 'Doxorrubicina', cls: 'Quimio — antraciclina intercalante', price: 160, doses: 5, level: 3 },
  radiation: { name: 'Radiação ionizante', cls: 'Radio — 4 Gy de raios X', price: 0, doses: 0, level: 3, needsIrradiator: true },
  paclitaxel: { name: 'Paclitaxel', cls: 'Quimio — estabiliza microtúbulos', price: 180, doses: 5, level: 4 },
  hydroxyurea: { name: 'Hidroxiureia', cls: 'Inibidor da ribonucleotídeo redutase', price: 90, doses: 5, level: 4 },
  rapamycin: { name: 'Rapamicina', cls: 'Inibidor de mTORC1', price: 200, doses: 5, level: 5 },
  chloroquine: { name: 'Cloroquina', cls: 'Bloqueia a fusão autofagossomo-lisossomo', price: 110, doses: 5, level: 5 },
};
export const AGENT_ORDER = Object.keys(AGENTS) as AgentId[];

const DNA_DAMAGE: AgentId[] = ['cisplatin', 'etoposide', 'doxorubicin', 'radiation'];

// ---------------------------------------------------------------- achados científicos

interface FindingDef {
  text: string;
  rel: number;
}

const FINDINGS: Record<AgentId, Partial<Record<Readout, FindingDef>>> = {
  cisplatin: {
    MTT: { text: 'reduz a viabilidade de forma dose-dependente', rel: 0.4 },
    '53BP1': { text: 'induz focos de 53BP1 tardios, no reparo de ligações cruzadas', rel: 0.85 },
    FUCCI: { text: 'acumula células em S/G2', rel: 0.6 },
    H2B: { text: 'causa fragmentação nuclear apoptótica', rel: 0.5 },
    LC3: { text: 'induz autofagia discreta como resposta ao estresse', rel: 0.3 },
    LUC: { text: 'derruba o sinal de luciferase em 48 h', rel: 0.45 },
  },
  etoposide: {
    MTT: { text: 'reduz a viabilidade de forma dose-dependente', rel: 0.4 },
    '53BP1': { text: 'induz focos de 53BP1 rápidos, por quebras mediadas pela Topo II', rel: 0.9 },
    FUCCI: { text: 'provoca parada em G2 (núcleos verdes)', rel: 0.7 },
    H2B: { text: 'gera micronúcleos após a mitose', rel: 0.55 },
    LC3: { text: 'induz autofagia leve', rel: 0.3 },
    LUC: { text: 'reduz o sinal de luciferase', rel: 0.45 },
  },
  doxorubicin: {
    MTT: { text: 'reduz a viabilidade em baixas concentrações', rel: 0.45 },
    '53BP1': { text: 'induz focos de 53BP1 persistentes', rel: 0.8 },
    FUCCI: { text: 'acumula células em G2', rel: 0.6 },
    H2B: { text: 'induz núcleos grandes e achatados, típicos de senescência', rel: 0.65 },
    LC3: { text: 'aumenta os puncta de LC3', rel: 0.4 },
    LUC: { text: 'reduz o sinal de luciferase', rel: 0.45 },
  },
  radiation: {
    MTT: { text: 'reduz a proliferação nas 48 h seguintes', rel: 0.4 },
    '53BP1': { text: 'induz focos de 53BP1 (IRIF) que se resolvem em 24 h', rel: 1 },
    FUCCI: { text: 'ativa checkpoints do ciclo celular', rel: 0.8 },
    H2B: { text: 'gera micronúcleos e pontes de cromatina', rel: 0.65 },
    LC3: { text: 'induz autofagia citoprotetora', rel: 0.35 },
    LUC: { text: 'reduz a sobrevivência clonogênica', rel: 0.6 },
  },
  paclitaxel: {
    MTT: { text: 'reduz a viabilidade em concentrações nanomolares', rel: 0.45 },
    FUCCI: { text: 'prende as células em mitose (verde intenso, células arredondadas)', rel: 0.9 },
    H2B: { text: 'causa catástrofe mitótica com núcleos multilobulados', rel: 0.9 },
    '53BP1': { text: 'gera focos de 53BP1 secundários após a mitose falha', rel: 0.4 },
    LC3: { text: 'altera a distribuição de LC3 por interferir nos microtúbulos', rel: 0.35 },
    LUC: { text: 'reduz o sinal de luciferase', rel: 0.45 },
  },
  hydroxyurea: {
    MTT: { text: 'tem efeito citostático reversível', rel: 0.3 },
    FUCCI: { text: 'prende as células no início da fase S (amarelo-verde)', rel: 0.9 },
    '53BP1': { text: 'induz estresse replicativo com focos de 53BP1', rel: 0.6 },
    H2B: { text: 'aumenta o tamanho nuclear sem mitoses', rel: 0.3 },
  },
  rapamycin: {
    MTT: { text: 'reduz a proliferação sem matar as células', rel: 0.3 },
    LC3: { text: 'induz autofagia (aumento de puncta de LC3)', rel: 0.9 },
    FUCCI: { text: 'acumula células em G1 (núcleos vermelhos)', rel: 0.65 },
    LUC: { text: 'reduz o sinal metabólico de luciferase', rel: 0.4 },
  },
  chloroquine: {
    MTT: { text: 'é tóxica apenas em altas doses', rel: 0.3 },
    LC3: { text: 'bloqueia o fluxo autofágico (acúmulo de LC3)', rel: 1 },
    H2B: { text: 'causa vacuolização sem dano nuclear', rel: 0.3 },
  },
};

export function finding(agent: AgentId, readout: Readout, line: LineId): FindingDef {
  const base = FINDINGS[agent][readout] ?? {
    text: 'não mostra efeito evidente (resultado negativo, que também é ciência!)',
    rel: 0.2,
  };
  let text = base.text;
  if (readout === 'FUCCI' && DNA_DAMAGE.includes(agent)) {
    text +=
      LINES[line].p53 === 'wt'
        ? ', com parada em G1 e G2 (p53 funcional)'
        : ', sem parada em G1 e só em G2 (p53 inativo)';
  }
  return { text, rel: base.rel };
}

export const JOURNALS: { name: string; min: number }[] = [
  { name: 'Grande Revista de Ciência', min: 1.1 },
  { name: 'Mitose Reviews', min: 0.8 },
  { name: 'Jornal de Biologia Celular Imaginária', min: 0.5 },
  { name: 'Anais do Laboratório', min: 0 },
];

// ---------------------------------------------------------------- loja

export type ShopCat = 'Meios' | 'Reagentes' | 'Plásticos' | 'Fármacos' | 'Vírus' | 'Equipamentos' | 'Células';
export const SHOP_CATS: ShopCat[] = ['Meios', 'Reagentes', 'Plásticos', 'Fármacos', 'Vírus', 'Células', 'Equipamentos'];

export interface ShopItem {
  id: string;
  cat: ShopCat;
  name: string;
  desc: string;
  price: number;
  level: number;
  /** chave no inventário e quantidade entregue */
  inv?: string;
  qty?: number;
  unit?: string;
  special?: 'incubator' | 'irradiator' | 'fluo' | 'co2' | 'vial';
  line?: LineId;
}

const mediumLevel = (m: MediumId) =>
  Math.min(...LINE_ORDER.filter((l) => LINES[l].medium === m).map((l) => LINES[l].level));

export const SHOP: ShopItem[] = [
  ...(Object.keys(MEDIA) as MediumId[]).map<ShopItem>((m) => ({
    id: `med_${m}`,
    cat: 'Meios',
    name: MEDIA[m].name,
    desc: `Frasco de 500 mL · glicose ${MEDIA[m].glc} mM · NaHCO₃ ${MEDIA[m].hco3} mM${
      MEDIA[m].serum ? '' : ' · não usa soro'
    }`,
    price: { DMEM: 60, RPMI: 65, MCCOY: 85, F12K: 95, MEM: 70, MTESR: 450 }[m],
    level: mediumLevel(m),
    inv: `med_${m}`,
    qty: 500,
    unit: 'mL',
  })),
  { id: 'FBS', cat: 'Reagentes', name: 'Soro fetal bovino (SFB)', desc: '50 mL. 10% em todo meio completo e 90% no meio de congelamento.', price: 110, level: 1, inv: 'FBS', qty: 50, unit: 'mL' },
  { id: 'trypsin', cat: 'Reagentes', name: 'Tripsina-EDTA 0,25%', desc: '100 mL. Solta as células aderentes do frasco.', price: 40, level: 1, inv: 'trypsin', qty: 100, unit: 'mL' },
  { id: 'PBS', cat: 'Reagentes', name: 'PBS estéril', desc: '500 mL. Lavagem antes da tripsina (remove o soro, que inibe a tripsina).', price: 20, level: 1, inv: 'PBS', qty: 500, unit: 'mL' },
  { id: 'DMSO', cat: 'Reagentes', name: 'DMSO grau cultura', desc: '50 mL. Crioprotetor: 10% no meio de congelamento.', price: 35, level: 1, inv: 'DMSO', qty: 50, unit: 'mL' },
  { id: 'MTT', cat: 'Reagentes', name: 'Kit MTT', desc: '10 ensaios de viabilidade celular (leitura em 48 h).', price: 120, level: 1, inv: 'MTT', qty: 10, unit: 'ensaios' },
  { id: 'flask_T25', cat: 'Plásticos', name: 'Frascos T25', desc: '10 unidades · 25 cm² · 5 mL de meio.', price: 30, level: 1, inv: 'flask_T25', qty: 10, unit: 'un' },
  { id: 'flask_T75', cat: 'Plásticos', name: 'Frascos T75', desc: '10 unidades · 75 cm² · 15 mL de meio.', price: 55, level: 1, inv: 'flask_T75', qty: 10, unit: 'un' },
  { id: 'flask_T175', cat: 'Plásticos', name: 'Frascos T175', desc: '5 unidades · 175 cm² · 35 mL de meio.', price: 60, level: 2, inv: 'flask_T175', qty: 5, unit: 'un' },
  { id: 'cryovial', cat: 'Plásticos', name: 'Criotubos', desc: '20 unidades para congelar 10⁶ células cada.', price: 30, level: 1, inv: 'cryovial', qty: 20, unit: 'un' },
  ...AGENT_ORDER.filter((a) => !AGENTS[a].needsIrradiator).map<ShopItem>((a) => ({
    id: `drug_${a}`,
    cat: 'Fármacos',
    name: AGENTS[a].name,
    desc: `${AGENTS[a].cls} · ${AGENTS[a].doses} tratamentos`,
    price: AGENTS[a].price,
    level: AGENTS[a].level,
    inv: `drug_${a}`,
    qty: AGENTS[a].doses,
    unit: 'doses',
  })),
  ...MARKER_ORDER.map<ShopItem>((m) => ({
    id: `virus_${m}`,
    cat: 'Vírus',
    name: `Lentivírus ${MARKERS[m].name}`,
    desc: `${MARKERS[m].desc} Valoriza a linhagem em +${Math.round(MARKERS[m].bonus * 100)}%.`,
    price: MARKERS[m].price,
    level: MARKERS[m].level,
    inv: `virus_${m}`,
    qty: 1,
    unit: 'alíquota',
  })),
  ...LINE_ORDER.map<ShopItem>((l) => ({
    id: `vial_${l}`,
    cat: 'Células',
    name: `Vial de ${LINES[l].name}`,
    desc: `${LINES[l].origin}. 10⁶ células, congeladas em P5.`,
    price: LINES[l].price * 12,
    level: LINES[l].level,
    special: 'vial',
    line: l,
  })),
  { id: 'co2', cat: 'Equipamentos', name: 'Recarga do cilindro de CO₂', desc: 'Enche o cilindro que alimenta todas as estufas.', price: 60, level: 1, special: 'co2' },
  { id: 'incubator', cat: 'Equipamentos', name: 'Nova estufa de CO₂', desc: 'Mais 6 vagas de frasco, com CO₂ ajustável próprio.', price: 1500, level: 2, special: 'incubator' },
  { id: 'fluo', cat: 'Equipamentos', name: 'Microscópio de fluorescência', desc: 'Permite ver marcadores e fazer experimentos de imagem.', price: 2500, level: 2, special: 'fluo' },
  { id: 'irradiator', cat: 'Equipamentos', name: 'Irradiador de raios X', desc: 'Libera experimentos de radiobiologia, sem custo por uso.', price: 4000, level: 3, special: 'irradiator' },
];

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

export function unlocksAt(level: number): string[] {
  return [
    ...LINE_ORDER.filter((l) => LINES[l].level === level).map((l) => `linhagem ${LINES[l].name}`),
    ...MARKER_ORDER.filter((m) => MARKERS[m].level === level).map((m) => `transdução ${MARKERS[m].name}`),
    ...AGENT_ORDER.filter((a) => AGENTS[a].level === level).map((a) => AGENTS[a].name),
    ...SHOP.filter((i) => i.cat === 'Equipamentos' && i.level === level && i.level > 1).map((i) => i.name),
  ];
}
