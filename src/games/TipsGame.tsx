import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

/** Arrumar ponteiras: separe as ponteiras soltas nas caixas P10, P200 e P1000. */
const ROWS = 3;
const COLS = 4;
const HOLES = ROWS * COLS;
const DURATION = 45;
const SIZES = [
  { id: 'p10', label: 'P10', color: '#e5e7eb', box: '#94a3b8' },
  { id: 'p200', label: 'P200', color: '#fde047', box: '#ca8a04' },
  { id: 'p1000', label: 'P1000', color: '#60a5fa', box: '#2563eb' },
] as const;
type Size = (typeof SIZES)[number]['id'];

interface Tip {
  id: number;
  size: Size;
}

let nextId = 0;
const newTip = (): Tip => ({ id: ++nextId, size: SIZES[Math.floor(Math.random() * SIZES.length)].id });
const def = (s: Size) => SIZES.find((x) => x.id === s)!;
const emptyBoxes = (): Record<Size, boolean[]> => ({ p10: Array(HOLES).fill(false), p200: Array(HOLES).fill(false), p1000: Array(HOLES).fill(false) });

function TipIcon({ size }: { size: Size }) {
  const d = def(size);
  const h = size === 'p10' ? 26 : size === 'p200' ? 32 : 40;
  return (
    <svg width={18} height={h} viewBox={`0 0 18 ${h}`}>
      <path d={`M2,0 L16,0 L11,${h} L7,${h} Z`} fill={d.color} stroke="#475569" strokeWidth={1.2} />
      <rect x={2} y={0} width={14} height={5} fill={d.color} stroke="#475569" strokeWidth={1.2} />
    </svg>
  );
}

export function TipsGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [boxes, setBoxes] = useState(emptyBoxes);
  const [tray, setTray] = useState<Tip[]>(() => Array.from({ length: 5 }, newTip));
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [flash, setFlash] = useState<string | null>(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    let done = false;
    const id = window.setInterval(() => {
      const el = (performance.now() - start) / 1000;
      setLeft(Math.max(0, Math.ceil(DURATION - el)));
      if (el >= DURATION && !done) {
        done = true;
        window.clearInterval(id);
        onFinish(scoreRef.current);
      }
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (n: number, msg?: string) => {
    scoreRef.current = Math.max(0, scoreRef.current + n);
    setScore(scoreRef.current);
    if (msg) {
      setFlash(msg);
      window.setTimeout(() => setFlash(null), 700);
    }
  };

  const place = (tipId: number, box: Size, hole: number) => {
    const tip = tray.find((x) => x.id === tipId);
    if (!tip || boxes[box][hole]) return;
    const rest = [...tray.filter((x) => x.id !== tipId), newTip()];
    setTray(rest);
    setSelected(null);
    if (tip.size !== box) {
      add(-2, t('game.tips.wrong'));
      return;
    }
    const next = boxes[box].map((f, i) => (i === hole ? true : f));
    add(1);
    if (next.every(Boolean)) {
      add(5, t('game.tips.full'));
      setBoxes({ ...boxes, [box]: Array(HOLES).fill(false) });
    } else setBoxes({ ...boxes, [box]: next });
  };

  const onDown = (e: React.PointerEvent, id: number) => {
    try {
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* alguns navegadores não deixam: o arraste segue pelo contêiner */
    }
    setDrag({ id, x: e.clientX, y: e.clientY });
    setSelected(id);
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const el = document.elementsFromPoint(e.clientX, e.clientY).find((x) => (x as HTMLElement).dataset?.hole) as HTMLElement | undefined;
    if (el) {
      const [box, hole] = el.dataset.hole!.split(':');
      place(drag.id, box as Size, Number(hole));
    }
    setDrag(null);
  };

  return (
    <div className="game" onPointerMove={onMove} onPointerUp={onUp}>
      <div className="game-hud">
        <span>⭐ {score}</span>
        <span>⏱️ {left}s</span>
      </div>
      <div className="tip-boxes">
        {SIZES.map((d) => (
          <div key={d.id} className="tip-box" style={{ borderColor: d.box }}>
            <div className="tip-box-label" style={{ background: d.box }}>
              {d.label}
            </div>
            <div className="tip-holes" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {boxes[d.id].map((f, i) => (
                <button key={i} data-hole={`${d.id}:${i}`} className={`hole ${f ? 'full' : ''}`} onClick={() => selected !== null && place(selected, d.id, i)}>
                  {f && <TipIcon size={d.id} />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="tip-flash">{flash ?? ' '}</div>
      <div className="tip-tray">
        {tray.map((tip) => (
          <div
            key={tip.id}
            className={`loose-tip ${selected === tip.id ? 'sel' : ''}`}
            onPointerDown={(e) => onDown(e, tip.id)}
            style={drag?.id === tip.id ? { position: 'fixed', left: drag.x - 9, top: drag.y - 20, pointerEvents: 'none', zIndex: 60 } : undefined}
          >
            <TipIcon size={tip.size} />
          </div>
        ))}
      </div>
    </div>
  );
}
