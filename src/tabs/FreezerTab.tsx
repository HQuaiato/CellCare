import { useState } from 'react';
import { Empty, Info, fmtMoney, pct } from '../components/ui';
import { sellVial, thaw } from '../game/actions';
import { CELLS_PER_VIAL, FLASK_TYPES, LINES, MARKERS } from '../game/data';
import { VIAL_PREMIUM, unitPrice } from '../game/econ';
import { act, useGame } from '../game/store';
import type { FlaskType, Vial } from '../game/types';
import { t } from '../i18n';

export function FreezerTab({ onThaw }: { onThaw: () => void }) {
  const s = useGame();
  const [type, setType] = useState<FlaskType>('T25');

  const groups = new Map<string, Vial[]>();
  for (const v of s.vials) {
    const k = `${v.line}|${v.markers.join('+')}|${v.passage}|${v.contam ?? ''}`;
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }

  if (!s.vials.length) {
    return (
      <Empty icon="❄️" title={t('freezer.empty')}>
        <Info k="freezer.emptyText" title={t('freezer.empty')} />
      </Empty>
    );
  }

  return (
    <div className="stack grid-2">
      <section className="card span-2">
        <h3>
          ❄️ {t('freezer.title', { n: s.vials.length })} <Info k="freezer.hint" title={t('tab.freezer')} />
        </h3>
        <div className="row">
          <span className="muted">{t('freezer.thawIn')}</span>
          <div className="seg small">
            {FLASK_TYPES.map((tp) => (
              <button key={tp} className={type === tp ? 'on' : ''} onClick={() => setType(tp)}>
                {tp}
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
                {v.markers.length ? v.markers.map((mk) => MARKERS[mk].name).join(' · ') : t('freezer.noMarker')} · {t('stat.viability').toLowerCase()} {pct(v.viability)}
              </p>
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
                {t('freezer.sell', { p: fmtMoney(price) })}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
