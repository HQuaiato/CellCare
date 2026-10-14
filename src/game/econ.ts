import { LINES, MARKERS, levelOf, unlocksAt } from './data';
import type { GameState, LineId, LogEntry, MarkerId } from './types';

export function log(s: GameState, msg: string, kind: LogEntry['kind'] = 'info') {
  s.logSeq += 1;
  s.log.unshift({ seq: s.logSeq, t: s.time, msg, kind });
  if (s.log.length > 150) s.log.length = 150;
}

export function addXp(s: GameState, n: number) {
  const before = levelOf(s.xp);
  s.xp += n;
  const after = levelOf(s.xp);
  for (let lv = before + 1; lv <= after; lv++) {
    const u = unlocksAt(lv);
    log(s, `🎉 Nível ${lv}!${u.length ? ' Liberado: ' + u.join(', ') + '.' : ''}`, 'good');
  }
}

/** Preço por milhão de células vivas. */
export function unitPrice(s: GameState, line: LineId, markers: MarkerId[], viability: number, passage: number) {
  const L = LINES[line];
  let p = L.price;
  for (const m of markers) p *= 1 + MARKERS[m].bonus;
  p *= viability * viability;
  if (passage > 20) p *= Math.max(0.5, 1 - 0.015 * (passage - 20));
  if (L.maxPassage && passage > L.maxPassage) p *= 0.3;
  p *= s.demand[line] ?? 1;
  return p;
}

export const VIAL_PREMIUM = 1.6;

export function sellCells(
  s: GameState,
  line: LineId,
  markers: MarkerId[],
  millions: number,
  viability: number,
  passage: number,
  premium = 1,
) {
  const total = unitPrice(s, line, markers, viability, passage) * millions * premium;
  s.money += total;
  s.demand[line] = Math.max(0.3, (s.demand[line] ?? 1) - 0.01 * millions);
  addXp(s, Math.max(1, Math.round(total / 40)));
  return total;
}
