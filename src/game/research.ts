import { ASSAYS, JOURNAL_APC, JOURNAL_MIN, LINES, MARKERS, OA_JOURNALS, SCOPES, diff, finding, isAssay } from './data';
import { addXp, bump, log, m } from './econ';
import type { AgentId, Experiment, GameState, LabResult, LineId, Msg, Paper, Readout } from './types';

export const REPLICATES_FOR_PAPER = 3;
/** máximo de conjuntos de dados num artigo */
export const MAX_DATASETS = 6;

export const expKey = (line: LineId, agent: AgentId, readout: Readout, partner?: LineId) =>
  partner ? `${line}|${agent}|${readout}|${partner}` : `${line}|${agent}|${readout}`;

export function parseKey(key: string) {
  const [line, agent, readout, partner] = key.split('|') as [LineId, AgentId, Readout, LineId | undefined];
  return { line, agent, readout, partner };
}

/** Nome da leitura; ensaios viram chave "@assay.X" para serem traduzidos. */
export const readoutName = (r: Readout) => (r === 'MTT' ? 'MTT' : isAssay(r) ? `@assay.${r}` : MARKERS[r].name);

function saveResult(s: GameState, r: LabResult) {
  s.labResults = [r, ...(s.labResults ?? [])].slice(0, 60);
}

/** Resultado (figura) mais recente bem-sucedido de um conjunto de dados. */
export const lastResult = (s: GameState, key: string) => (s.labResults ?? []).find((r) => r.key === key && r.ok);

export function resolveExperiment(s: GameState, e: Experiment) {
  const p = { line: LINES[e.line].name, agent: `@agent.${e.agent}`, readout: readoutName(e.readout) };
  const ok = e.lucky || (e.quality >= 0.35 && Math.random() < 0.15 + 0.85 * e.quality);
  const f = finding(e.agent, e.readout, e.line, e.partner);
  saveResult(s, {
    id: e.id,
    key: e.key,
    line: e.line,
    agent: e.agent,
    readout: e.readout,
    markers: e.markers,
    quality: e.quality,
    ok,
    effect: ok ? Math.min(1, f.rel * (0.7 + 0.3 * e.quality)) : 0.1 + Math.random() * 0.2,
    at: s.time,
    seed: Math.floor(Math.random() * 1e9),
    partner: e.partner,
  });
  if (!ok) {
    addXp(s, 5);
    log(s, 'log.expInconclusive', { ...p, q: Math.round(e.quality * 100) }, 'warn');
    return;
  }
  const n = (s.replicates[e.key] ?? 0) + 1;
  s.replicates[e.key] = n;
  addXp(s, 15);
  if (n < REPLICATES_FOR_PAPER) log(s, 'log.replicate', { ...p, n, total: REPLICATES_FOR_PAPER, finding: '@' + f.key }, 'good');
  else if (n === REPLICATES_FOR_PAPER) log(s, 'log.datasetReady', p, 'good');
  else log(s, 'log.replicateExtra', p, 'info');
}

// ---------------------------------------------------------------- conjuntos de dados e artigos

/** Conjuntos de dados completos (≥3 réplicas) que ainda não foram publicados. */
export function availableDatasets(s: GameState) {
  return Object.keys(s.replicates).filter((k) => s.replicates[k] >= REPLICATES_FOR_PAPER && !s.published?.[k]);
}

/** Valor científico de um conjunto de dados sozinho. */
function datasetValue(s: GameState, key: string) {
  const { line, agent, readout, partner } = parseKey(key);
  const rel = finding(agent, readout, line, partner).rel;
  const scope = SCOPES[s.equipment.scope].impact;
  const method = readout === 'MTT' ? 0.7 : isAssay(readout) ? ASSAYS[readout].impact * (ASSAYS[readout].imaging ? scope : 1) : scope;
  return rel * (0.6 + 0.08 * LINES[line].level) * method;
}

export interface ImpactBreakdown {
  impact: number;
  methods: number;
  lines: number;
  sameTumor: boolean;
  tumorVsNormal: boolean;
  journal: number;
  reward: number;
  xp: number;
}

/**
 * Impacto de um artigo com vários conjuntos de dados do mesmo tratamento:
 * o melhor conjunto vale inteiro e os demais somam metade; mais técnicas e mais linhagens
 * (do mesmo tipo tumoral, ou tumor × normal) aumentam a robustez.
 */
