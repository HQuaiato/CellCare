import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

/** Arrumar ponteiras: arraste cada ponteira para um buraco da caixa do mesmo tamanho. */
const ROWS = 4;
const COLS = 6;
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
function newTip(boxSize: Size): Tip {
  const size = Math.random() < 0.6 ? boxSize : SIZES[Math.floor(Math.random() * 3)].id;
  return { id: ++nextId, size };
}
const def = (s: Size) => SIZES.find((x) => x.id === s)!;

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
  const [box, setBox] = useState<Size>('p200');
  const [filled, setFilled] = useState<boolean[]>(Array(ROWS * COLS).fill(false));
  const [tray, setTray] = useState<Tip[]>(() => Array.from({ length: 5 }, () => newTip('p200')));
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

  const place = (tipId: number, hole: number) => {
    const tip = tray.find((x) => x.id === tipId);
    if (!tip || filled[hole]) return;
    const rest = tray.filter((x) => x.id !== tipId);
    if (tip.size !== box) {
      add(-2, t('game.tips.wrong'));
      setTray([...rest, newTip(box)]);
      return;
    }
    const next = filled.map((f, i) => (i === hole ? true : f));
    add(1);
    if (next.every(Boolean)) {
      add(5, t('game.tips.full'));
      const nb = SIZES[Math.floor(Math.random() * 3)].id;
      setBox(nb);
      setFilled(Array(ROWS * COLS).fill(false));
      setTray([...rest, newTip(nb)]);
    } else {
      setFilled(next);
      setTray([...rest, newTip(box)]);
    }
    setSelected(null);
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
    const el = document.elementsFromPoint(e.clientX, e.clientY).find((x) => (x as HTMLElement).dataset?.hole);
    if (el) place(drag.id, Number((el as HTMLElement).dataset.hole));
    setDrag(null);
  };

  const d = def(box);
  return (
    <div className="game" onPointerMove={onMove} onPointerUp={onUp}>
      <div className="game-hud">
        <span>⭐ {score}</span>
        <span>⏱️ {left}s</span>
      </div>
      <div className="tip-box" style={{ borderColor: d.box }}>
        <div className="tip-box-label" style={{ background: d.box }}>
          {d.label}
        </div>
        <div className="tip-holes" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {filled.map((f, i) => (
            <button key={i} data-hole={i} className={`hole ${f ? 'full' : ''}`} onClick={() => selected !== null && place(selected, i)}>
              {f && <TipIcon size={box} />}
            </button>
          ))}
        </div>
      </div>
      {flash && <div className="tip-flash">{flash}</div>}
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
