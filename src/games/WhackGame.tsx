import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

/** Caça-Contaminantes: uma placa de 12 poços; toque nos contaminantes e poupe as células saudáveis. */
const WELLS = 12;
const DURATION = 30;
type Kind = 'bacteria' | 'fungus' | 'myco' | 'cell';
const KINDS: { k: Kind; e: string; pts: number; w: number; life: number }[] = [
  { k: 'bacteria', e: '🦠', pts: 1, w: 5, life: 1.2 },
  { k: 'fungus', e: '🍄', pts: 1, w: 2.5, life: 1.4 },
  { k: 'myco', e: '🟣', pts: 3, w: 1, life: 0.75 },
  { k: 'cell', e: '😊', pts: -2, w: 2, life: 1.4 },
];

interface Slot {
  kind: (typeof KINDS)[number];
  until: number;
  id: number;
}

export function WhackGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [slots, setSlots] = useState<(Slot | null)[]>(Array(WELLS).fill(null));
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [pop, setPop] = useState<{ i: number; txt: string } | null>(null);
  const scoreRef = useRef(0);
  const slotsRef = useRef<(Slot | null)[]>(Array(WELLS).fill(null));
  const start = useRef(performance.now());

  useEffect(() => {
    let next = 0;
    let id = 0;
    let done = false;
    const timer = window.setInterval(() => {
      const el = (performance.now() - start.current) / 1000;
      setLeft(Math.max(0, Math.ceil(DURATION - el)));
      if (el >= DURATION) {
        if (!done) {
          done = true;
          window.clearInterval(timer);
          onFinish(scoreRef.current);
        }
        return;
      }
      const cur = slotsRef.current.map((x) => (x && x.until > el ? x : null));
      if (el >= next) {
        const free = cur.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
        if (free.length) {
          const i = free[Math.floor(Math.random() * free.length)];
          const total = KINDS.reduce((a, b) => a + b.w, 0);
          let r = Math.random() * total;
          const kind = KINDS.find((k) => (r -= k.w) <= 0) ?? KINDS[0];
          const speed = 1 - Math.min(0.4, el / 60);
          cur[i] = { kind, until: el + kind.life * speed, id: ++id };
        }
        next = el + Math.max(0.3, 0.75 - el / 50);
      }
      slotsRef.current = cur;
      setSlots(cur);
    }, 60);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (i: number) => {
    const sl = slots[i];
    if (!sl) return;
    scoreRef.current = Math.max(0, scoreRef.current + sl.kind.pts);
    setScore(scoreRef.current);
    setPop({ i, txt: sl.kind.pts > 0 ? `+${sl.kind.pts}` : `${sl.kind.pts}` });
    slotsRef.current = slotsRef.current.map((x, j) => (j === i ? null : x));
    setSlots(slotsRef.current);
  };

  return (
    <div className="game">
      <div className="game-hud">
        <span>⭐ {score}</span>
        <span>⏱️ {left}s</span>
      </div>
      <div className="plate">
        {slots.map((sl, i) => (
          <button key={i} className={`well ${sl ? `has-${sl.kind.k}` : ''}`} onPointerDown={() => tap(i)}>
            {sl && <span key={sl.id}>{sl.kind.e}</span>}
            {pop?.i === i && (
              <em key={`${score}-${i}`} className={pop.txt.startsWith('-') ? 'neg' : ''}>
                {pop.txt}
              </em>
            )}
          </button>
        ))}
      </div>
      <p className="muted small center">{t('game.whack.how')}</p>
    </div>
  );
}
