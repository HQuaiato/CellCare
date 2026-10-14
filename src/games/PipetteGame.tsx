import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

/** Pipetagem certeira: segure para aspirar e solte no volume pedido. */
const ROUNDS = 6;
const PIPETTES = [
  { id: 'P10', min: 1, max: 10, speed: 3.5, unit: 0.1, color: '#e5e7eb' },
  { id: 'P200', min: 20, max: 200, speed: 70, unit: 1, color: '#fde047' },
  { id: 'P1000', min: 100, max: 1000, speed: 330, unit: 5, color: '#60a5fa' },
];

function newRound() {
  const p = PIPETTES[Math.floor(Math.random() * PIPETTES.length)];
  const raw = p.min + Math.random() * (p.max - p.min) * 0.85;
  const target = Math.round(raw / p.unit) * p.unit;
  return { p, target: +target.toFixed(1) };
}

export const pipettePoints = (vol: number, target: number) => {
  const err = Math.abs(vol - target) / target;
  return err <= 0.02 ? 10 : err <= 0.05 ? 7 : err <= 0.1 ? 4 : 0;
};

export function PipetteGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(1);
  const [{ p, target }, setR] = useState(newRound);
  const [vol, setVol] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const holding = useRef(false);
  const volRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let held = 0;
    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (holding.current) {
        held += dt;
        // começa devagar e acelera, como o êmbolo da pipeta
        volRef.current = Math.min(p.max, volRef.current + p.speed * dt * (0.3 + Math.min(1.7, held)));
        setVol(volRef.current);
      } else held = 0;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [p]);

  const dispense = () => {
    if (feedback) {
      if (round >= ROUNDS) return onFinish(total);
      setRound(round + 1);
      setR(newRound());
      volRef.current = 0;
      setVol(0);
      setFeedback(null);
      return;
    }
    const pts = pipettePoints(volRef.current, target);
    setTotal(total + pts);
    setFeedback(t('game.pipette.feedback', { v: volRef.current.toFixed(p.unit < 1 ? 1 : 0), target, pts }));
  };

  const reset = () => {
    volRef.current = 0;
    setVol(0);
  };

  const fill = Math.min(1, vol / p.max);
  return (
    <div className="game">
      <div className="game-hud">
        <span>💉 {t('game.count.round', { n: round, total: ROUNDS })}</span>
        <span>⭐ {total}</span>
      </div>
      <div className="pipette-card">
        <div className="pipette-target">
          {p.id} · {t('game.pipette.target')} <b>{target} µL</b>
        </div>
        <div className="pipette-tube">
          <div className="pipette-liquid" style={{ height: `${fill * 100}%`, background: p.color }} />
          <div className="pipette-mark" style={{ bottom: `${(target / p.max) * 100}%` }} />
        </div>
        <div className="pipette-read">{vol.toFixed(p.unit < 1 ? 1 : 0)} µL</div>
      </div>
      {!feedback ? (
        <div className="row center-row">
          <button
            className="btn primary pipette-hold"
            onPointerDown={() => (holding.current = true)}
            onPointerUp={() => (holding.current = false)}
            onPointerLeave={() => (holding.current = false)}
          >
            ⬆️ {t('game.pipette.hold')}
          </button>
          <button className="btn" onClick={reset}>
            ↺
          </button>
          <button className="btn gold" onClick={dispense}>
            ⬇️ {t('game.pipette.dispense')}
          </button>
        </div>
      ) : (
        <>
          <p className="hint center">{feedback}</p>
          <button className="btn primary" onClick={dispense}>
            {round >= ROUNDS ? t('game.finish') : t('game.next')}
          </button>
        </>
      )}
    </div>
  );
}
