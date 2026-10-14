import { LINES, MARKERS, levelOf, unlocksAt } from './data';
import type { GameState, LineId, LogEntry, MarkerId, Msg } from './types';

export const m = (k: string, p?: Msg['p']): Msg => ({ k, p });

export function log(s: GameState, k: string, p?: Msg['p'], kind: LogEntry['kind'] = 'info') {
  s.logSeq += 1;
  s.log.unshift({ seq: s.logSeq, t: s.time, k, p, kind });
  if (s.log.length > 150) s.log.length = 150;
}

export function bump(s: GameState, stat: string, n = 1) {
  s.stats[stat] = (s.stats[stat] ?? 0) + n;
}

export function addXp(s: GameState, n: number) {
  const before = levelOf(s.xp);
  s.xp += n;
  const after = levelOf(s.xp);
  for (let lv = before + 1; lv <= after; lv++) {
    const u = unlocksAt(lv);
    log(s, u.length ? 'log.levelUp' : 'log.levelUpPlain', { lv, u: u.join('|') }, 'good');
  }
}

/** Preço por milhão de células vivas. */
export function unitPrice(s: GameState, line: LineId, markers: MarkerId[], viability: number, passage: number) {
  const L = LINES[line];
  let p = L.price;
  for (const mk of markers) p *= 1 + MARKERS[mk].bonus;
  p *= viability * viability;
  if (passage > 20) p *= Math.max(0.5, 1 - 0.015 * (passage - 20));
  if (L.maxPassage && passage > L.maxPassage) p *= 0.3;
  p *= s.demand[line] ?? 1;
  return p;
}

export const VIAL_PREMIUM = 1.6;

/**
 * Vende células. Se tiverem micoplasma (mesmo sem você saber), o cliente pode
 * testar e devolver o lote com multa. Retorna o valor líquido.
 */
export function sellCells(
  s: GameState,
  line: LineId,
  markers: MarkerId[],
  millions: number,
  viability: number,
  passage: number,
  premium = 1,
  myco = false,
) {
  const total = unitPrice(s, line, markers, viability, passage) * millions * premium;
  s.demand[line] = Math.max(0.3, (s.demand[line] ?? 1) - 0.01 * millions);
  bump(s, 'sold');
  if (myco && Math.random() < 0.5) {
    const fine = Math.round(total * 0.5);
    s.money -= fine;
    log(s, 'log.mycoFine', { fine }, 'bad');
    return -fine;
  }
  s.money += total;
  addXp(s, Math.max(1, Math.round(total / 40)));
  return total;
}
