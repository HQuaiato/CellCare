import type { GameState } from './types';

export interface Quest {
  id: string;
  reward: number;
  done: (s: GameState) => boolean;
}

/** Missões de tutorial: ensinam o básico e dão moedas. Texto em quest.<id>.title/.how */
export const QUESTS: Quest[] = [
  { id: 'feed', reward: 20, done: (s) => (s.stats.feeds ?? 0) >= 1 },
  { id: 'co2', reward: 30, done: (s) => s.incubators.some((i) => i.co2Set >= 6.5 && i.co2Set <= 9.5) },
  { id: 'penstrep', reward: 25, done: (s) => s.settings.penstrep && (s.stats.feeds ?? 0) >= 2 },
  { id: 'passage', reward: 30, done: (s) => (s.stats.passages ?? 0) >= 1 },
  { id: 'freeze', reward: 30, done: (s) => (s.stats.frozen ?? 0) >= 1 },
  { id: 'sell', reward: 20, done: (s) => (s.stats.sold ?? 0) >= 1 },
  { id: 'experiment', reward: 40, done: (s) => (s.stats.experiments ?? 0) >= 1 },
  { id: 'paper', reward: 100, done: (s) => (s.stats.papers ?? 0) >= 1 },
  { id: 'transduce', reward: 60, done: (s) => (s.stats.transductions ?? 0) >= 1 },
  { id: 'treat', reward: 50, done: (s) => (s.stats.treatments ?? 0) >= 1 },
];

export const nextQuest = (s: GameState) => QUESTS.find((q) => !s.quests[q.id]);
