import { useEffect, useMemo, useRef } from 'react';
import { LINES } from '../game/data';
import { confluence } from '../game/sim';
import type { Flask, Morph, ScopeMode } from '../game/types';

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
const R = SIZE / 2;
type G = CanvasRenderingContext2D;

interface Cell {
  x: number;
  y: number;
  rot: number;
  len: number;
  wid: number;
  phase: number;
  procs: number[];
}

/** Posições das células conforme a morfologia (tapete, colônias, correntes de fibroblastos…). */
function layout(seed: number, n: number, morph: Morph, size: number): Cell[] {
  const r = rng(seed);
  const base = morph === 'round' ? 7 : morph === 'colony' ? 6 : morph === 'flat' ? 22 : 15 * Math.sqrt(1 / size);
  const pts: [number, number][] = [];
  if (morph === 'cobblestone') {
    const step = base * 1.7;
    for (let y = -R; y < R; y += step * 0.87)
      for (let x = -R; x < R; x += step) pts.push([R + x + ((Math.round(y / step) % 2) * step) / 2, R + y]);
    pts.sort(() => r() - 0.5);
    const cx = R + (r() - 0.5) * 80;
    const cy = R + (r() - 0.5) * 80;
    pts.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
  } else if (morph === 'colony') {
    const k = 1 + Math.floor(n / 45);
    const centers = Array.from({ length: k }, () => [R + (r() - 0.5) * 150, R + (r() - 0.5) * 150]);
    for (let i = 0; i < n; i++) {
      const c = centers[i % k];
      const a = r() * 6.28;
      const d = Math.sqrt(r()) * (12 + Math.sqrt(n / k) * 7);
      pts.push([c[0] + d * Math.cos(a), c[1] + d * Math.sin(a)]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28;
      const d = Math.sqrt(r()) * (R - 8);
      pts.push([R + d * Math.cos(a), R + d * Math.sin(a)]);
    }
  }
  const flow = r() * 3;
  return pts.slice(0, n).map(([x, y]) => {
    const rot = morph === 'spindle' ? flow + 0.8 * Math.sin(x / 50) + 0.6 * Math.cos(y / 70) : r() * Math.PI;
    const len = morph === 'spindle' ? base * (1.8 + r()) : morph === 'round' || morph === 'colony' || morph === 'cobblestone' ? base : base * (1 + r() * 0.8);
    const wid = morph === 'spindle' ? base * 0.35 : morph === 'round' || morph === 'colony' || morph === 'cobblestone' ? base : base * 0.6;
    const procs = morph === 'star' ? Array.from({ length: 3 + Math.floor(r() * 3) }, () => r() * 6.28) : [];
    return { x, y, rot, len, wid, phase: r(), procs };
  });
}

function shape(g: G, c: Cell, morph: Morph) {
  g.beginPath();
  if (morph === 'spindle') {
    g.moveTo(-c.len, 0);
    g.quadraticCurveTo(0, -c.wid * 1.6, c.len, 0);
    g.quadraticCurveTo(0, c.wid * 1.6, -c.len, 0);
  } else if (morph === 'cobblestone') {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.lineTo(Math.cos(a) * c.len * 0.85, Math.sin(a) * c.len * 0.85);
    }
    g.closePath();
  } else {
    g.ellipse(0, 0, c.len, c.wid, 0, 0, Math.PI * 2);
  }
}

function drawProcesses(g: G, c: Cell, color: string) {
  g.strokeStyle = color;
  g.lineWidth = 1.6;
  for (const a of c.procs) {
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(Math.cos(a + 0.3) * c.len * 1.2, Math.sin(a + 0.3) * c.len * 1.2, Math.cos(a) * c.len * 2.4, Math.sin(a) * c.len * 2.4);
    g.stroke();
  }
}

const nucSize = (morph: Morph) => (morph === 'colony' ? 0.75 : 0.5);

// ---------------------------------------------------------------- modos

