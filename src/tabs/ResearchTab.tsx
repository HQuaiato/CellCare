import { useState } from 'react';
import { Info, fmtClock, fmtDuration, fmtMoney, fmtNum } from '../components/ui';
import { LEVELS, LINES, MARKERS, finding, levelOf, unlocksAt } from '../game/data';
import { REPLICATES_FOR_PAPER, lastResult, parseKey, readoutName } from '../game/research';
import { useGame } from '../game/store';
import type { LabResult, Paper } from '../game/types';
import { t } from '../i18n';
import { ResultCard, ResultModal } from '../modals/ResultModal';

const rname = (r: Paper['readout']) => {
  const x = readoutName(r);
  return x.startsWith('@') ? t(x.slice(1)) : x;
};

const keyLabel = (key: string) => {
  const { line, agent, readout } = parseKey(key);
  return `${LINES[line].name} + ${t(`agent.${agent}`)} · ${rname(readout)}`;
};

function paperTitle(p: Paper) {
  const f = finding(p.agent, p.readout, p.line);
  const markers = p.markers.length ? ' ' + p.markers.map((mk) => MARKERS[mk].name).join('/') : '';
  return `${t(`agent.${p.agent}`)} ${t(f.key)}${f.suffix ? t(f.suffix) : ''} ${t('paper.inCells', { line: LINES[p.line].name + markers })}`;
}

function PaperItem({ p, figure }: { p: Paper; figure?: LabResult }) {
  const [open, setOpen] = useState(false);
  const f = finding(p.agent, p.readout, p.line);
  return (
    <div className={`paper ${open ? 'open' : ''}`}>
      <button className="paper-head" onClick={() => setOpen(!open)}>
        <b>“{paperTitle(p)}”</b>
        <small>
          <i>{t(`journal.${p.journal}`)}</i> · {t('res.impact', { i: fmtNum(p.impact * 10) })} · {fmtMoney(p.reward)} {open ? '▲' : '▼'}
        </small>
      </button>
      {open && (
        <div className="paper-body">
          <p className="small">
            <b>{t('paper.abstractTitle')}</b>{' '}
            {t('paper.abstract', {
              line: LINES[p.line].name,
              agent: `@agent.${p.agent}`,
              readout: rname(p.readout),
              finding: '@' + f.key,
              n: REPLICATES_FOR_PAPER,
            })}
          </p>
          {figure && <ResultCard r={figure} />}
          <p className="muted small">{t('paper.published', { when: fmtClock(p.at) })}</p>
        </div>
      )}
    </div>
  );
}

export function ResearchTab() {
  const s = useGame();
  const lv = levelOf(s.xp);
  const [view, setView] = useState<LabResult | null>(null);
  const keys = Object.keys(s.replicates).sort((a, b) => (s.replicates[b] ?? 0) - (s.replicates[a] ?? 0));
  const next = [lv + 1, lv + 2].filter((l) => l <= LEVELS.length);
  const results = s.labResults ?? [];

  return (
    <div className="stack grid-2">
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
              <small className="muted">{e.flaskName}</small>
            </div>
          );
        })}
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

      <section className="card">
        <h3>📊 {t('res.projects')}</h3>
        {keys.length === 0 && <p className="muted small">{t('res.noProjects', { n: REPLICATES_FOR_PAPER })}</p>}
        {keys.map((k) => {
          const { line, agent, readout } = parseKey(k);
          return (
            <div key={k} className="project">
              <div className="row between">
                <b>{keyLabel(k)}</b>
                <span className={`pill ${s.replicates[k] >= REPLICATES_FOR_PAPER ? 'done' : ''}`}>
                  {Math.min(s.replicates[k], REPLICATES_FOR_PAPER)}/{REPLICATES_FOR_PAPER}
                </span>
              </div>
              <small className="muted">{t(finding(agent, readout, line).key)}</small>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h3>📄 {t('res.papers', { n: s.papers.length })}</h3>
        {s.papers.length === 0 && <p className="muted small">{t('res.noPapers')}</p>}
        {s.papers.map((p) => (
          <PaperItem key={p.id} p={p} figure={lastResult(s, p.key)} />
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
