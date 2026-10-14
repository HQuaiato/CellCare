import { Modal } from '../components/ui';
import { have, startTransduction } from '../game/actions';
import { MARKER_ORDER, MARKERS, levelOf } from '../game/data';
import { act, useGame } from '../game/store';
import type { Flask } from '../game/types';

export function TransductionModal({ flask, onClose }: { flask: Flask; onClose: () => void }) {
  const s = useGame();
  const lv = levelOf(s.xp);
  const options = MARKER_ORDER.filter((m) => MARKERS[m].level <= lv);

  return (
    <Modal title="🦠 Transdução lentiviral" onClose={onClose}>
      <p className="muted">
        Infecte as células com o lentivírus e selecione com puromicina por 3 dias. Cerca de 40% morrem na seleção, mas
        todas as células filhas (frascos e criotubos) herdam o marcador e valem mais.
      </p>
      {options.length === 0 && <p className="hint">🔒 As transduções liberam a partir do nível 2.</p>}
      <div className="pick">
        {options.map((m) => {
          const owned = have(s, `virus_${m}`);
          const already = flask.markers.includes(m);
          return (
            <button
              key={m}
              disabled={owned < 1 || already || !!flask.transduction}
              onClick={() => {
                if (act((st) => startTransduction(st, flask.id, m))) onClose();
              }}
            >
              <b style={{ color: MARKERS[m].color }}>{MARKERS[m].name}</b>
              <small>
                {MARKERS[m].desc}
                <br />
                {already ? '✔ já expressa' : `${owned} alíquota(s) · +${Math.round(MARKERS[m].bonus * 100)}% valor`}
              </small>
            </button>
          );
        })}
      </div>
      {flask.transduction && <p className="hint">Este frasco já está em seleção.</p>}
      <p className="hint">Compre lentivírus na Loja → Vírus.</p>
    </Modal>
  );
}