function drawPhase(g: G, cells: Cell[], morph: Morph, flask: Flask, t: number, live: boolean) {
  const bg = g.createRadialGradient(R, R, 10, R, R, R);
  bg.addColorStop(0, '#e9e4d8');
  bg.addColorStop(1, '#b7ae9b');
  g.fillStyle = bg;
  g.fillRect(0, 0, SIZE, SIZE);
  cells.forEach((c, i) => {
    const dx = live ? 3 * Math.sin(t * 0.7 + i) : 0;
    const dy = live ? 3 * Math.cos(t * 0.55 + i * 1.3) : 0;
    // no time-lapse algumas células se dividem
    const dividing = live && (t * 0.3 + c.phase * 10) % 10 < 1.2;
    g.save();
    g.translate(c.x + dx, c.y + dy);
    g.rotate(c.rot + (live ? 0.1 * Math.sin(t * 0.4 + i) : 0));
    if (dividing) {
      for (const off of [-0.6, 0.6]) {
        g.beginPath();
        g.arc(off * c.wid, 0, c.wid * 0.6, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fill();
        g.strokeStyle = 'rgba(70,58,45,0.7)';
        g.stroke();
      }
      g.restore();
      return;
    }
    if (c.procs.length) drawProcesses(g, c, 'rgba(70,58,45,0.45)');
    shape(g, c, morph);
    g.fillStyle = morph === 'round' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)';
    g.fill();
    g.lineWidth = morph === 'round' ? 2.5 : 1.2;
    g.strokeStyle = morph === 'round' ? 'rgba(255,255,255,0.9)' : 'rgba(70,58,45,0.55)';
    g.stroke();
    const ns = nucSize(morph);
    g.beginPath();
    g.ellipse(0, 0, Math.min(c.len, c.wid) * ns * 1.1, Math.min(c.len, c.wid) * ns, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(80,66,52,0.38)';
    g.fill();
    g.restore();
  });

  const r = rng(flask.seed + 99);
  const nDead = Math.min(70, Math.round((cells.length + 5) * (flask.dead / Math.max(1, flask.live)) * 0.6));
  for (let i = 0; i < nDead; i++) {
    const x = 10 + r() * (SIZE - 20) + (live ? 2 * Math.sin(t + i) : 0);
    const y = 10 + r() * (SIZE - 20);
    g.beginPath();
    g.arc(x, y, 3.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(40,32,25,0.75)';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.stroke();
  }

  const c = flask.contam;
  if (c?.type === 'bacteria') {
    g.fillStyle = 'rgba(30,25,15,0.7)';
    for (let i = 0; i < 1500 * c.level; i++) g.fillRect(r() * SIZE + (live ? Math.sin(t * 5 + i) * 2 : 0), r() * SIZE, 1.6, 1.6);
  } else if (c?.type === 'fungus') {
    g.strokeStyle = 'rgba(60,70,40,0.75)';
    g.lineWidth = 1.6;
    for (let i = 0; i < 14 * c.level + 2; i++) {
      let x = r() * SIZE;
      let y = r() * SIZE;
      let a = r() * Math.PI * 2;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        a += (r() - 0.5) * 0.8;
        x += Math.cos(a) * 14;
        y += Math.sin(a) * 14;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  // micoplasma: invisível no contraste de fase (por isso precisa de PCR!)
}

function markerNucleus(flask: Flask, phase: number, dapi: boolean): string | null {
  const has = (m: string) => flask.markers.includes(m as never);
  if (has('FUCCI')) return phase < 0.55 ? '#f87171' : phase < 0.65 ? '#facc15' : '#4ade80';
  if (has('H2B')) return '#4ade80';
  return dapi ? '#60a5fa' : null;
}

function drawFluo(g: G, cells: Cell[], morph: Morph, flask: Flask, confocal: boolean) {
  g.fillStyle = '#05050a';
  g.fillRect(0, 0, SIZE, SIZE);
  const has = (m: string) => flask.markers.includes(m as never);
  const r = rng(flask.seed + 5);
  for (const c of cells) {
    g.save();
    g.translate(c.x, c.y);
    g.rotate(c.rot);
    if (confocal) {
      // faloidina (actina) em vermelho contornando a célula
      if (c.procs.length) drawProcesses(g, c, 'rgba(239,68,68,0.7)');
      shape(g, c, morph);
      g.strokeStyle = 'rgba(239,68,68,0.85)';
      g.lineWidth = 1.2;
      g.stroke();
    }
    if (has('LUC')) {
      shape(g, c, morph);
      g.fillStyle = 'rgba(253,224,71,0.18)';
      g.fill();
    }
    if (has('LC3')) {
      g.fillStyle = '#4ade80';
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.arc((r() - 0.5) * c.len * 1.5, (r() - 0.5) * c.wid * 1.5, confocal ? 1 : 1.4, 0, Math.PI * 2);
        g.fill();
      }
    }
    const nuc = markerNucleus(flask, c.phase, true)!;
    const ns = Math.min(c.len, c.wid) * nucSize(morph);
    g.beginPath();
    g.ellipse(0, 0, ns * 1.15, ns, 0, 0, Math.PI * 2);
    g.fillStyle = nuc;
    if (!confocal) {
      g.shadowColor = nuc;
      g.shadowBlur = 7;
    }
    g.globalAlpha = confocal ? 0.95 : 0.85;
    g.fill();
    g.globalAlpha = 1;
    g.shadowBlur = 0;
    if (has('53BP1')) {
      g.fillStyle = '#fb7185';
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.arc((r() - 0.5) * ns * 1.4, (r() - 0.5) * ns * 1.2, confocal ? 0.9 : 1.3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }
  scaleBar(g, confocal ? '20 µm' : '50 µm', '#fff');
}

function drawSuperRes(g: G, flask: Flask) {
  g.fillStyle = '#020205';
  g.fillRect(0, 0, SIZE, SIZE);
  const r = rng(flask.seed + 11);
  const has = (m: string) => flask.markers.includes(m as never);
  // microtúbulos irradiando do centrossomo
  g.strokeStyle = 'rgba(74,222,128,0.55)';
  g.lineWidth = 0.8;
  for (let i = 0; i < 60; i++) {
    const a = r() * 6.28;
    g.beginPath();
    g.moveTo(R + 50, R - 60);
    g.bezierCurveTo(R + 50 + Math.cos(a) * 60, R - 60 + Math.sin(a) * 60, R + Math.cos(a + 0.4) * 120, R + Math.sin(a + 0.4) * 120, R + Math.cos(a) * 160, R + Math.sin(a) * 160);
    g.stroke();
  }
  // núcleo com cromatina granular
  g.beginPath();
  g.ellipse(R - 10, R + 10, 88, 72, 0.2, 0, Math.PI * 2);
  g.fillStyle = 'rgba(37,99,235,0.35)';
  g.fill();
  for (let i = 0; i < 900; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r());
    g.fillStyle = `rgba(96,165,250,${0.25 + r() * 0.5})`;
    g.fillRect(R - 10 + Math.cos(a) * 86 * d, R + 10 + Math.sin(a) * 70 * d, 1.2, 1.2);
  }
  if (has('53BP1')) {
    // cada foco se resolve em nanodomínios
    for (let f = 0; f < 7; f++) {
      const fx = R - 10 + (r() - 0.5) * 120;
      const fy = R + 10 + (r() - 0.5) * 90;
      g.fillStyle = '#fb7185';
      for (let k = 0; k < 7; k++) {
        g.beginPath();
        g.arc(fx + (r() - 0.5) * 9, fy + (r() - 0.5) * 9, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (has('LC3')) {
    // autofagossomos aparecem como anéis
    g.strokeStyle = '#86efac';
    g.lineWidth = 2;
    for (let k = 0; k < 8; k++) {
      g.beginPath();
      g.arc(R + 60 + (r() - 0.5) * 120, R - 70 + (r() - 0.5) * 80, 5 + r() * 5, 0, Math.PI * 2);
      g.stroke();
    }
  }
  if (has('FUCCI') || has('H2B')) {
    g.globalAlpha = 0.25;
    g.beginPath();
    g.ellipse(R - 10, R + 10, 88, 72, 0.2, 0, Math.PI * 2);
    g.fillStyle = markerNucleus(flask, 0.8, false) ?? '#4ade80';
    g.fill();
    g.globalAlpha = 1;
  }
  scaleBar(g, '2 µm', '#fff');
}

function drawElectron(g: G, flask: Flask) {
  g.fillStyle = '#c9c9c9';
  g.fillRect(0, 0, SIZE, SIZE);
  const r = rng(flask.seed + 21);
  // ruído de fundo da micrografia
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
    g.fillRect(r() * SIZE, r() * SIZE, 2, 2);
  }
  // célula
  g.beginPath();
  g.ellipse(R, R, 125, 110, 0.1, 0, Math.PI * 2);
  g.fillStyle = '#a9a9a9';
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = '#3a3a3a';
  g.stroke();
  // núcleo com heterocromatina periférica e nucléolo
  g.beginPath();
  g.ellipse(R - 20, R + 5, 58, 50, 0, 0, Math.PI * 2);
  g.fillStyle = '#8e8e8e';
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = '#4a4a4a';
  g.stroke();
  g.beginPath();
  g.arc(R - 10, R - 5, 14, 0, Math.PI * 2);
  g.fillStyle = '#2f2f2f';
  g.fill();
  // retículo endoplasmático
  g.strokeStyle = '#5a5a5a';
  g.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    const y0 = R - 70 + i * 9;
    g.moveTo(R + 30, y0);
    g.bezierCurveTo(R + 60, y0 - 10, R + 80, y0 + 10, R + 100, y0);
    g.stroke();
  }
  // mitocôndrias com cristas
  for (let i = 0; i < 7; i++) {
    const a = r() * 6.28;
    const d = 75 + r() * 25;
    const x = R + Math.cos(a) * d;
    const y = R + Math.sin(a) * d * 0.85;
    g.save();
    g.translate(x, y);
    g.rotate(r() * 3);
    g.beginPath();
    g.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
    g.fillStyle = '#6d6d6d';
    g.fill();
    g.strokeStyle = '#2f2f2f';
    g.lineWidth = 1.2;
    g.stroke();
    for (let k = -10; k <= 10; k += 4) {
      g.beginPath();
      g.moveTo(k, -5);
      g.lineTo(k + 1, 5);
      g.stroke();
    }
    g.restore();
  }
  // vesículas
  for (let i = 0; i < 12; i++) {
    g.beginPath();
    g.arc(R + 20 + (r() - 0.5) * 160, R + 50 + (r() - 0.5) * 60, 2 + r() * 3, 0, Math.PI * 2);
    g.strokeStyle = '#3a3a3a';
    g.lineWidth = 1;
    g.stroke();
  }
  const c = flask.contam;
  if (c?.type === 'mycoplasma') {
    // micoplasmas aderidos à membrana: visíveis só aqui!
    g.fillStyle = '#2a2a2a';
    for (let i = 0; i < 40 * c.level + 6; i++) {
      const a = r() * 6.28;
      g.beginPath();
      g.arc(R + Math.cos(a) * 128, R + Math.sin(a) * 113, 2.5 + r() * 2, 0, Math.PI * 2);
      g.fill();
    }
  } else if (c?.type === 'bacteria') {
    g.fillStyle = '#1f1f1f';
    for (let i = 0; i < 25; i++) {
      g.save();
      g.translate(r() * SIZE, r() * SIZE);
      g.rotate(r() * 3);
      g.beginPath();
      g.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  scaleBar(g, '2 µm', '#111');
}

function scaleBar(g: G, label: string, color: string) {
  g.fillStyle = color;
  g.fillRect(SIZE - 86, SIZE - 46, 40, 3);
  g.font = 'bold 10px system-ui';
  g.fillText(label, SIZE - 84, SIZE - 52);
}

export function Microscope({ flask, mode }: { flask: Flask; mode: ScopeMode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const L = LINES[flask.line];
  const conf = Math.min(1.05, confluence(flask));
  const n = flask.live > 5e3 ? Math.max(1, Math.round(conf * (L.morph === 'colony' ? 220 : L.morph === 'flat' ? 60 : 150))) : 0;
  const cells = useMemo(() => layout(flask.seed, n, L.morph, L.size), [flask.seed, n, L.morph, L.size]);
  const contamKey = `${flask.contam?.type}|${Math.round((flask.contam?.level ?? 0) * 10)}|${flask.markers.join()}|${Math.round(flask.dead / 1e5)}`;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = SIZE * dpr;
    c.height = SIZE * dpr;
    const g = c.getContext('2d')!;
    let raf = 0;
    const frame = (now: number) => {
      const t = now / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.save();
      g.beginPath();
      g.arc(R, R, R - 2, 0, Math.PI * 2);
      g.clip();
      if (mode === 'phase' || mode === 'timelapse') drawPhase(g, cells, L.morph, flask, t, mode === 'timelapse');
      else if (mode === 'fluo' || mode === 'confocal') drawFluo(g, cells, L.morph, flask, mode === 'confocal');
      else if (mode === 'superres') drawSuperRes(g, flask);
      else drawElectron(g, flask);
      if (mode === 'timelapse') {
        g.fillStyle = '#111';
        g.font = 'bold 11px ui-monospace, monospace';
        const mins = Math.floor((t * 60) % 1440);
        g.fillText(`t = ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`, 96, 30);
      }
      g.restore();
      g.beginPath();
      g.arc(R, R, R - 2, 0, Math.PI * 2);
      g.lineWidth = 4;
      g.strokeStyle = '#1f1a2e';
      g.stroke();
      if (mode === 'timelapse') raf = requestAnimationFrame(frame);
    };
    frame(performance.now());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, mode, contamKey, L.morph]);

  return <canvas ref={ref} className="scope" style={{ width: SIZE, height: SIZE }} />;
}
