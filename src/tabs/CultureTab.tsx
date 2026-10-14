import { useState } from 'react';
import { CellAvatar } from '../components/CellAvatar';
import { FlaskSvg } from '../components/FlaskSvg';
import { Microscope } from '../components/Microscope';
import { Bar, Empty, fmtCells, fmtNum, pct, type Tone } from '../components/ui';
import { discardFlask, feed, mediumNeeds, passage } from '../game/actions';
import { FLASKS, LINES, MEDIA } from '../game/data';
import { act, useGame } from '../game/store';
import { capacity, co2Of, confluence, flaskMood, flaskName, MOOD_TEXT, viability } from '../game/sim';
import type { Flask } from '../game/types';
import { ExperimentModal } from '../modals/ExperimentModal';
import { TransductionModal } from '../modals/TransductionModal';

const tone = (bad: boolean, warn: boolean): Tone => (bad ? 'bad' : warn ? 'warn' : 'good');

function FlaskChip({ f, active }: { f: Flask; active: boolean }) {
  const mood = flaskMood(f);
  const ok = mood === 'happy' || mood === 'lonely' || mood === 'transducing';
  return (
    <button className={`chip ${active ? 'active' : ''}`} onClick={() => act((s) => void (s.selectedFlaskId = f.id), true)}>
      <span className={`dot ${ok ? 'ok' : 'alert'}`} />
      {flaskName(f)}
    </button>
  );
}

export function CultureTab({ goTo }: { goTo: (tab: 'freezer' | 'shop') => void }) {
  const s = useGame();
  const [view, setView] = useState<'cell' | 'scope'>('cell');
  const [fluo, setFluo] = useState(false);
  const [modal, setModal] = useState<null | 'exp' | 'trans'>(null);
  const f = s.flasks.find((x) => x.id === s.selectedFlaskId) ?? s.flasks[0];

  if (!f) {
    return (
      <Empty icon="🧫" title="Nenhum frasco na estufa">
        <p>Descongele um criotubo no freezer ou compre células no banco de células.</p>
        <div className="row">
          <button className="btn" onClick={() => goTo('freezer')}>❄️ Freezer</button>
          <button className="btn primary" onClick={() => goTo('shop')}>🛒 Loja</button>
        </div>
      </Empty>
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
    .map(([k, n]) => `${fmtNum(n)} mL ${k === 'FBS' ? 'SFB' : M.name.split(' ')[0]}`)
    .join(' + ');
  const canFluo = s.equipment.fluo && f.markers.length > 0;

  return (
    <div className="culture">
      <div className="chips">
        {s.flasks.map((x) => (
          <FlaskChip key={x.id} f={x} active={x.id === f.id} />
        ))}
      </div>

      <section className="stage">
        <div className="bubble">{MOOD_TEXT[mood]}</div>
        {view === 'cell' ? <CellAvatar flask={f} time={s.time} /> : <Microscope flask={f} fluo={fluo && canFluo} />}
        <div className="seg">
          <button className={view === 'cell' ? 'on' : ''} onClick={() => setView('cell')}>😊 Célula</button>
          <button className={view === 'scope' ? 'on' : ''} onClick={() => setView('scope')}>🔬 Microscópio</button>
          {view === 'scope' && (
            <button
              className={fluo && canFluo ? 'on fluo' : ''}
              disabled={!canFluo}
              title={!s.equipment.fluo ? 'Compre o microscópio de fluorescência' : 'Sem marcador fluorescente'}
              onClick={() => setFluo(!fluo)}
            >
              ✨ Fluorescência
            </button>
          )}
        </div>
      </section>

      <section className="card info">
        <FlaskSvg flask={f} />
        <div>
          <h3>{flaskName(f)}</h3>
          <p className="muted">
            {f.type} · P{f.passage} · {M.name}
            {f.medium !== L.medium && ' ⚠️ meio errado'}
            <br />
            {inc?.name} · {fmtNum(co2Of(s, f))}% CO₂
            {f.markers.length > 0 && <> · 🧬 {f.markers.join(', ')}</>}
            {f.transduction && <> · 🦠 {f.transduction.marker} ({Math.ceil(f.transduction.hoursLeft)} h)</>}
          </p>
        </div>
      </section>

      <section className="card stats">
        <Bar label="Células vivas" value={fmtCells(f.live)} fill={f.live / capacity(f)} tone="neutral" />
        {L.suspension ? (
          <Bar label="Densidade" value={`${fmtNum(f.live / vol / 1e6, 2)} mi/mL`} fill={conf} tone={tone(conf > 0.95, conf > 0.8)} />
        ) : (
          <Bar label="Confluência" value={pct(conf)} fill={conf} tone={tone(conf > 0.95, conf > 0.8)} />
        )}
        <Bar label="Viabilidade" value={pct(v)} fill={v} tone={tone(v < 0.8, v < 0.9)} />
        <Bar label="Glicose" value={`${fmtNum(f.glucose)} mM`} fill={f.glucose / M.glc} tone={tone(f.glucose < 2, f.glucose < 5)} />
        <Bar label="Lactato" value={`${fmtNum(f.lactate)} mM`} fill={f.lactate / 30} tone={tone(f.lactate > 20, f.lactate > 12)} />
        <Bar label="Amônia" value={`${fmtNum(f.ammonia, 2)} mM`} fill={f.ammonia / 5} tone={tone(f.ammonia > 3, f.ammonia > 2)} />
        <div className="bar">
          <div className="bar-head">
            <span>pH (vermelho de fenol)</span>
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
          <span>🍽️</span>Trocar meio<small>{feedLabel}</small>
        </button>
        <button className="act" onClick={() => act((st) => passage(st, f.id))}>
          <span>{L.suspension ? '🌀' : '✂️'}</span>
          {L.suspension ? 'Coletar e repicar' : 'Tripsinizar'}
          <small>{L.suspension ? 'centrifugar e ressuspender' : `${FLASKS[f.type].trypsin * 2} mL PBS + ${FLASKS[f.type].trypsin} mL tripsina`}</small>
        </button>
        <button className="act" onClick={() => setModal('exp')}>
          <span>🧪</span>Experimento<small>tratar e analisar</small>
        </button>
        <button className="act" onClick={() => setModal('trans')}>
          <span>🦠</span>Transduzir<small>adicionar marcador</small>
        </button>
        <button
          className="act danger"
          onClick={() => {
            if (window.confirm(`Descartar ${flaskName(f)}?`)) act((st) => discardFlask(st, f.id));
          }}
        >
          <span>🗑️</span>Descartar<small>autoclave</small>
        </button>
      </section>

      <details className="card fact">
        <summary>📖 Sobre a {L.name}</summary>
        <p>
          <b>{L.origin}.</b> {L.fact}
        </p>
        <p className="muted">
          Meio: {MEDIA[L.medium].name} · duplicação ≈ {L.td} h · p53 {L.p53 === 'wt' ? 'selvagem' : 'inativo'}
          {L.maxPassage && ` · senescência após P${L.maxPassage}`}
        </p>
      </details>

      {modal === 'exp' && <ExperimentModal flask={f} onClose={() => setModal(null)} />}
      {modal === 'trans' && <TransductionModal flask={f} onClose={() => setModal(null)} />}
    </div>
  );
}
