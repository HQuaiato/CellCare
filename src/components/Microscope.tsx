import { useEffect, useRef } from 'react';
import { LINES } from '../game/data';
import { confluence } from '../game/sim';
import type { Flask } from '../game/types';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE = 280;

export function Microscope({ flask, fluo }: { flask: Flask; fluo: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const L = LINES[flask.line];
  const conf = Math.min(1.05, confluence(flask));
  const n = flask.live > 5e3 ? Math.max(1, Math.round(conf * 150)) : 0;
  const nDead = Math.min(70, Math.round((n + 5) * (flask.dead / Math.max(1, flask.live)) * 0.6));
  const key = `${n}|${nDead}|${fluo}|${flask.markers.join()}|${flask.contaminated}`;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = SIZE * dpr;
    c.height = SIZE * dpr;
    const g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    const R = SIZE / 2;
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.clip();

    if (fluo) {
      g.fillStyle = '#05050a';
    } else {
      const bg = g.createRadialGradient(R, R, 10, R, R, R);
      bg.addColorStop(0, '#e9e4d8');
      bg.addColorStop(1, '#b7ae9b');
      g.fillStyle = bg;
    }
    g.fillRect(0, 0, SIZE, SIZE);

    const r = rng(flask.seed);
    const cell = L.suspension ? 7 : 15 * Math.sqrt(1 / L.size);
    for (let i = 0; i < n; i++) {
      const ang = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * (R - 8);
      const x = R + rad * Math.cos(ang);
      const y = R + rad * Math.sin(ang);
      const rot = r() * Math.PI;
      const len = L.suspension ? cell : cell * (1 + r() * 0.9);
      const wid = L.suspension ? cell : cell * 0.5;
      const phase = r();
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      if (!fluo) {
        g.beginPath();
        g.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255,255,255,0.28)';
        g.fill();
        g.lineWidth = 1.2;
        g.strokeStyle = 'rgba(70,58,45,0.55)';
        g.stroke();
        g.beginPath();
        g.ellipse(0, 0, wid * 0.55, wid * 0.45, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgba(80,66,52,0.35)';
        g.fill();
      } else {
        const has = (m: string) => flask.markers.includes(m as never);
        if (has('LUC')) {
          g.beginPath();
          g.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
          g.fillStyle = 'rgba(253,224,71,0.18)';
          g.fill();
        }
        if (has('LC3')) {
          g.fillStyle = '#4ade80';
          for (let k = 0; k < 4; k++) {
            g.beginPath();
            g.arc((r() - 0.5) * len * 1.6, (r() - 0.5) * wid * 1.6, 1.3, 0, Math.PI * 2);
            g.fill();
          }
        }
        let nuc: string | null = null;
        if (has('H2B')) nuc = '#4ade80';
        if (has('FUCCI')) nuc = phase < 0.55 ? '#f87171' : phase < 0.65 ? '#facc15' : '#4ade80';
        if (nuc || has('53BP1')) {
          g.beginPath();
          g.ellipse(0, 0, wid * 0.6, wid * 0.5, 0, 0, Math.PI * 2);
          g.fillStyle = nuc ?? 'rgba(244,63,94,0.18)';
          g.shadowColor = nuc ?? '#f43f5e';
          g.shadowBlur = 6;
          g.fill();
          g.shadowBlur = 0;
        }
        if (has('53BP1')) {
          g.fillStyle = '#fb7185';
          for (let k = 0; k < 2; k++) {
            g.beginPath();
            g.arc((r() - 0.5) * wid * 0.7, (r() - 0.5) * wid * 0.6, 1.2, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      g.restore();
    }

    if (!fluo) {
      for (let i = 0; i < nDead; i++) {
        const x = 10 + r() * (SIZE - 20);
        const y = 10 + r() * (SIZE - 20);
        g.beginPath();
        g.arc(x, y, 3.5, 0, Math.PI * 2);
        g.fillStyle = 'rgba(40,32,25,0.75)';
        g.fill();
        g.lineWidth = 1.5;
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.stroke();
      }
      if (flask.contaminated) {
        g.fillStyle = 'rgba(30,25,15,0.7)';
        for (let i = 0; i < 600; i++) g.fillRect(r() * SIZE, r() * SIZE, 1.6, 1.6);
      }
    }
    g.restore();
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.lineWidth = 4;
    g.strokeStyle = '#1f1a2e';
    g.stroke();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, flask.seed, L]);

  return <canvas ref={ref} className="scope" style={{ width: SIZE, height: SIZE }} />;
}
