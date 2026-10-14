import { useEffect } from 'react';
import { Info, Modal } from '../components/ui';
import { queueLesson } from '../game/lessons';
import { have, startTransduction } from '../game/actions';
import { MARKER_ORDER, MARKERS, levelOf } from '../game/data';
import { act, useGame } from '../game/store';
import type { Flask } from '../game/types';
import { t } from '../i18n';

export function TransductionModal({ flask, onClose }: { flask: Flask; onClose: () => void }) {
  const s = useGame();
  const lv = levelOf(s.xp);
  useEffect(() => {
    act((st) => queueLesson(st, 'transduction'), true);
  }, []);
  const options = MARKER_ORDER.filter((mk) => MARKERS[mk].level <= lv);

  return (
    <Modal title={`🧬 ${t('trans.title')}`} onClose={onClose}>
      <p className="small">
        {t('trans.pick')} <Info k="trans.intro" title={t('trans.title')} />
      </p>
      {options.length === 0 && <p className="hint">🔒 {t('trans.locked')}</p>}
      <div className="pick">
        {options.map((mk) => {
          const owned = have(s, `virus_${mk}`);
          const already = flask.markers.includes(mk);
          return (
            <button
              key={mk}
              disabled={owned < 1 || already || !!flask.transduction}
              onClick={() => {
                if (act((st) => startTransduction(st, flask.id, mk))) onClose();
              }}
            >
              <b style={{ color: MARKERS[mk].color }}>{MARKERS[mk].name}</b>
              <small>
                {already ? `✔ ${t('trans.already')}` : t('trans.owned', { n: owned, b: Math.round(MARKERS[mk].bonus * 100) })}
              </small>
            </button>
          );
        })}
      </div>
      {flask.transduction && <p className="hint">{t('trans.busy')}</p>}
      <p className="muted small">{t('trans.buyHint')}</p>
    </Modal>
  );
}
