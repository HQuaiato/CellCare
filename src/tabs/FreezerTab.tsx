import { useState } from 'react';
import { Empty, fmtMoney, pct } from '../components/ui';
import { sellVial, thaw } from '../game/actions';
import { CELLS_PER_VIAL, FLASK_TYPES, LINES, MARKERS } from '../game/data';
import { VIAL_PREMIUM, unitPrice } from '../game/econ';
import { act, useGame } from '../game/store';
import type { FlaskType, Vial } from '../game/types';

export function FreezerTab({ onThaw }: { onThaw: () => void }) {
  const s = useGame();
  const [type, setType] = useState<FlaskType>('T25');

  const groups = new Map<string, Vial[]>();
  for (const v of s.vials) {
    const k = `${v.line}|${v.markers.join('+')}|${v.passage}`;
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }

  if (!s.vials.length) {
    return (
      <Empty icon="❄️" title="Nitrogênio líquido vazio">
        <p>Tripsinize um frasco e congele criotubos (precisa de SFB, DMSO e criotubos). Criotubos valem mais na venda.</p>
      </Empty>
    );
  }

  return (
    <div className="stack">
      <section className="card">
        <h3>❄️ Tanque de N₂ líquido · {s.vials.length} criotubos</h3>
        <div className="row">
          <span className="muted">Descongelar em:</span>
          <div className="seg small">
            {FLASK_TYPES.map((t) => (
              <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>
      {[...groups.values()].map((vs) => {
        const v = vs[0];
        const price = unitPrice(s, v.line, v.markers, v.viability, v.passage) * (CELLS_PER_VIAL / 1e6) * VIAL_PREMIUM;
        return (
          <section className="card vial" key={v.id}>
            <div className="vial-icon" style={{ background: `hsl(${LINES[v.line].hue} 70% 85%)` }}>
              🧪<b>×{vs.length}</b>
            </div>
            <div className="grow">
              <h3>
                {LINES[v.line].name} <small>P{v.passage}</small>
              </h3>
              <p className="muted small">
                {v.markers.length ? v.markers.map((m) => MARKERS[m].name).join(' · ') : 'sem marcador'} · viabilidade {pct(v.viability)}
              </p>
            </div>
            <div className="col">
              <button
                className="btn small primary"
                onClick={() => {
                  if (act((st) => thaw(st, v.id, type))) onThaw();
                }}
              >
                Descongelar
              </button>
              <button className="btn small gold" onClick={() => act((st) => sellVial(st, v.id))}>
                Vender {fmtMoney(price)}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
