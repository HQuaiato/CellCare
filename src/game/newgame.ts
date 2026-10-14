import { MEDIA } from './data';
import { log } from './econ';
import { eqPH } from './sim';
import type { GameState } from './types';

export const SAVE_VERSION = 1;

export function newGame(player: string): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    player,
    money: 300,
    xp: 0,
    time: 8, // começa às 8h do dia 1
    co2Tank: 100,
    speed: 1,
    incubators: [{ id: 'inc1', name: 'Estufa 1', co2Set: 5, capacity: 4 }],
    flasks: [],
    vials: [],
    suspension: null,
    experiments: [],
    replicates: {},
    results: {},
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
    },
    equipment: { irradiator: false, fluo: false },
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
    contaminated: false,
    transduction: null,
    seed: 12345,
    bornAt: 8,
    lastMood: 'happy',
  });
  log(s, '🧑‍🔬 Bem-vinda(o) ao CellCare! Sua orientadora deixou um frasco de HeLa na estufa. Cuide bem dele.', 'info');
  log(s, '💡 Dica: confluência acima de 80–90%? Tripsinize e repique. Meio amarelo? Troque o meio.', 'info');
  return s;
}
