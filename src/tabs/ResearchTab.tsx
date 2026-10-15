import { useState } from 'react';
import { Info, fmtClock, fmtDuration, fmtMoney, fmtNum } from '../components/ui';
import { publish, submitGrant } from '../game/actions';
import { grantAmount, grantBlock, grantChance, relevance } from '../game/grants';
import { GRANT_TIERS, LEVELS, LINES, diff, finding, levelOf, unlocksAt } from '../game/data';
import {
  MAX_DATASETS,
  REPLICATES_FOR_PAPER,
  availableDatasets,
  citations,
  hIndex,
  lastResult,
  paperBlock,
  paperImpact,
  parseKey,
  readoutName,
  totalCitations,
  venues,
} from '../game/research';
import { act, useGame } from '../game/store';
import type { GameState, LabResult, Paper, Readout } from '../game/types';
import { t, tm } from '../i18n';
import { ResultCard, ResultModal } from '../modals/ResultModal';

const rname = (r: Readout) => {
  const x = readoutName(r);
  return x.startsWith('@') ? t(x.slice(1)) : x;
};

export const keyLabel = (key: string) => {
  const { line, agent, readout, partner } = parseKey(key);
  return `${LINES[line].name}${partner ? ` + ${LINES[partner].name}` : ''} · ${t(`agent.${agent}`)} · ${rname(readout)}`;
};

const keyFinding = (key: string) => {
  const { line, agent, readout, partner } = parseKey(key);
  const f = finding(agent, readout, line, partner);
  return `${t(f.key)}${f.suffix ? t(f.suffix) : ''}`;
};

function paperTitle(p: Paper) {
  const parsed = p.keys.map(parseKey);
  const lines = [...new Set(parsed.map((x) => LINES[x.line].name))];
  if (p.keys.length === 1) return `${t(`agent.${p.agent}`)} ${keyFinding(p.keys[0])} ${t('paper.inCells', { line: lines[0] })}`;
  const methods = [...new Set(parsed.map((x) => x.readout))];
  if (methods.length === 1) return t('paper.multiLine', { agent: `@agent.${p.agent}`, lines: lines.join(', '), readout: rname(methods[0]) });
  return t('paper.integrated', { agent: `@agent.${p.agent}`, lines: lines.join(', '), n: methods.length });
}

function PaperItem({ p, s }: { p: Paper; s: GameState }) {
  const [open, setOpen] = useState(false);
  const parsed = p.keys.map(parseKey);
  const lines = [...new Set(parsed.map((x) => LINES[x.line].name))].join(', ');
  const readouts = [...new Set(parsed.map((x) => rname(x.readout)))].join(', ');
  return (
    <div className={`paper ${open ? 'open' : ''}`}>
      <button className="paper-head" onClick={() => setOpen(!open)}>
        <b>“{paperTitle(p)}”</b>
        <small>
          <i>{t(`journal.${p.journal}`)}</i> · {t('res.impact', { i: fmtNum(p.impact * 10) })} · {t('res.cites', { n: citations(p, s.time) })} {open ? '▲' : '▼'}
        </small>
      </button>
      {open && (
        <div className="paper-body">
          <p className="small">
            <b>{t('paper.abstractTitle')}</b>{' '}
            {t(p.keys.length > 1 ? 'paper.abstractMulti' : 'paper.abstract', {
              line: lines,
              agent: `@agent.${p.agent}`,
              readout: readouts,
              finding: keyFinding(p.keys[0]),
              n: REPLICATES_FOR_PAPER,
            })}
          </p>
          {p.keys.length > 1 && (
            <ul className="findings">
              {p.keys.map((k) => (
                <li key={k}>
                  <b>{keyLabel(k)}:</b> {keyFinding(k)}
                </li>
              ))}
            </ul>
          )}
          {p.keys.map((k) => {
            const fig = lastResult(s, k);
            return fig ? <ResultCard key={k} r={fig} /> : null;
          })}
          <p className="muted small">{t('paper.published', { when: fmtClock(p.at) })} · {fmtMoney(p.reward)}</p>
        </div>
      )}
    </div>
  );
}

