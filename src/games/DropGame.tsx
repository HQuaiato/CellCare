import { useEffect, useRef, useState } from 'react';

/** Chuva de Nutrientes: pegue glicose, glutamina e SFB; desvie de bactérias, fungos e micoplasma. */
const W = 340;
const H = 460;
const GOOD = [
  { e: '🍬', pts: 1, w: 5 },
  { e: '🧪', pts: 1, w: 4 },
  { e: '💧', pts: 3, w: 1.2 },
];
const BAD = [
  { e: '🦠', w: 3 },
  { e: '🍄', w: 2 },
  { e: '🟣', w: 1 },
];

interface Item {
  x: number;
  y: number;
  vy: number;
  e: string;
  pts: number;
  bad: boolean;
}

function pick<T extends { w: number }>(list: T[]) {
  const total = list.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const x of list) if ((r -= x.w) <= 0) return x;
  return list[0];
}

export function DropGame({ onFinish }: { onFinish: (score: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ score: 0, lives: 3 });
  const playerX = useRef(W / 2);

  useEffect(() => {
    const c = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    const g = c.getContext('2d')!;
    let items: Item[] = [];
    let score = 0;
    let lives = 3;
    let last = performance.now();
    let spawn = 0;
    let elapsed = 0;
    let raf = 0;
    let over = false;
    let flash = 0;
    const keys = new Set<string>();

    const onKey = (e: KeyboardEvent) => {
      if (e.type === 'keydown') keys.add(e.key);
      else keys.delete(e.key);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      if (keys.has('ArrowLeft') || keys.has('a')) playerX.current -= 340 * dt;
      if (keys.has('ArrowRight') || keys.has('d')) playerX.current += 340 * dt;
      playerX.current = Math.max(28, Math.min(W - 28, playerX.current));

      spawn -= dt;
      if (spawn <= 0) {
        const bad = Math.random() < Math.min(0.45, 0.22 + elapsed / 160);
        const def = bad ? pick(BAD) : pick(GOOD);
        const speed = 120 + elapsed * 4 + (def.e === '🟣' ? 90 : 0);
        items.push({ x: 20 + Math.random() * (W - 40), y: -20, vy: speed, e: def.e, pts: 'pts' in def ? (def as { pts: number }).pts : 0, bad });
        spawn = Math.max(0.28, 0.75 - elapsed / 90);
      }

      const px = playerX.current;
      const py = H - 46;
      items = items.filter((it) => {
        it.y += it.vy * dt;
        if (Math.abs(it.x - px) < 32 && Math.abs(it.y - py) < 26) {
          if (it.bad) {
            lives -= 1;
            flash = 0.3;
          } else score += it.pts;
          setHud({ score, lives });
          return false;
        }
        return it.y < H + 30;
      });

      // desenho
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#fde7f0');
      bg.addColorStop(1, '#e0405f');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.25;
      g.fillStyle = '#fff';
      for (let i = 0; i < 12; i++) g.fillRect(((i * 53 + elapsed * 20) % W), ((i * 97 + elapsed * 60) % H), 3, 3);
      g.globalAlpha = 1;
      g.font = '28px system-ui, "Segoe UI Emoji", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const it of items) g.fillText(it.e, it.x, it.y);
      // a célula
      g.beginPath();
      g.ellipse(px, py, 34, 26, 0, 0, Math.PI * 2);
      g.fillStyle = flash > 0 ? '#fca5a5' : '#ffd6e8';
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = '#ff5fa2';
      g.stroke();
      g.beginPath();
      g.ellipse(px, py - 8, 12, 9, 0, 0, Math.PI * 2);
      g.fillStyle = '#c9a7ff';
      g.fill();
      g.fillStyle = '#2b2140';
      g.beginPath();
      g.arc(px - 9, py + 5, 3, 0, Math.PI * 2);
      g.arc(px + 9, py + 5, 3, 0, Math.PI * 2);
      g.fill();
      flash = Math.max(0, flash - dt);

      if (lives <= 0 && !over) {
        over = true;
        onFinish(score);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    playerX.current = ((e.clientX - rect.left) / rect.width) * W;
  };

  return (
    <div className="game">
      <div className="game-hud">
        <span>⭐ {hud.score}</span>
        <span>{'❤️'.repeat(Math.max(0, hud.lives))}</span>
      </div>
      <canvas ref={ref} className="game-canvas" style={{ aspectRatio: `${W} / ${H}` }} onPointerMove={move} onPointerDown={move} />
    </div>
  );
}
