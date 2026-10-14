import { FlaskSvg } from '../components/FlaskSvg';
import { fmtMoney, fmtNum, pct } from '../components/ui';
import { buy, moveFlask, setCO2, shopPrice } from '../game/actions';
import { MEDIA } from '../game/data';
import { act, useGame } from '../game/store';
import { confluence, eqPH, flaskName } from '../game/sim';
import type { MediumId } from '../game/types';

export function IncubatorsTab({ openFlask }: { openFlask: (id: string) => void }) {
  const s = useGame();
  const tank = s.co2Tank;

  return (
    <div className="stack">
      <section className="card">
        <div className="row between">
          <h3>🧯 Cilindro de CO₂</h3>
          <button className="btn small" onClick={() => act((st) => buy(st, 'co2'))}>
            Recarregar ({fmtMoney(shopPrice(s, 'co2'))})
          </button>
        </div>
        <div className="bar-track tall">
          <div className={`bar-fill tone-${tank < 10 ? 'bad' : tank < 25 ? 'warn' : 'good'}`} style={{ width: `${tank}%` }} />
        </div>
        <p className="muted small">
          {fmtNum(tank, 0)}% · consumo ≈ {fmtNum(0.35 * s.incubators.length * 24, 0)}%/dia com {s.incubators.length} estufa(s). Sem CO₂ o
          bicarbonato do meio não fica em equilíbrio e o pH dispara.
        </p>
      </section>

      {s.incubators.map((inc) => {
        const flasks = s.flasks.filter((f) => f.incubatorId === inc.id);
        const media = [...new Set(flasks.map((f) => f.medium))] as MediumId[];
        return (
          <section className="card" key={inc.id}>
            <div className="row between">
              <h3>🌡️ {inc.name}</h3>
              <span className="muted">
                37 °C · {flasks.length}/{inc.capacity} frascos
              </span>
            </div>
            <label className="co2">
              <span>
                CO₂ <b>{fmtNum(inc.co2Set)}%</b>
              </span>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={inc.co2Set}
                onChange={(e) => act((st) => setCO2(st, inc.id, +e.target.value), true)}
              />
            </label>
            {media.length > 0 && (
              <p className="muted small">
                pH do meio fresco nesse CO₂:{' '}
                {media.map((m) => `${MEDIA[m].name} ${fmtNum(eqPH(m, 0, tank > 0 ? inc.co2Set : 0.04), 2)}`).join(' · ')}. Ideal: 7,2–7,6.
              </p>
            )}
            <div className="shelf">
              {flasks.map((f) => (
                <div key={f.id} className="shelf-item">
                  <button className="shelf-flask" onClick={() => openFlask(f.id)}>
                    <FlaskSvg flask={f} size={84} />
                    <span>{flaskName(f)}</span>
                    <small>{pct(confluence(f))}</small>
                  </button>
                  {s.incubators.length > 1 && (
                    <select
                      value={inc.id}
                      onChange={(e) => act((st) => moveFlask(st, f.id, e.target.value), true)}
                      aria-label="Mover para estufa"
                    >
                      {s.incubators.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {Array.from({ length: inc.capacity - flasks.length }, (_, i) => (
                <div key={i} className="shelf-empty">vaga</div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
