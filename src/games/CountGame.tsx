import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

/** Contagem na Neubauer: conte só as células vivas (claras); as azuis absorveram azul de tripan. */
const ROUNDS = 5;
const S = 300;

function makeRound() {
  const live = 8 + Math.floor(Math.random() * 17);
  const dead = 2 + Math.floor(Math.random() * 7);
  const pts: { x: number; y: number; dead: boolean; r: number }[] = [];
  const tries = (dead: boolean) => {
    for (let k = 0; k < 200; k++) {
      const p = { x: 18 + Math.random() * (S - 36), y: 18 + Math.random() * (S - 36), dead, r: 8 + Math.random() * 3 };
      if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 22)) return pts.push(p);
    }
  };
  for (let i = 0; i < live; i++) tries(false);
  for (let i = 0; i < dead; i++) tries(true);
  return { pts, live: pts.filter((p) => !p.dead).length };
}

export const roundPoints = (guess: number, real: number) => {
  const d = Math.abs(guess - real);
  return d === 0 ? 12 : d === 1 ? 8 : d === 2 ? 4 : 0;
};

export function CountGame({ onFinish }: { onFinish: (score: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(1);
  const [data, setData] = useState(makeRound);
  const [guess, setGuess] = useState('');
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const c = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = S * dpr;
    c.height = S * dpr;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#eef2f7';
    g.fillRect(0, 0, S, S);
    // grade do quadrante grande da Neubauer (4×4) com linhas triplas na borda
    g.strokeStyle = '#94a3b8';
    for (let i = 0; i <= 4; i++) {
      g.lineWidth = i === 0 || i === 4 ? 3 : 1;
      g.beginPath();
      g.moveTo((i * S) / 4, 0);
      g.lineTo((i * S) / 4, S);
      g.moveTo(0, (i * S) / 4);
      g.lineTo(S, (i * S) / 4);
      g.stroke();
    }
    for (const p of data.pts) {
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (p.dead) {
        g.fillStyle = '#1e40af';
        g.fill();
      } else {
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.fill();
        g.lineWidth = 2.5;
        g.strokeStyle = '#64748b';
        g.stroke();
        g.beginPath();
        g.arc(p.x - 2, p.y - 2, p.r * 0.35, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255,255,255,1)';
        g.fill();
      }
    }
  }, [data]);

  const submit = () => {
    if (feedback) {
      if (round >= ROUNDS) return onFinish(total);
      setRound(round + 1);
      setData(makeRound());
      setGuess('');
      setFeedback(null);
      return;
    }
    const pts = roundPoints(parseInt(guess || '0', 10), data.live);
    setTotal(total + pts);
    setFeedback(t('game.count.feedback', { real: data.live, pts }));
  };

  return (
    <div className="game">
      <div className="game-hud">
        <span>
          🔢 {t('game.count.round', { n: round, total: ROUNDS })}
        </span>
        <span>⭐ {total}</span>
      </div>
      <canvas ref={ref} className="game-canvas neubauer-canvas" />
      <form
        className="row center-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {!feedback && <input className="num" type="number" min={0} value={guess} onChange={(e) => setGuess(e.target.value)} autoFocus placeholder="?" />}
        <button className="btn primary">{feedback ? (round >= ROUNDS ? t('game.finish') : t('game.next')) : t('game.count.check')}</button>
      </form>
      {feedback && <p className="hint center">{feedback}</p>}
      <p className="muted small center">{t('game.count.how')}</p>
    </div>
  );
}
