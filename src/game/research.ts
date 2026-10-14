import { AGENTS, JOURNALS, LINES, MARKERS, finding } from './data';
import { addXp, log } from './econ';
import type { AgentId, Experiment, GameState, LineId, Readout } from './types';

export const REPLICATES_FOR_PAPER = 3;

export const expKey = (line: LineId, agent: AgentId, readout: Readout) => `${line}|${agent}|${readout}`;

export function parseKey(key: string) {
  const [line, agent, readout] = key.split('|') as [LineId, AgentId, Readout];
  return { line, agent, readout };
}

export const readoutName = (r: Readout) => (r === 'MTT' ? 'MTT' : MARKERS[r].name);

export function describeKey(key: string) {
  const { line, agent, readout } = parseKey(key);
  return `${LINES[line].name} + ${AGENTS[agent].name} · ${readoutName(readout)}`;
}

export function resolveExperiment(s: GameState, e: Experiment) {
  const label = describeKey(e.key);
  const ok = e.quality >= 0.35 && Math.random() < 0.15 + 0.85 * e.quality;
  if (!ok) {
    addXp(s, 5);
    log(s, `🧪 ${label}: dados inconclusivos (qualidade ${Math.round(e.quality * 100)}%). Cuide melhor das células antes do ensaio!`, 'warn');
    return;
  }
  const f = finding(e.agent, e.readout, e.line);
  s.results[e.key] = f.text;
  const n = (s.replicates[e.key] ?? 0) + 1;
  s.replicates[e.key] = n;
  addXp(s, 15);

  if (n < REPLICATES_FOR_PAPER) {
    log(s, `🧪 Réplica ${n}/${REPLICATES_FOR_PAPER}: ${AGENTS[e.agent].name} ${f.text} em ${LINES[e.line].name}.`, 'good');
    return;
  }
  if (n > REPLICATES_FOR_PAPER) {
    log(s, `🧪 Réplica extra de ${label} confirma o resultado.`, 'info');
    return;
  }

  const impact = f.rel * (0.6 + 0.1 * LINES[e.line].level) * (e.readout === 'MTT' ? 0.7 : 1);
  const journal = JOURNALS.find((j) => impact >= j.min)!.name;
  const reward = Math.round(300 + 2500 * impact);
  const markerTxt = e.markers.length ? ' ' + e.markers.map((m) => MARKERS[m].name).join('/') : '';
  const title = `${AGENTS[e.agent].name} ${f.text} em células ${LINES[e.line].name}${markerTxt}`;
  s.papers.unshift({ id: e.id, key: e.key, title, journal, impact, reward, at: s.time });
  s.money += reward;
  addXp(s, Math.round(40 + 250 * impact));
  log(s, `📄 Artigo publicado na ${journal}: "${title}". Financiamento de R$ ${reward.toLocaleString('pt-BR')}!`, 'good');
}
