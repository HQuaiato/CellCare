import { useState } from 'react';
import { CellAvatar } from '../components/CellAvatar';
import { FlaskSvg } from '../components/FlaskSvg';
import { Microscope } from '../components/Microscope';
import { QuestCard } from '../components/QuestCard';
import { Bar, Empty, Info, fmtCells, fmtNum, pct, type Tone } from '../components/ui';
import { askHelp, canAskHelp, discardFlask, feed, have, mediumNeeds, passage, testMyco, treatContam, treatMyco } from '../game/actions';
import { CONTAM, FLASKS, LINES, MEDIA, SCOPES, hasScope, levelOf } from '../game/data';
import { capacity, co2Of, confluence, flaskMood, flaskName, viability } from '../game/sim';
import { act, useGame } from '../game/store';
import type { Flask, GameState, ScopeMode } from '../game/types';
import { t } from '../i18n';
import { ExperimentModal } from '../modals/ExperimentModal';
import { PassesModal } from '../modals/PassesModal';
import { TransductionModal } from '../modals/TransductionModal';

const tone = (bad: boolean, warn: boolean): Tone => (bad ? 'bad' : warn ? 'warn' : 'good');

function FlaskChip({ f, active }: { f: Flask; active: boolean }) {
  const mood = flaskMood(f);
  const ok = ['happy', 'lonely', 'transducing', 'treating'].includes(mood);
  return (
    <button className={`chip ${active ? 'active' : ''}`} onClick={() => act((s) => void (s.selectedFlaskId = f.id), true)}>
      <span className={`dot ${ok ? 'ok' : 'alert'}`} />
      {flaskName(f)}
    </button>
  );
}

function HelpCard({ s }: { s: GameState }) {
  if (!canAskHelp(s)) return null;
  return (
    <section className="card help-card">
      <h3>🆘 {t('help.title')}</h3>
      <p className="small">{t('help.text')}</p>
      <button className="btn primary block" onClick={() => act(askHelp)}>
        {t('help.button')}
      </button>
    </section>
  );
}

/** Passes ativos + botão para usar passes. */
function BoostBar({ s, onOpen }: { s: GameState; onOpen: () => void }) {
  const b = s.boosts;
  const active = [
    b.autoFeedUntil > s.time && `🤖 ${Math.ceil(b.autoFeedUntil - s.time)} h`,
    b.shieldUntil > s.time && `🛡️ ${Math.ceil(b.shieldUntil - s.time)} h`,
    b.sale2xUntil > s.time && `🏷️ ×2 ${Math.ceil(b.sale2xUntil - s.time)} h`,
    b.xp2xUntil > s.time && `☕ XP×2 ${Math.ceil(b.xp2xUntil - s.time)} h`,
    b.lucky > 0 && `🍀 ×${b.lucky}`,
  ].filter(Boolean) as string[];
  const owned = Object.entries(s.inventory).filter(([k, v]) => k.startsWith('pass_') && v > 0).reduce((n, [, v]) => n + v, 0);
  return (
    <section className="card boostbar">
      <div className="badges grow">
        {active.length ? active.map((a) => <span key={a} className="badge-pill">{a}</span>) : <span className="muted small">{t('passes.none')}</span>}
      </div>
      <button className="btn small gold" onClick={onOpen}>
        ⚡ {t('passes.open', { n: owned })}
      </button>
    </section>
  );
}

function ContamPanel({ f, s }: { f: Flask; s: GameState }) {
  const c = f.contam;
  if (!c?.detected) return null;
  const myco = c.type === 'mycoplasma';
  const item = c.type === 'bacteria' ? 'abx_high' : 'afx_high';
  return (
    <section className={`card contam contam-${c.type}`}>
      <h3>
        {c.type === 'bacteria' ? '🦠' : c.type === 'fungus' ? '🍄' : '🧫'} {t(`contam.${c.type}`)} · {pct(c.level)}
      </h3>
      <p className="small">{t(`contam.${c.type}.what`)}</p>
      <p className="small muted">{t(`contam.${c.type}.fix`)}</p>
      <div className="row wrap">
        {myco ? (
          <button className="btn primary" disabled={f.mycoTreat > 0} onClick={() => act((st) => treatMyco(st, f.id))}>
            💊 {t('act.treatMyco')} ({have(s, 'myco_treat')})
          </button>
        ) : (
          <button className="btn primary" onClick={() => act((st) => treatContam(st, f.id))}>
            💊 {t(`act.treat.${c.type}`)} ({have(s, item)})
          </button>
        )}
        <button className="btn danger" onClick={() => act((st) => discardFlask(st, f.id))}>
          🗑️ {t('act.discard')}
        </button>
      </div>
    </section>
  );
}

