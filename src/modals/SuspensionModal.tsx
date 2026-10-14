import { useState } from 'react';
import { Modal, fmtCells, fmtMoney, fmtNum, pct } from '../components/ui';
import { discardSuspension, freeSlots, freeze, have, mediumNeeds, recommendedSeed, seed, sellSuspension } from '../game/actions';
import { CELLS_PER_VIAL, FLASK_TYPES, FLASKS, LINES } from '../game/data';
import { unitPrice } from '../game/econ';
import { act, useGame } from '../game/store';
import { viability } from '../game/sim';
import type { FlaskType } from '../game/types';

/** milhões, arredondado para baixo em 0,01 para nunca pedir mais do que existe */
const toM = (cells: number) => Math.floor(cells / 1e4) / 100;

export function SuspensionModal() {
  const s = useGame();
  const sus = s.suspension!;
  const L = LINES[sus.line];
  const [type, setType] = useState<FlaskType>('T75');
  const [millions, setMillions] = useState(() => toM(Math.min(sus.live, recommendedSeed(sus.line, 'T75'))));
  const maxVials = Math.floor(sus.live / CELLS_PER_VIAL);
  const [vials, setVials] = useState(Math.min(2, maxVials));
  const v = viability(sus);
  const saleValue = unitPrice(s, sus.line, sus.markers, v, sus.passage) * (sus.live / 1e6);
  const needs = mediumNeeds(L.medium, FLASKS[type].vol);

  const pickType = (t: FlaskType) => {
    setType(t);
    setMillions(toM(Math.min(sus.live, recommendedSeed(sus.line, t))));
  };

  return (
    <Modal title={`🧫 Suspensão de ${L.name}`}>
      <div className="neubauer">
        <div>
          <small>Contagem na Neubauer</small>
          <b>{fmtCells(sus.live)}</b>
          <small>células vivas</small>
        </div>
        <div>
          <small>Viabilidade (azul de tripan)</small>
          <b>{pct(v)}</b>
          <small>vinda de {sus.from} · P{sus.passage}</small>
        </div>
      </div>
      <p className="hint warn">⏱️ Fora da estufa as células morrem (~3%/h). Distribua logo!</p>

      <h4>Semear em novo frasco</h4>
      <div className="seg small">
        {FLASK_TYPES.map((t) => (
          <button key={t} className={type === t ? 'on' : ''} onClick={() => pickType(t)}>
            {t} <small>({have(s, `flask_${t}`)})</small>
          </button>
        ))}
      </div>
      <div className="row">
        <input
          type="number"
          min={0.01}
          step={0.01}
          value={millions}
          onChange={(e) => setMillions(Math.max(0, +e.target.value))}
          className="num"
        />
        <span>milhões</span>
        <button className="btn small" onClick={() => setMillions(toM(sus.live))}>
          tudo
        </button>
        <button className="btn primary" disabled={freeSlots(s) <= 0} onClick={() => act((st) => seed(st, type, millions))}>
          Semear
        </button>
      </div>
      <p className="muted small">
        Recomendado ≈ {fmtNum(recommendedSeed(sus.line, type) / 1e6)} mi (≈20% de confluência). Usa{' '}
        {Object.entries(needs)
          .map(([k, n]) => `${fmtNum(n)} mL ${k === 'FBS' ? 'SFB' : 'meio'}`)
          .join(' + ')}
        . Vagas livres nas estufas: {freeSlots(s)}.
      </p>

      <h4>Congelar criotubos</h4>
      <div className="row">
        <input
          type="number"
          min={1}
          max={maxVials}
          value={vials}
          onChange={(e) => setVials(Math.max(0, Math.min(maxVials, Math.floor(+e.target.value))))}
          className="num"
        />
        <span>criotubos de 10⁶ células</span>
        <button className="btn" disabled={vials < 1} onClick={() => act((st) => freeze(st, vials))}>
          ❄️ Congelar
        </button>
      </div>
      <p className="muted small">
        Meio de congelamento: {fmtNum(0.9 * vials)} mL SFB + {fmtNum(0.1 * vials)} mL DMSO. Você tem {fmtNum(have(s, 'FBS'))} mL
        SFB, {fmtNum(have(s, 'DMSO'))} mL DMSO e {have(s, 'cryovial')} criotubos.
      </p>

      <div className="row end">
        <button className="btn danger" onClick={() => act(discardSuspension)}>
          Descartar resto
        </button>
        <button className="btn gold" onClick={() => act(sellSuspension)}>
          💰 Vender resto ({fmtMoney(saleValue)})
        </button>
      </div>
    </Modal>
  );
}
