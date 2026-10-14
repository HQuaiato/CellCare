import { Modal, fmtMoney } from '../components/ui';
import { buy, have, usePass } from '../game/actions';
import { PASSES, levelOf } from '../game/data';
import { flaskName } from '../game/sim';
import { act, useGame } from '../game/store';
import type { Flask } from '../game/types';
import { t } from '../i18n';

export function PassesModal({ flask, onClose }: { flask?: Flask; onClose: () => void }) {
  const s = useGame();
  const lv = levelOf(s.xp);
  return (
    <Modal title={`⚡ ${t('passes.title')}`} onClose={onClose}>
      <p className="muted small">{t('passes.intro', { flask: flask ? flaskName(flask) : '—' })}</p>
      <div className="pass-list">
        {PASSES.map((p) => {
          const n = have(s, `pass_${p.id}`);
          const locked = lv < p.level;
          return (
            <div key={p.id} className={`pass ${locked ? 'locked' : ''}`}>
              <span className="pass-icon">{p.icon}</span>
              <div className="grow">
                <b>{t(`pass.${p.id}`)}</b>
                <small>{t(`pass.${p.id}.desc`)}</small>
                {p.flask && <small className="muted">🧫 {t('passes.flask')}</small>}
              </div>
              <div className="col">
                {locked ? (
                  <span className="small muted">{t('err.levelLocked', { lv: p.level })}</span>
                ) : (
                  <>
                    <button className="btn small primary" disabled={n < 1 || (p.flask && !flask)} onClick={() => act((st) => usePass(st, p.id, flask?.id))}>
                      {t('passes.use')} ({n})
                    </button>
                    <button className="btn small gold" disabled={s.money < p.price} onClick={() => act((st) => buy(st, `pass_${p.id}`))}>
                      {fmtMoney(p.price)}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