export function CultureTab({ goTo }: { goTo: (tab: 'freezer' | 'shop') => void }) {
  const s = useGame();
  const [view, setView] = useState<'cell' | ScopeMode>('cell');
  const [modal, setModal] = useState<null | 'exp' | 'trans' | 'passes'>(null);
  const f = s.flasks.find((x) => x.id === s.selectedFlaskId) ?? s.flasks[0];
  const lv = levelOf(s.xp);

  if (!f) {
    return (
      <div className="stack">
        <HelpCard s={s} />
        <QuestCard />
        <Empty icon="🧫" title={t('culture.empty')}>
          <p>{t('culture.emptyText')}</p>
          <div className="row">
            <button className="btn" onClick={() => goTo('freezer')}>
              ❄️ {t('tab.freezer')}
            </button>
            <button className="btn primary" onClick={() => goTo('shop')}>
              🛒 {t('tab.shop')}
            </button>
          </div>
        </Empty>
      </div>
    );
  }

  const L = LINES[f.line];
  const M = MEDIA[f.medium];
  const mood = flaskMood(f);
  const conf = confluence(f);
  const v = viability(f);
  const vol = FLASKS[f.type].vol;
  const inc = s.incubators.find((i) => i.id === f.incubatorId);
  const needs = mediumNeeds(f.medium, vol);
  const feedLabel = Object.entries(needs)
    .map(([k, n]) => `${fmtNum(n)} mL ${k === 'FBS' ? t('inv.FBS') : t(`medium.${f.medium}.short`)}`)
    .join(' + ');
  const modes = SCOPES.slice(0, s.equipment.scope + 1).map((x) => x.id);
  const mode = view === 'cell' || !modes.includes(view) ? null : view;

  return (
    <div className="culture">
      <div className="chips">
        {s.flasks.map((x) => (
          <FlaskChip key={x.id} f={x} active={x.id === f.id} />
        ))}
      </div>

      <div className="culture-grid">
        <div className="culture-left">
          <section className="stage">
            <div className="bubble">{t(`mood.${mood}`)}</div>
            {mode ? <Microscope flask={f} mode={mode} /> : <CellAvatar flask={f} time={s.time} />}
            <div className="seg scope-seg">
              <button className={!mode ? 'on' : ''} onClick={() => setView('cell')}>
                😊 {t('culture.cell')}
              </button>
              {modes.map((md) => (
                <button key={md} className={mode === md ? `on mode-${md}` : ''} onClick={() => setView(md)} title={t(`scope.${md}`)}>
                  {t(`scope.${md}.icon`)} {t(`scope.${md}.short`)}
                </button>
              ))}
            </div>
            {mode && <p className="muted small center">{t(`scope.${mode}.hint`)}</p>}
            {!hasScope(s.equipment.scope, 'electron') && <p className="muted small center">{t('culture.scopeUpgrade')}</p>}
          </section>

          <section className="card info">
            <FlaskSvg flask={f} />
            <div>
              <h3>{flaskName(f)}</h3>
              <p className="muted small">
                {f.type} · P{f.passage}
                {L.maxPassage && ` / ${L.maxPassage}`} · {t(`medium.${f.medium}`)}
                {f.medium !== L.medium && ` ⚠️ ${t('culture.wrongMedium')}`}
                <br />
                {t('ui.incubator', { name: inc?.name ?? '?' })} · {fmtNum(co2Of(s, f))}% CO₂
                {f.markers.length > 0 && <> · 🧬 {f.markers.join(', ')}</>}
              </p>
              <div className="badges">
                {f.abx && <span className="badge-pill">🛡️ Pen/Strep</span>}
                {f.afx && <span className="badge-pill">🛡️ {t('inv.ampho')}</span>}
                {f.transduction && <span className="badge-pill">🦠 {f.transduction.marker} · {Math.ceil(f.transduction.hoursLeft)} h</span>}
                {f.mycoTreat > 0 && <span className="badge-pill">💊 {t('culture.mycoTreating', { h: Math.ceil(f.mycoTreat) })}</span>}
              </div>
            </div>
          </section>
        </div>

        <div className="culture-right">
          <HelpCard s={s} />
          <QuestCard />
          <BoostBar s={s} onOpen={() => setModal('passes')} />
          <ContamPanel f={f} s={s} />

          <section className="card stats">
            <Bar label={t('stat.live')} value={fmtCells(f.live)} fill={f.live / capacity(f)} tone="neutral" help="help.live" />
            {L.suspension ? (
              <Bar label={t('stat.density')} value={`${fmtNum(f.live / vol / 1e6, 2)} ${t('unit.million')}/mL`} fill={conf} tone={tone(conf > 0.95, conf > 0.8)} help="help.density" />
            ) : (
              <Bar label={t('stat.confluence')} value={pct(conf)} fill={conf} tone={tone(conf > 0.95, conf > 0.8)} help="help.confluence" />
            )}
            <Bar label={t('stat.viability')} value={pct(v)} fill={v} tone={tone(v < 0.8, v < 0.9)} help="help.viability" />
            <Bar label={t('stat.glucose')} value={`${fmtNum(f.glucose)} mM`} fill={f.glucose / M.glc} tone={tone(f.glucose < 2, f.glucose < 5)} help="help.glucose" />
            <Bar label={t('stat.lactate')} value={`${fmtNum(f.lactate)} mM`} fill={f.lactate / 30} tone={tone(f.lactate > 20, f.lactate > 12)} help="help.lactate" />
            <Bar label={t('stat.ammonia')} value={`${fmtNum(f.ammonia, 2)} mM`} fill={f.ammonia / 5} tone={tone(f.ammonia > 3, f.ammonia > 2)} help="help.ammonia" />
            <div className="bar">
              <div className="bar-head">
                <span>
                  {t('stat.ph')} <Info k="help.ph" />
                </span>
                <b>{fmtNum(f.pH, 2)}</b>
              </div>
              <div className="ph-track">
                <div className="ph-mark" style={{ left: `${Math.max(0, Math.min(100, ((f.pH - 6.4) / 1.8) * 100))}%` }} />
                <div className="ph-ideal" />
              </div>
            </div>
          </section>

          <section className="actions">
            <button className="act" onClick={() => act((st) => feed(st, f.id))}>
              <span>🍽️</span>
              {t('act.feed')}
              <small>{feedLabel}</small>
            </button>
            <button className="act" onClick={() => act((st) => passage(st, f.id))}>
              <span>{L.suspension ? '🌀' : '✂️'}</span>
              {t(L.suspension ? 'act.collect' : 'act.trypsinize')}
              <small>{L.suspension ? t('act.collectSub') : t('act.trypsinizeSub', { pbs: FLASKS[f.type].trypsin * 2, tryp: FLASKS[f.type].trypsin })}</small>
            </button>
            <button className="act" onClick={() => setModal('exp')}>
              <span>🧪</span>
              {t('act.experiment')}
              <small>{t('act.experimentSub')}</small>
            </button>
            <button className="act" onClick={() => setModal('trans')}>
              <span>🧬</span>
              {t('act.transduce')}
              <small>{t('act.transduceSub')}</small>
            </button>
            {lv >= CONTAM.mycoplasma.level && (
              <button className="act" onClick={() => act((st) => testMyco(st, f.id))}>
                <span>🧾</span>
                {t('act.testMyco')}
                <small>{t('act.testMycoSub', { n: have(s, 'myco_pcr') })}</small>
              </button>
            )}
            <button
              className="act danger"
              onClick={() => {
                if (window.confirm(t('act.discardConfirm', { flask: flaskName(f) }))) act((st) => discardFlask(st, f.id));
              }}
            >
              <span>🗑️</span>
              {t('act.discard')}
            </button>
          </section>

          <details className="card fact">
            <summary>📖 {t('culture.about', { line: L.name })}</summary>
            <p>
              <b>{t(`line.${f.line}.origin`)}.</b> {t(`line.${f.line}.fact`)}
            </p>
            <p className="muted small">
              {t('culture.lineSpecs', { medium: `@medium.${L.medium}`, td: L.td, p53: L.p53 === 'wt' ? '@ui.p53wt' : '@ui.p53null' })}
              {L.maxPassage && ` · ${t('culture.senescenceAt', { p: L.maxPassage })}`}
            </p>
          </details>
        </div>
      </div>

      {modal === 'exp' && <ExperimentModal flask={f} onClose={() => setModal(null)} />}
      {modal === 'trans' && <TransductionModal flask={f} onClose={() => setModal(null)} />}
      {modal === 'passes' && <PassesModal flask={f} onClose={() => setModal(null)} />}
    </div>
  );
}
