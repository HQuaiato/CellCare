import { DIFFICULTIES, MEDIA } from './data';
import { log } from './econ';
import { eqPH } from './sim';
import type { Difficulty, GameState } from './types';

export const SAVE_VERSION = 6;

export function newGame(player: string, difficulty: Difficulty = 'normal'): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    player,
    difficulty,
    money: DIFFICULTIES[difficulty].startMoney,
    xp: 0,
    time: 8,
    co2Tank: 100,
    speed: 1,
    incubators: [{ id: 'inc1', name: '1', co2Set: 5, capacity: 4, spores: 0 }],
    flasks: [],
    vials: [],
    suspension: null,
    experiments: [],
    replicates: {},
    papers: [],
    demand: {},
    inventory: {
      med_DMEM: 500,
      FBS: 50,
      trypsin: 100,
      PBS: 500,
      DMSO: 20,
      cryovial: 10,
      flask_T25: 5,
      flask_T75: 5,
      MTT: 3,
      drug_cisplatin: 3,
      penstrep: 10,
    },
    equipment: { irradiator: false, scope: 0 },
    boosts: { autoFeedUntil: 0, shieldUntil: 0, sale2xUntil: 0, xp2xUntil: 0, lucky: 0 },
    gamePlays: { day: 0, counts: {} },
    bestScores: {},
    settings: { penstrep: false, ampho: false, tips: true },
    lessons: {},
    lessonQueue: [],
    stats: {},
    quests: {},
    lastStipendDay: 0,
    helpReadyAt: 0,
    log: [],
    logSeq: 0,
    selectedFlaskId: 'f1',
    nextNo: 2,
    lastReal: Date.now(),
    tankWarned: 0,
  };
  s.flasks.push({
    id: 'f1',
    no: 1,
    line: 'HeLa',
    type: 'T75',
    medium: 'DMEM',
    incubatorId: 'inc1',
    live: 1.2e6,
    dead: 6e4,
    passage: 8,
    glucose: MEDIA.DMEM.glc,
    lactate: 0,
    ammonia: 0,
    pH: eqPH('DMEM', 0, 5),
    markers: [],
    contam: null,
    abx: false,
    afx: false,
    mycoTreat: 0,
    transduction: null,
    seed: 12345,
    bornAt: 8,
    lastMood: 'happy',
  });
  log(s, 'log.welcome');
  return s;
}

/** Atualiza saves antigos para o formato atual sem perder o progresso. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(raw: any): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.version === SAVE_VERSION) return raw as GameState;
  if (raw.version === 5) return v5to6(raw);
  if (raw.version === 4) return v5to6(v4to5(raw));
  if (raw.version === 3) return v5to6(v4to5(v3to4(raw)));
  if (raw.version === 2) return v5to6(v4to5(v3to4(v2to3(raw))));
  if (raw.version !== 1) return null;
  const s = raw;
  s.version = SAVE_VERSION;
  s.settings = { penstrep: false, ampho: false };
  s.stats = {};
  s.quests = {};
  s.lastStipendDay = Math.floor(s.time / 24);
  s.helpReadyAt = 0;
  delete s.results;
  for (const inc of s.incubators) {
    inc.spores = 0;
    inc.name = String(inc.name).replace(/\D+/g, '') || '1';
  }
  for (const f of s.flasks) {
    f.contam = f.contaminated ? { type: 'bacteria', level: 0.5, detected: true } : null;
    delete f.contaminated;
    f.abx = false;
    f.afx = false;
    f.mycoTreat = 0;
  }
  for (const v of s.vials) v.contam = null;
  if (s.suspension) s.suspension.contam = null;
  s.papers = (s.papers ?? []).map((p: { key: string; impact: number; reward: number; at: number; id: string }) => {
    const [line, agent, readout] = p.key.split('|');
    return { ...p, line, agent, readout, markers: [], journal: [1.1, 0.8, 0.5, 0].findIndex((min) => p.impact >= min) };
  });
  s.log = [];
  s.logSeq = 0;
  return v5to6(v4to5(v3to4(v2to3(s))));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function v2to3(s: any): GameState {
  s.version = SAVE_VERSION;
  s.equipment = { irradiator: !!s.equipment?.irradiator, scope: s.equipment?.fluo ? 1 : 0 };
  s.boosts = { autoFeedUntil: 0, shieldUntil: 0, sale2xUntil: 0, xp2xUntil: 0, lucky: 0 };
  s.gamePlays = { day: 0, counts: {} };
  s.bestScores = {};
  return s as GameState;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function v3to4(s: any): GameState {
  s.version = SAVE_VERSION;
  s.settings = { ...s.settings, tips: true };
  // quem já jogava não precisa das lições do começo
  s.lessons = s.time > 48 ? { welcome: 1, care: 1 } : {};
  s.lessonQueue = [];
  return s as GameState;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function v4to5(s: any): GameState {
  s.version = SAVE_VERSION;
  s.difficulty = 'normal';
  return s as GameState;
}

/** v6: artigos reúnem vários conjuntos de dados; duas revistas novas no topo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function v5to6(s: any): GameState {
  s.version = SAVE_VERSION;
  s.published = {};
  s.papers = (s.papers ?? []).map((p: { id: string; key: string; agent: string; journal: number; impact: number; reward: number; at: number }) => {
    s.published[p.key] = p.id;
    return { id: p.id, keys: [p.key], agent: p.agent, journal: p.journal + 2, impact: p.impact, reward: p.reward, at: p.at };
  });
  log(s, 'log.migrated');
  return s as GameState;
}
