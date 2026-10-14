import { useState } from 'react';
import { CellAvatar, previewFlask } from '../components/CellAvatar';
import { Empty, Info, fmtMoney, pct } from '../components/ui';
import { sellVial, thaw } from '../game/actions';
import { CELLS_PER_VIAL, FLASK_TYPES, LINE_ORDER, LINES, MARKERS } from '../game/data';
import { VIAL_PREMIUM, unitPrice } from '../game/econ';
import { act, useGame } from '../game/store';
import type { FlaskType, LineId, Vial } from '../game/types';
import { t } from '../i18n';

/** Variação de uma linhagem: mesmos marcadores, passagem e imortalização. */
const variantKey = (v: Vial) => `${v.markers.slice().sort().join('+')}|${v.passage}|${v.immortal ? 1 : 0}`;

export function FreezerTab({ onThaw }: { onThaw: () => void }) {
  const s = useGame();
  const [type, setType] = useState<FlaskType>('T25');

  if (!s.vials.length) {
    return (
      <Empty icon="❄️" title={t('freezer.empty')}>
        <Info k="freezer.emptyText" title={t('freezer.empty')} />
      </Empty>
    );
  }

  // linhagem → variações → criotubos
  const byLine = new Map<LineId, Map<string, Vial[]>>();
  for (const v of s.vials) {
    const m = byLine.get(v.line) ?? new Map<string, Vial[]>();
    const k = variantKey(v);
    m.set(k, [...(m.get(k) ?? []), v]);
    byLine.set(v.line, m);
  }
  const lines = LINE_ORDER.filter((l) => byLine.has(l));

  return (
    <div className="stack">
      <section className="card row between wrap">
        <h3>
          ❄️ {t('freezer.title', { n: s.vials.length })} <Info k="freezer.hint" title={t('tab.freezer')} />
        </h3>
        <div className="row">
          <span className="muted small">{t('freezer.thawIn')}</span>
          <div className="seg small">
            {FLASK_TYPES.map((tp) => (
              <button key={tp} className={type === tp ? 'on' : ''} onClick={() => setType(tp)}>
                {tp}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid-2">
        {lines.map((line) => {
          const L = LINES[line];
          const variants = [...byLine.get(line)!.values()].sort((a, b) => b[0].markers.length - a[0].markers.length || a[0].passage - b[0].passage);
          const total = variants.reduce((n, vs) => n + vs.length, 0);
          return (
            <details key={line} className="card freezer-line" open>
              <summary>
                <div className="freezer-thumb">
                  <CellAvatar flask={previewFlask(line)} time={0} badge={false} />
                </div>
                <div className="grow">
                  <h3>
                    {L.badge} {L.name}
                  </h3>
                  <small className="muted">{t('freezer.lineSummary', { n: total, v: variants.length })}</small>
                </div>
              </summary>
              {variants.map((vs) => {
                const v = vs[0];
                const price = unitPrice(s, v.line, v.markers, v.viability, v.passage) * (CELLS_PER_VIAL / 1e6) * VIAL_PREMIUM;
                return (
                  <div key={variantKey(v)} className="variant">
                    <div className="variant-count">×{vs.length}</div>
                    <div className="grow">
                      <div className="badges">
                        <span className="badge-pill">P{v.passage}</span>
                        {v.markers.length ? (
                          v.markers.map((mk) => (
                            <span key={mk} className="badge-pill" style={{ color: MARKERS[mk].color }}>
                              🧬 {MARKERS[mk].name}
                            </span>
                          ))
                        ) : (
                          <span className="badge-pill muted">{t('freezer.wildType')}</span>
                        )}
                        {v.immortal && <span className="badge-pill">♾️ hTERT</span>}
                      </div>
                      <small className="muted">
                        {t('stat.viability')} {pct(v.viability)}
                      </small>
                    </div>
                    <div className="col">
                      <button
                        className="btn small primary"
                        onClick={() => {
                          if (act((st) => thaw(st, v.id, type))) onThaw();
                        }}
                      >
                        {t('freezer.thaw')}
                      </button>
                      <button className="btn small gold" onClick={() => act((st) => sellVial(st, v.id))}>
                        {fmtMoney(price)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </details>
          );
        })}
      </div>
    </div>
  );
}
