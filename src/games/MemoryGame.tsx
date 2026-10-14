import { useEffect, useState } from 'react';
import { t } from '../i18n';

/** Memória do Lab: encontre os pares de equipamentos e reagentes. */
const ICONS = ['🧫', '🔬', '🧪', '🧬', '❄️', '🦠', '🧯', '🌡️'];

export function memoryScore(moves: number) {
  return Math.max(10, 80 - (moves - ICONS.length) * 4);
}

export function MemoryGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [cards] = useState(() => [...ICONS, ...ICONS].map((e, i) => ({ e, i })).sort(() => Math.random() - 0.5));
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const match = cards[a].e === cards[b].e;
    const id = window.setTimeout(
      () => {
        if (match) setFound((f) => new Set(f).add(cards[a].e));
        setOpen([]);
      },
      match ? 250 : 700,
    );
    return () => window.clearTimeout(id);
  }, [open, cards]);

  useEffect(() => {
    if (found.size === ICONS.length) {
      const id = window.setTimeout(() => onFinish(memoryScore(moves)), 400);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  const flip = (idx: number) => {
    if (open.length >= 2 || open.includes(idx) || found.has(cards[idx].e)) return;
    const next = [...open, idx];
    setOpen(next);
    if (next.length === 2) setMoves((m) => m + 1);
  };

  return (
    <div className="game">
      <div className="game-hud">
        <span>🔁 {t('game.memory.moves', { n: moves })}</span>
        <span>
          ✅ {found.size}/{ICONS.length}
        </span>
      </div>
      <div className="memory">
        {cards.map((c, idx) => {
          const up = open.includes(idx) || found.has(c.e);
          return (
            <button key={c.i} className={`mem-card ${up ? 'up' : ''} ${found.has(c.e) ? 'found' : ''}`} onClick={() => flip(idx)}>
              <span>{up ? c.e : '?'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
