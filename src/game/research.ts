import { JOURNAL_MIN, LINES, MARKERS, SCOPES, finding } from './data';
import { addXp, bump, log } from './econ';
import type { AgentId, Experiment, GameState, LineId, Readout } from './types';

export const REPLICATES_FOR_PAPER = 3;

export const expKey = (line: LineId, agent: AgentId, readout: Readout) => `${line}|${agent}|${readout}`;

export function parseKey(key: string) {
  const [line, agent, readout] = key.split('|') as [LineId, AgentId, Readout];
  return { line, agent, readout };
}

export const readoutName = (r: Readout) => (r === 'MTT' ? 'MTT' : MARKERS[r].name);

export function resolveExperiment(s: GameState, e: Experiment) {
  const p = { line: LINES[e.line].name, agent: `@agent.${e.agent}`, readout: readoutName(e.readout) };
  const ok = e.lucky || (e.quality >= 0.35 && Math.random() < 0.15 + 0.85 * e.quality);
  if (!ok) {
    addXp(s, 5);
    log(s, 'log.expInconclusive', { ...p, q: Math.round(e.quality * 100) }, 'warn');
    return;
  }
  const f = finding(e.agent, e.readout, e.line);
  const n = (s.replicates[e.key] ?? 0) + 1;
  s.replicates[e.key] = n;
  addXp(s, 15);

  if (n < REPLICATES_FOR_PAPER) {
    log(s, 'log.replicate', { ...p, n, total: REPLICATES_FOR_PAPER, finding: '@' + f.key }, 'good');
    return;
  }
  if (n > REPLICATES_FOR_PAPER) {
    log(s, 'log.replicateExtra', p, 'info');
    return;
  }

  const scopeBoost = e.readout === 'MTT' ? 0.7 : SCOPES[s.equipment.scope].impact;
  const impact = f.rel * (0.6 + 0.08 * LINES[e.line].level) * scopeBoost;
  const journal = JOURNAL_MIN.findIndex((min) => impact >= min);
  const reward = Math.round(250 + 2200 * impact);
  s.papers.unshift({ id: e.id, key: e.key, line: e.line, agent: e.agent, readout: e.readout, markers: e.markers, journal, impact, reward, at: s.time });
  s.money += reward;
  bump(s, 'papers');
  addXp(s, Math.round(40 + 250 * impact));
  log(s, 'log.paper', { journal: `@journal.${journal}`, reward }, 'good');
}
