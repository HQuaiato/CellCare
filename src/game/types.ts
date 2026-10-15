export type MediumId = 'DMEM' | 'RPMI' | 'MCCOY' | 'F12K' | 'MEM' | 'MTESR' | 'EGM2';
export type LineId =
  | 'L929'
  | 'HeLa'
  | 'HEK293T'
  | 'A549'
  | 'MCF7'
  | 'U2OS'
  | 'MDA231'
  | 'A375'
  | 'U87'
  | 'A172'
  | 'Jurkat'
  | 'MRC5'
  | 'IMR90'
  | 'HDF'
  | 'HUVEC'
  | 'iPSC';
export type MarkerId = 'H2B' | 'FUCCI' | '53BP1' | 'LC3' | 'LUC';
export type AgentId =
  | 'cisplatin'
  | 'etoposide'
  | 'doxorubicin'
  | 'paclitaxel'
  | 'hydroxyurea'
  | 'rapamycin'
  | 'chloroquine'
  | 'temozolomide'
  | 'radiation'
  | 'replicative';
export type FlaskType = 'T25' | 'T75' | 'T175';
/** Leitura de um experimento: ensaio de viabilidade (MTT) ou imagem de um marcador fluorescente. */
export type AssayId =
  | 'DAPI'
  | 'PHAL'
  | 'NMA'
  | 'MORPH'
  | 'MULTI'
  | 'SAGAL'
  | 'CLONO'
  | 'WOUND'
  | 'CYCLE'
  | 'AUTO'
  | 'DDR'
  | 'FLOWCYC'
  | 'APOP'
  | 'C12'
  | 'COCULT';
export type Readout = 'MTT' | MarkerId | AssayId;
export type ContamType = 'bacteria' | 'fungus' | 'mycoplasma';
export type Morph = 'polygonal' | 'spindle' | 'star' | 'round' | 'cobblestone' | 'colony' | 'flat';
export type ScopeMode = 'phase' | 'fluo' | 'timelapse' | 'livecell' | 'superres' | 'electron';
export type Tissue = 'mouse' | 'cervix' | 'kidney' | 'lung' | 'breast' | 'bone' | 'skin' | 'brain' | 'blood' | 'vessel' | 'pluripotent';
export type LineKind = 'tumor' | 'normal' | 'transformed' | 'stem';
export type GameId = 'drop' | 'whack' | 'memory' | 'count' | 'tips' | 'pipette' | 'label' | 'centrifuge' | 'mix';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type Mood =
  | 'happy'
  | 'lonely'
  | 'hungry'
  | 'acid'
  | 'alkaline'
  | 'toxic'
  | 'crowded'
  | 'sick'
  | 'dying'
  | 'dead'
  | 'bacteria'
  | 'fungus'
  | 'mycoplasma'
  | 'treating'
  | 'transducing'
  | 'senescent';

/** Mensagem traduzível: chave do dicionário + parâmetros. Strings que começam com "@" são chaves. */
export interface Msg {
  k: string;
  p?: Record<string, string | number>;
}

export interface Contam {
  type: ContamType;
  /** 0–1 */
  level: number;
  /** bactéria/fungo aparecem sozinhos; micoplasma só com teste de PCR */
  detected: boolean;
}

export interface Flask {
  id: string;
  no: number;
  line: LineId;
  type: FlaskType;
  medium: MediumId;
  incubatorId: string;
  live: number;
  dead: number;
  passage: number;
  glucose: number;
  lactate: number;
  ammonia: number;
  pH: number;
  markers: MarkerId[];
  contam: Contam | null;
  /** meio atual tem Pen/Strep */
  abx: boolean;
  /** meio atual tem anfotericina B */
  afx: boolean;
  /** horas restantes de tratamento anti-micoplasma */
  mycoTreat: number;
  /** horas restantes de fase lag (adesão e recuperação depois de semear/descongelar) */
  lag?: number;
  /** imortalizada com hTERT: ignora o limite de Hayflick */
  immortal?: boolean;
  transduction: { marker: MarkerId; hoursLeft: number } | null;
  seed: number;
  bornAt: number;
  lastMood: Mood;
}

export interface Incubator {
  id: string;
  name: string;
  co2Set: number;
  capacity: number;
  /** carga de esporos de fungo, 0–1 */
  spores: number;
}

export interface Vial {
  id: string;
  line: LineId;
  markers: MarkerId[];
  passage: number;
  viability: number;
  frozenAt: number;
  contam: ContamType | null;
  immortal?: boolean;
}

export interface Suspension {
  line: LineId;
  markers: MarkerId[];
  live: number;
  dead: number;
  passage: number;
  from: string;
  contam: Contam | null;
  immortal?: boolean;
}

export interface Experiment {
  id: string;
  key: string;
  line: LineId;
  agent: AgentId;
  readout: Readout;
  markers: MarkerId[];
  quality: number;
  startedAt: number;
  readyAt: number;
  flaskName: string;
  lucky?: boolean;
  /** co-cultura: linhagem parceira */
  partner?: LineId;
}

/** Resultado de um experimento concluído, usado para desenhar a figura. */
export interface LabResult {
  id: string;
  key: string;
  line: LineId;
  agent: AgentId;
  readout: Readout;
  markers: MarkerId[];
  quality: number;
  ok: boolean;
  /** intensidade do efeito, 0–1 */
  effect: number;
  at: number;
  seed: number;
  partner?: LineId;
}

export interface Paper {
  id: string;
  /** conjuntos de dados (linhagem|agente|leitura) reunidos no artigo */
  keys: string[];
  agent: AgentId;
  journal: number;
  impact: number;
  reward: number;
  at: number;
}

export interface LogEntry extends Msg {
  seq: number;
  t: number;
  kind: 'info' | 'good' | 'warn' | 'bad';
}

export interface GameState {
  version: number;
  player: string;
  difficulty: Difficulty;
  money: number;
  xp: number;
  time: number;
  co2Tank: number;
  speed: number;
  incubators: Incubator[];
  flasks: Flask[];
  vials: Vial[];
  suspension: Suspension | null;
  experiments: Experiment[];
  replicates: Record<string, number>;
  papers: Paper[];
  labResults?: LabResult[];
  demand: Record<string, number>;
  inventory: Record<string, number>;
  /** scope = índice do melhor microscópio em SCOPES */
  equipment: { irradiator: boolean; scope: number; computer?: boolean; cytometer?: boolean };
  /** conjuntos de dados já usados em artigos: chave → id do artigo */
  published?: Record<string, string>;
  boosts: { autoFeedUntil: number; shieldUntil: number; sale2xUntil: number; xp2xUntil: number; lucky: number };
  gamePlays: { day: number; counts: Record<string, number> };
  bestScores: Record<string, number>;
  settings: { penstrep: boolean; ampho: boolean; tips: boolean };
  /** lições já vistas e fila de lições a mostrar */
  lessons: Record<string, 1>;
  lessonQueue: string[];
  /** contadores para as missões */
  stats: Record<string, number>;
  quests: Record<string, 'claimed'>;
  lastStipendDay: number;
  helpReadyAt: number;
  log: LogEntry[];
  logSeq: number;
  selectedFlaskId: string | null;
  nextNo: number;
  lastReal: number;
  tankWarned: number;
}