export function paperImpact(s: GameState, keys: string[]): ImpactBreakdown {
  const vals = keys.map((k) => datasetValue(s, k)).sort((a, b) => b - a);
  const singleReward = vals.reduce((a, v) => a + 250 + 2200 * v, 0);
  const singleXp = vals.reduce((a, v) => a + 40 + 250 * v, 0);
  const base = (vals[0] ?? 0) + 0.5 * vals.slice(1).reduce((a, b) => a + b, 0);
  const parsed = keys.map(parseKey);
  const methods = new Set(parsed.map((p) => p.readout)).size;
  const lineIds = [...new Set(parsed.map((p) => p.line))];
  const diversity = 1 + 0.15 * Math.max(0, methods - 1);
  let robustness = 1 + 0.2 * Math.max(0, lineIds.length - 1);
  const tumors = lineIds.filter((l) => LINES[l].kind === 'tumor');
  const sameTumor = lineIds.length >= 2 && tumors.length === lineIds.length && new Set(tumors.map((l) => LINES[l].tissue)).size === 1;
  const tumorVsNormal = tumors.length > 0 && lineIds.some((l) => LINES[l].kind === 'normal');
  if (sameTumor) robustness *= 1.1;
  if (tumorVsNormal) robustness *= 1.1;
  const synergy = diversity * robustness;
  const impact = base * synergy;
  const journal = JOURNAL_MIN.findIndex((min) => impact >= min);
  // moedas e XP: a soma do que cada conjunto renderia sozinho, com um bônus moderado pela integração;
  // a grande vantagem do artigo integrado é a revista melhor e as citações (índice h)
  const bonus = 0.75 + 0.25 * synergy;
  return { impact, methods, lines: lineIds.length, sameTumor, tumorVsNormal, journal, reward: Math.round(singleReward * bonus), xp: Math.round(singleXp * bonus) };
}

/** Por que não dá para publicar essa combinação (null = pode). */
export function paperBlock(s: GameState, keys: string[]): Msg | null {
  if (!keys.length) return m('err.noDatasets');
  if (keys.length > MAX_DATASETS) return m('err.tooManyDatasets', { n: MAX_DATASETS });
  const agents = new Set(keys.map((k) => parseKey(k).agent));
  if (agents.size > 1) return m('err.sameAgent');
  if (keys.some((k) => (s.replicates[k] ?? 0) < REPLICATES_FOR_PAPER || s.published?.[k])) return m('err.noDatasets');
  return null;
}

export interface Venue {
  journal: number;
  /** impacto efetivo nessa revista (revistas menores e de acesso aberto limitam o impacto) */
  impact: number;
  /** taxa de publicação (APC), só no modo realista */
  fee: number;
  /** financiamento recebido ao publicar (zero no modo realista) */
  reward: number;
  oa: boolean;
}

/**
 * Onde dá para publicar. Fora do modo realista: só a melhor revista, sem taxa e com financiamento.
 * No realista: a melhor revista ou qualquer uma abaixo (mais barata, impacto limitado ao teto dela)
 * e as de acesso aberto (impacto máximo 15).
 */
export function venues(s: GameState, keys: string[]): Venue[] {
  const ib = paperImpact(s, keys);
  if (!diff(s).realistic) return [{ journal: ib.journal, impact: ib.impact, fee: 0, reward: ib.reward, oa: false }];
  const out: Venue[] = [];
  for (let j = ib.journal; j < JOURNAL_MIN.length; j++) {
    const cap = j === 0 ? Infinity : JOURNAL_MIN[j - 1] * 0.99;
    out.push({ journal: j, impact: Math.min(ib.impact, cap), fee: Math.round(JOURNAL_APC[j] * diff(s).price), reward: 0, oa: false });
  }
  for (const o of OA_JOURNALS) out.push({ journal: o.journal, impact: Math.min(ib.impact, o.cap), fee: Math.round(o.fee * diff(s).price), reward: 0, oa: true });
  return out;
}

export function publishPaper(s: GameState, keys: string[], v: Venue): Paper {
  const ib = paperImpact(s, keys);
  const id = Math.random().toString(36).slice(2, 10);
  const paper: Paper = { id, keys: [...keys], agent: parseKey(keys[0]).agent, journal: v.journal, impact: v.impact, reward: v.reward - v.fee, at: s.time };
  s.papers.unshift(paper);
  s.published = { ...(s.published ?? {}), ...Object.fromEntries(keys.map((k) => [k, id])) };
  s.money += v.reward - v.fee;
  bump(s, 'papers');
  addXp(s, Math.round(ib.xp * (ib.impact > 0 ? v.impact / ib.impact : 1)));
  if (v.fee > 0) log(s, 'log.paperPaid', { journal: `@journal.${v.journal}`, fee: v.fee }, 'good');
  else log(s, 'log.paper', { journal: `@journal.${v.journal}`, reward: v.reward }, 'good');
  return paper;
}

// ---------------------------------------------------------------- citações e índice h

/** Citações crescem com o impacto, com o tamanho do artigo e com o tempo desde a publicação. */
export function citations(p: Paper, now: number) {
  const days = Math.max(0, (now - p.at) / 24);
  return Math.floor(p.impact ** 0.8 * 6 * (1 + 0.15 * (p.keys.length - 1)) * (1 + days) ** 0.6);
}

export function hIndex(s: GameState) {
  const c = s.papers.map((p) => citations(p, s.time)).sort((a, b) => b - a);
  let h = 0;
  while (h < c.length && c[h] >= h + 1) h++;
  return h;
}

export const totalCitations = (s: GameState) => s.papers.reduce((n, p) => n + citations(p, s.time), 0);