/** Montagem de artigo: escolha conjuntos de dados do mesmo tratamento. */
function Composer({ s }: { s: GameState }) {
  const [sel, setSel] = useState<string[]>([]);
  const [journal, setJournal] = useState<number | null>(null);
  const avail = availableDatasets(s);
  const realistic = !!diff(s).realistic;
  const chosen = sel.filter((k) => avail.includes(k));
  const block = paperBlock(s, chosen);
  const ib = chosen.length ? paperImpact(s, chosen) : null;
  const opts = chosen.length && !block ? venues(s, chosen) : [];
  const venue = opts.find((v) => v.journal === journal) ?? opts[0];
  const agentSel = chosen.length ? parseKey(chosen[0]).agent : null;
  const toggle = (k: string) => setSel((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev.filter((x) => avail.includes(x)), k]));

  return (
    <section className="card span-2">
      <h3>
        📚 {t('res.datasets', { n: avail.length })} <Info k="res.datasetsInfo" title={t('res.composer')} />
      </h3>
      {avail.length === 0 && <p className="muted small">{t('res.noDatasets', { n: REPLICATES_FOR_PAPER })}</p>}
      <div className="dataset-list">
        {avail.map((k) => {
          const other = agentSel !== null && parseKey(k).agent !== agentSel;
          return (
            <button key={k} className={`dataset ${chosen.includes(k) ? 'on' : ''} ${other ? 'other' : ''}`} onClick={() => toggle(k)}>
              <span>{chosen.includes(k) ? '☑' : '☐'}</span>
              <span className="grow">
                <b>{keyLabel(k)}</b>
                <small>{keyFinding(k)}</small>
              </span>
            </button>
          );
        })}
      </div>
      {ib && (
        <div className="composer">
          <div className="badges">
            <span className="badge-pill">📄 {t('res.nDatasets', { n: chosen.length, max: MAX_DATASETS })}</span>
            <span className="badge-pill">🔬 {t('res.nMethods', { n: ib.methods })}</span>
            <span className="badge-pill">🧫 {t('res.nLines', { n: ib.lines })}</span>
            {ib.sameTumor && <span className="badge-pill">🎯 {t('res.sameTumor')}</span>}
            {ib.tumorVsNormal && <span className="badge-pill">⚖️ {t('res.tumorVsNormal')}</span>}
          </div>
          {realistic && venue ? (
            <>
              <h4>
                {t('res.venue')} <Info k="res.venueInfo" title={t('res.venue')} />
              </h4>
              <div className="venues">
                {opts.map((v) => (
                  <button key={v.journal} className={`venue ${venue.journal === v.journal ? 'on' : ''}`} onClick={() => setJournal(v.journal)}>
                    <b>
                      {v.oa && '🔓 '}
                      {t(`journal.${v.journal}`)}
                    </b>
                    <small>
                      {t('res.impact', { i: fmtNum(v.impact * 10) })} · {v.fee > 0 ? t('res.apc', { fee: fmtMoney(v.fee) }) : t('res.free')}
                    </small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="small">{t('res.preview', { journal: `@journal.${ib.journal}`, i: fmtNum(ib.impact * 10), reward: fmtMoney(ib.reward) })}</p>
          )}
          {block && <p className="hint bad">{tm(block)}</p>}
          <button
            className="btn primary block"
            disabled={!!block || (realistic && !!venue && s.money < venue.fee)}
            onClick={() => {
              if (act((st) => publish(st, chosen, venue?.journal), true)) {
                setSel([]);
                setJournal(null);
              }
            }}
          >
            📤 {t('res.submit')}
          </button>
        </div>
      )}
    </section>
  );
}

/** Editais de projeto (modo realista). */
function GrantsPanel({ s }: { s: GameState }) {
  const g = s.grants;
  return (
    <section className="card span-2">
      <h3>
        💼 {t('grant.title')} <Info k="grant.info" title={t('grant.title')} />
      </h3>
      <p className="small muted">
        {t('grant.relevance', { r: fmtNum(relevance(s)) })} · {t('grant.record', { w: g?.won ?? 0, l: g?.lost ?? 0 })}
      </p>
      <div className="grant-list">
        {(g?.calls ?? []).map((c) => {
          const block = grantBlock(s, c.id);
          return (
            <div key={c.id} className={`grant grant-${c.tier}`}>
              <div className="grow">
                <b>{t(`grant.${c.tier}`)}</b>
                <small>
                  {t('grant.callInfo', { max: fmtMoney(c.max), ask: fmtMoney(grantAmount(s, c.max)), chance: Math.round(grantChance(s, c.tier) * 100), days: Math.round(GRANT_TIERS[c.tier].review / 24) })}
                </small>
              </div>
              <button className="btn small primary" disabled={!!block} title={block ? tm(block) : ''} onClick={() => act((st) => submitGrant(st, c.id))}>
                {t('grant.submit')}
              </button>
            </div>
          );
        })}
        {(g?.calls ?? []).length === 0 && <p className="muted small">{t('grant.noCalls', { d: fmtDuration(Math.max(0, (g?.refreshAt ?? 0) - s.time)) })}</p>}
      </div>
      {(g?.apps ?? []).length > 0 && <h4>{t('grant.pending')}</h4>}
      {(g?.apps ?? []).map((a) => (
        <div key={a.id} className="project row between">
          <span className="small">
            {t(`grant.${a.tier}`)} · {fmtMoney(a.amount)} · {Math.round(a.chance * 100)}%
          </span>
          <span className="pill">{fmtDuration(a.resultAt - s.time)}</span>
        </div>
      ))}
    </section>
  );
}

export function ResearchTab() {
  const s = useGame();
  const lv = levelOf(s.xp);
  const [view, setView] = useState<LabResult | null>(null);
  const inProgress = Object.keys(s.replicates).filter((k) => s.replicates[k] < REPLICATES_FOR_PAPER);
  const next = [lv + 1, lv + 2].filter((l) => l <= LEVELS.length);
  const results = s.labResults ?? [];

  return (
    <div className="stack grid-2">
      <section className="card span-2 science-card">
        <div>
          <small className="muted">{t('res.hIndex')}</small>
          <b>{hIndex(s)}</b>
        </div>
        <div>
          <small className="muted">{t('res.totalCites')}</small>
          <b>{totalCitations(s)}</b>
        </div>
        <div>
          <small className="muted">{t('res.paperCount')}</small>
          <b>{s.papers.length}</b>
        </div>
        <Info k="res.hInfo" title={t('res.hIndex')} />
      </section>

      {diff(s).realistic && <GrantsPanel s={s} />}
      <Composer s={s} />

      <section className="card">
        <h3>⏳ {t('res.running')}</h3>
        {s.experiments.length === 0 && <p className="muted small">{t('res.noneRunning')}</p>}
        {s.experiments.map((e) => {
          const done = (s.time - e.startedAt) / (e.readyAt - e.startedAt);
          return (
            <div key={e.id} className="exp">
              <div className="row between">
                <b>{keyLabel(e.key)}</b>
                <span className="muted small">{fmtDuration(e.readyAt - s.time)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill tone-neutral" style={{ width: `${done * 100}%` }} />
              </div>
            </div>
          );
        })}
        {inProgress.length > 0 && <h4>{t('res.projects')}</h4>}
        {inProgress.map((k) => (
          <div key={k} className="project row between">
            <span className="small">{keyLabel(k)}</span>
            <span className="pill">
              {s.replicates[k]}/{REPLICATES_FOR_PAPER}
            </span>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>
          🖼️ {t('res.results')} <Info k="res.resultsInfo" />
        </h3>
        {results.length === 0 && <p className="muted small">{t('res.noResults')}</p>}
        <div className="result-list">
          {results.slice(0, 12).map((r) => (
            <button key={r.id} className={`result-chip ${r.ok ? '' : 'bad'}`} onClick={() => setView(r)}>
              <span>{r.ok ? '✅' : '⚠️'}</span>
              <span className="grow">{keyLabel(r.key)}</span>
              <small className="muted">{fmtClock(r.at)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card span-2">
        <h3>📄 {t('res.papers', { n: s.papers.length })}</h3>
        {s.papers.length === 0 && <p className="muted small">{t('res.noPapers')}</p>}
        {s.papers.map((p) => (
          <PaperItem key={p.id} p={p} s={s} />
        ))}
      </section>

      <section className="card span-2">
        <h3>
          🗺️ {t('res.nextLevels')} <Info k="res.xpHint" />
        </h3>
        {next.map((l) => (
          <p key={l} className="small">
            <b>{t('ui.lvLong', { lv: l })}</b> ({LEVELS[l - 1]} XP): {t('res.unlocks', { u: unlocksAt(l).join('|') || '@res.prestige' })}
          </p>
        ))}
      </section>

      {view && <ResultModal r={view} onClose={() => setView(null)} />}
    </div>
  );
}
