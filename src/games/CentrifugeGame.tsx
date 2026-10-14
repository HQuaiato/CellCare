import { useState } from 'react';
import { t } from '../i18n';

/**
 * Centrífuga equilibrada: coloque os tubos no rotor de forma que o centro de massa fique
 * no meio (tubos opostos com o mesmo volume). Use tubos de água para equilibrar.
 */
const SLOTS = 8;
const ROUNDS = 5;
const VOLS = [5, 10, 15];

interface Tube {
  id: number;
  vol: number;
  water?: boolean;
}

let nid = 0;
function makeRound(round: number): Tube[] {
  const n = Math.min(SLOTS - 2, 2 + round);
  return Array.from({ length: n }, () => ({ id: ++nid, vol: VOLS[Math.floor(Math.random() * VOLS.length)] }));
}

/** Desequilíbrio: soma vetorial dos volumes (0 = perfeito). */
export function imbalance(slots: (Tube | null)[]) {
  let x = 0;
  let y = 0;
  slots.forEach((tb, i) => {
    if (!tb) return;
    const a = (i / SLOTS) * Math.PI * 2;
    x += tb.vol * Math.cos(a);
    y += tb.vol * Math.sin(a);
  });
  return Math.hypot(x, y);
}

export function CentrifugeGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(1);
  const [tray, setTray] = useState<Tube[]>(() => makeRound(1));
  const [slots, setSlots] = useState<(Tube | null)[]>(Array(SLOTS).fill(null));
  const [sel, setSel] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'idle' | 'spin' | 'shake'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const tapSlot = (i: number) => {
    if (state !== 'idle' || feedback) return;
    const cur = slots[i];
    if (cur) {
      setSlots(slots.map((x, j) => (j === i ? null : x)));
      setTray([...tray, cur]);
      return;
    }
    const tube = tray.find((x) => x.id === sel) ?? tray[0];
    if (!tube) return;
    setSlots(slots.map((x, j) => (j === i ? tube : x)));
    setTray(tray.filter((x) => x.id !== tube.id));
    setSel(null);
  };

  const addWater = (vol: number) => setTray([...tray, { id: ++nid, vol, water: true }]);

  const spin = () => {
    if (tray.some((x) => !x.water)) {
      setFeedback(t('game.centrifuge.placeAll'));
      window.setTimeout(() => setFeedback(null), 1200);
      return;
    }
    const ok = imbalance(slots) < 0.5;
    const water = slots.filter((x) => x?.water).length;
    const pts = ok ? Math.max(6, 12 - 2 * Math.max(0, water - 1)) : 0;
    setState(ok ? 'spin' : 'shake');
    setTotal(total + pts);
    setFeedback(ok ? t('game.centrifuge.ok', { pts }) : t('game.centrifuge.bad'));
  };

  const next = () => {
    if (round >= ROUNDS) return onFinish(total);
    setRound(round + 1);
    setTray(makeRound(round + 1));
    setSlots(Array(SLOTS).fill(null));
    setState('idle');
    setFeedback(null);
  };

  return (
    <div className="game">
      <div className="game-hud">
        <span>🌀 {t('game.count.round', { n: round, total: ROUNDS })}</span>
        <span>⭐ {total}</span>
      </div>
      <svg viewBox="0 0 240 240" className={`rotor ${state}`}>
        <circle cx={120} cy={120} r={110} fill="#e2e8f0" stroke="#64748b" strokeWidth={4} />
        <circle cx={120} cy={120} r={18} fill="#94a3b8" />
        {slots.map((tb, i) => {
          const a = (i / SLOTS) * Math.PI * 2 - Math.PI / 2;
          const x = 120 + 76 * Math.cos(a);
          const y = 120 + 76 * Math.sin(a);
          return (
            <g key={i} onClick={() => tapSlot(i)} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r={20} fill={tb ? (tb.water ? '#bae6fd' : '#fda4af') : '#cbd5e1'} stroke="#475569" strokeWidth={2} />
              {tb && (
                <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#1e293b">
                  {tb.vol}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {feedback && <p className="hint center">{feedback}</p>}
      {state === 'idle' ? (
        <>
          <div className="tube-tray">
            {tray.map((tb) => (
              <button key={tb.id} className={`tube ${tb.water ? 'water' : ''} ${sel === tb.id ? 'sel' : ''}`} onClick={() => setSel(tb.id)}>
                {tb.water ? '💧' : '🧪'} {tb.vol} mL
              </button>
            ))}
          </div>
          <div className="row center-row wrap">
            <span className="small muted">{t('game.centrifuge.water')}</span>
            {VOLS.map((v) => (
              <button key={v} className="btn small" onClick={() => addWater(v)}>
                💧 {v}
              </button>
            ))}
            <button className="btn primary" onClick={spin}>
              ▶ {t('game.centrifuge.spin')}
            </button>
          </div>
        </>
      ) : (
        <button className="btn primary" onClick={next}>
          {round >= ROUNDS ? t('game.finish') : t('game.next')}
        </button>
      )}
    </div>
  );
}
