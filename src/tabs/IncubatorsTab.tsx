import { FlaskSvg } from '../components/FlaskSvg';
import { Info, fmtMoney, fmtNum, pct } from '../components/ui';
import { buy, disinfect, have, moveFlask, setCO2, setSetting, shopPrice } from '../game/actions';
import { CONTAM, DISINFECT_COST, levelOf } from '../game/data';
import { confluence, eqPH, flaskName } from '../game/sim';
import { act, useGame } from '../game/store';
import type { MediumId } from '../game/types';
import { t } from '../i18n';

export function IncubatorsTab({ openFlask }: { openFlask: (id: string) => void }) {
  const s = useGame();
  const tank = s.co2Tank;
  const lv = levelOf(s.xp);

  return (
    <div className="stack grid-2">
      <section className="card">
        <div className="row between">
          <h3>
            🧯 {t('inc.tank')} <Info text={`${t('help.co2')}\n${t('inc.tankInfo', { pct: Math.round(tank), use: Math.round(0.35 * s.incubators.length * 24), n: s.incubators.length })}`} title={t('inc.tank')} />
          </h3>
          <button className="btn small" onClick={() => act((st) => buy(st, 'co2'))}>
            {t('inc.refill', { p: fmtMoney(shopPrice(s, 'co2')) })}
          </button>
        </div>
        <div className="bar-track tall">
          <div className={`bar-fill tone-${tank < 10 ? 'bad' : tank < 25 ? 'warn' : 'good'}`} style={{ width: `${tank}%` }} />
        </div>
      </section>

      <section className="card">
        <h3>
          🛡️ {t('inc.protection')} <Info text={`${t('help.protection')}\n• Pen/Strep: ${t('inc.penstrepInfo', { n: fmtNum(have(s, 'penstrep')) })}\n• ${t('inv.ampho')}: ${t('inc.amphoInfo', { n: fmtNum(have(s, 'ampho')) })}`} title={t('inc.protection')} />
        </h3>
        <label className="toggle">
          <input type="checkbox" checked={s.settings.penstrep} onChange={(e) => act((st) => setSetting(st, 'penstrep', e.target.checked), true)} />
          <span>
            <b>Pen/Strep</b> <small className="muted">{fmtNum(have(s, 'penstrep'))} mL</small>
          </span>
        </label>
        <label className={`toggle ${lv < CONTAM.fungus.level ? 'locked' : ''}`}>
          <input
            type="checkbox"
            disabled={lv < CONTAM.fungus.level}
            checked={s.settings.ampho}
            onChange={(e) => act((st) => setSetting(st, 'ampho', e.target.checked), true)}
          />
          <span>
            <b>{t('inv.ampho')}</b>{' '}
            <small className="muted">{lv < CONTAM.fungus.level ? `🔒 ${t('err.levelLocked', { lv: CONTAM.fungus.level })}` : `${fmtNum(have(s, 'ampho'))} mL`}</small>
          </span>
        </label>
      </section>

      {s.incubators.map((inc) => {
        const flasks = s.flasks.filter((f) => f.incubatorId === inc.id);
        const media = [...new Set(flasks.map((f) => f.medium))] as MediumId[];
        return (
          <section className="card" key={inc.id}>
            <div className="row between">
              <h3>🌡️ {t('ui.incubator', { name: inc.name })}</h3>
              <span className="muted small">{t('inc.slots', { n: flasks.length, cap: inc.capacity })}</span>
            </div>
            <label className="co2">
              <span>
                CO₂ <b>{fmtNum(inc.co2Set)}%</b>
              </span>
              <input type="range" min={0} max={10} step={0.5} value={inc.co2Set} onChange={(e) => act((st) => setCO2(st, inc.id, +e.target.value), true)} />
            </label>
            {media.length > 0 && (
              <p className="muted small">
                {t('inc.freshPh')} {media.map((md) => `${t(`medium.${md}.short`)} ${fmtNum(eqPH(md, 0, tank > 0 ? inc.co2Set : 0.04), 2)}`).join(' · ')} <Info text={`${t('inc.freshPhInfo')} ${t('inc.ideal')}`} />
              </p>
            )}
            {lv >= CONTAM.fungus.level && (
              <div className="row between">
                <span className={`small ${inc.spores > 0.2 ? 'text-bad' : 'muted'}`}>
                  🍄 {t('inc.spores', { pct: pct(inc.spores) })} <Info k="help.spores" />
                </span>
                <button className="btn small" onClick={() => act((st) => disinfect(st, inc.id))}>
                  🧽 {t('inc.disinfect', { p: fmtMoney(DISINFECT_COST) })}
                </button>
              </div>
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
                    <select value={inc.id} onChange={(e) => act((st) => moveFlask(st, f.id, e.target.value), true)} aria-label={t('inc.move')}>
                      {s.incubators.map((i) => (
                        <option key={i.id} value={i.id}>
                          {t('ui.incubator', { name: i.name })}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {Array.from({ length: inc.capacity - flasks.length }, (_, i) => (
                <div key={i} className="shelf-empty">
                  {t('inc.empty')}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
