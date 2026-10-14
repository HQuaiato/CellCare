export type MediumId = 'DMEM' | 'RPMI' | 'MCCOY' | 'F12K' | 'MEM' | 'MTESR';
export type LineId = 'HeLa' | 'HEK293T' | 'U2OS' | 'MCF7' | 'A549' | 'Jurkat' | 'HDF' | 'iPSC';
export type MarkerId = 'H2B' | 'FUCCI' | '53BP1' | 'LC3' | 'LUC';
export type AgentId =
  | 'cisplatin'
  | 'etoposide'
  | 'doxorubicin'
  | 'paclitaxel'
  | 'hydroxyurea'
  | 'rapamycin'
  | 'chloroquine'
  | 'radiation';
export type FlaskType = 'T25' | 'T75' | 'T175';
/** Leitura de um experimento: ensaio de viabilidade (MTT) ou imagem de um marcador fluorescente. */
export type Readout = 'MTT' | MarkerId;

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
  | 'contaminated'
  | 'transducing'
  | 'senescent';

export interface Flask {
  id: string;
  no: number;
  line: LineId;
  type: FlaskType;
  medium: MediumId;
  incubatorId: string;
  /** células vivas */
  live: number;
  /** células mortas / debris */
  dead: number;
  passage: number;
  /** mM */
  glucose: number;
  /** mM */
  lactate: number;
  /** mM */
  ammonia: number;
  pH: number;
  markers: MarkerId[];
  contaminated: boolean;
  transduction: { marker: MarkerId; hoursLeft: number } | null;
  seed: number;
  bornAt: number;
  lastMood: Mood;
}

export interface Incubator {
  id: string;
  name: string;
  /** % de CO2 */
  co2Set: number;
  capacity: number;
}

export interface Vial {
  id: string;
  line: LineId;
  markers: MarkerId[];
  passage: number;
  viability: number;
  frozenAt: number;
}

export interface Suspension {
  line: LineId;
  markers: MarkerId[];
  live: number;
  dead: number;
  passage: number;
  from: string;
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
}

export interface Paper {
  id: string;
  key: string;
  title: string;
  journal: string;
  impact: number;
  reward: number;
  at: number;
}

export interface LogEntry {
  seq: number;
  t: number;
  msg: string;
  kind: 'info' | 'good' | 'warn' | 'bad';
}

export interface GameState {
  version: number;
  player: string;
  money: number;
  xp: number;
  /** horas de jogo desde o início */
  time: number;
  /** 0–100 % do cilindro de CO2 */
  co2Tank: number;
  /** 0 = pausado, 1 = normal, 4 = acelerado */
  speed: number;
  incubators: Incubator[];
  flasks: Flask[];
  vials: Vial[];
  suspension: Suspension | null;
  experiments: Experiment[];
  replicates: Record<string, number>;
  results: Record<string, string>;
  papers: Paper[];
  demand: Record<string, number>;
  inventory: Record<string, number>;
  equipment: { irradiator: boolean; fluo: boolean };
  log: LogEntry[];
  logSeq: number;
  selectedFlaskId: string | null;
  nextNo: number;
  /** Date.now() do último tick, para calcular o tempo que passou offline */
  lastReal: number;
  tankWarned: number;
}
