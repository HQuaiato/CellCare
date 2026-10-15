import { useEffect, useRef } from 'react';
import { LINES, agentGroup, partnerType } from '../game/data';
import type { LabResult } from '../game/types';
import { fmtN, t } from '../i18n';

/**
 * Figura do resultado de um experimento: controle × tratado, desenhada conforme a técnica
 * (placa de MTT, imagens de fluorescência, gráficos de NMA/CellMorph, colônias, ferida...).
 */
const W = 360;
const H = 210;
type G = CanvasRenderingContext2D;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const PANELS = [
  { x: 8, y: 22, w: 168, h: 180 },
  { x: 184, y: 22, w: 168, h: 180 },
];

const labs = (r: LabResult): [string, string] =>
  r.agent === 'replicative' ? [t('fig.lowP'), t('fig.highP')] : r.readout === 'COCULT' ? [t('fig.mono'), t('fig.cocult')] : [t('fig.control'), t('fig.treated')];

/** Fração de células em G1 / S / G2-M conforme a classe do agente. */
function cycleFractions(r: LabResult, treated: boolean) {
  const e = treated ? r.effect : 0;
  const grp = agentGroup(r.agent);
  if (grp === 'dna' || grp === 'mitotic') return [0.55 - 0.5 * e * 0.9, 0.1, 0.35 + 0.45 * e];
  if (grp === 'replication') return [0.55 - 0.4 * e, 0.1 + 0.4 * e, 0.35];
  return [0.55 + 0.35 * e, 0.1 - 0.05 * e, 0.35 - 0.3 * e];
}

function panelLabels(g: G, labels: [string, string], color = '#1e293b') {
  g.fillStyle = color;
  g.font = '700 11px system-ui';
  g.textAlign = 'center';
  labels.forEach((l, i) => g.fillText(l, PANELS[i].x + PANELS[i].w / 2, 14));
  g.textAlign = 'start';
}

function clipPanel(g: G, i: number, bg: string, fn: (p: (typeof PANELS)[number]) => void) {
  const p = PANELS[i];
  g.save();
  g.beginPath();
  g.roundRect(p.x, p.y, p.w, p.h, 10);
  g.fillStyle = bg;
  g.fill();
  g.clip();
  fn(p);
  g.restore();
}

/** Valores de controle × tratado mostrados abaixo da figura. */
export function figureQuant(r: LabResult) {
  const e = r.effect;
  const grp = agentGroup(r.agent);
  const n = (x: number, d = 0) => fmtN(Math.round(x * 10 ** d) / 10 ** d, d);
  switch (r.readout) {
    case 'MTT':
      return { label: t('fig.q.viability'), c: '100%', t: `${n(100 * (1 - 0.8 * e))}%` };
    case 'LUC':
      return { label: t('fig.q.lum'), c: '100%', t: `${n(100 * (1 - 0.8 * e))}%` };
    case '53BP1':
      return { label: t('fig.q.foci'), c: n(1.5, 1), t: n(1.5 + 14 * e, 1) };
    case 'LC3':
      return { label: t('fig.q.puncta'), c: '3', t: n(3 + 20 * e) };
    case 'FUCCI':
      return grp === 'autophagy' || grp === 'senescence'
        ? { label: t('fig.q.g1'), c: '55%', t: `${n(55 + 35 * e)}%` }
        : { label: t('fig.q.g2'), c: '35%', t: `${n(35 + 50 * e)}%` };
    case 'H2B':
    case 'DAPI':
      return grp === 'mitotic'
        ? { label: t('fig.q.multi'), c: '2%', t: `${n(2 + 55 * e)}%` }
        : { label: t('fig.q.nucArea'), c: `${n(1, 1)}×`, t: `${n(1 + 0.9 * e, 1)}×` };
    case 'PHAL':
    case 'MORPH':
      return grp === 'mitotic'
        ? { label: t('fig.q.circ'), c: n(0.55, 2), t: n(0.55 + 0.35 * e, 2) }
        : { label: t('fig.q.cellArea'), c: `${n(1, 1)}×`, t: `${n(grp === 'autophagy' ? 1 - 0.35 * e : 1 + 0.9 * e, 1)}×` };
    case 'NMA':
      return grp === 'mitotic'
        ? { label: t('fig.q.catastrophe'), c: '2%', t: `${n(2 + 50 * e)}%` }
        : { label: t('fig.q.senescent'), c: '3%', t: `${n(3 + 45 * e)}%` };
    case 'SAGAL':
      return { label: t('fig.q.sagal'), c: '5%', t: `${n(5 + 60 * e)}%` };
    case 'CLONO':
      return { label: t('fig.q.sf'), c: n(1, 2), t: n(1 - 0.85 * e, 2) };
    case 'WOUND':
      return { label: t('fig.q.closure'), c: '85%', t: `${n(85 * (1 - 0.6 * e))}%` };
    case 'CYCLE':
    case 'FLOWCYC': {
      const [g1c, sc, g2c] = cycleFractions(r, false);
      const [g1, st, g2] = cycleFractions(r, true);
      if (grp === 'replication') return { label: t('fig.q.s'), c: `${n(sc * 100)}%`, t: `${n(st * 100)}%` };
      if (grp === 'dna' || grp === 'mitotic') return { label: t('fig.q.g2'), c: `${n(g2c * 100)}%`, t: `${n(g2 * 100)}%` };
      return { label: t('fig.q.g1'), c: `${n(g1c * 100)}%`, t: `${n(g1 * 100)}%` };
    }
    case 'AUTO':
      return { label: t('fig.q.puncta'), c: '3', t: n(3 + 20 * e) };
    case 'DDR':
      return { label: t('fig.q.foci'), c: n(1.5, 1), t: n(1.5 + 14 * e, 1) };
    case 'MULTI':
      return { label: t('fig.q.multinuc'), c: '3%', t: `${n(3 + (grp === 'mitotic' ? 50 : 25) * e)}%` };
    case 'APOP':
      return { label: t('fig.q.apop'), c: '6%', t: `${n(6 + (grp === 'dna' || grp === 'mitotic' ? 60 : 25) * e)}%` };
    case 'C12':
      return { label: t('fig.q.c12'), c: '5%', t: `${n(5 + 60 * e)}%` };
    case 'COCULT': {
      const pt = r.partner ? partnerType(r.partner) : 'tumor';
      return { label: t(`fig.q.cocult.${pt}`), c: `${n(1, 1)}×`, t: `${n(1 + 1.3 * e, 1)}×` };
    }
  }
}

// ---------------------------------------------------------------- desenhos

function drawPlate(g: G, r: LabResult, lum: boolean) {
  const rnd = rng(r.seed);
  g.fillStyle = '#e2e8f0';
  g.beginPath();
  g.roundRect(6, 22, W - 12, H - 28, 12);
  g.fill();
  const cols = 12;
  const rows = 8;
  const cw = (W - 30) / cols;
  const rh = (H - 44) / rows;
  for (let c = 0; c < cols; c++) {
    const dose = c < 2 ? 0 : (c - 1) / (cols - 2);
    const v = 1 - 0.8 * r.effect * (dose / (dose + 0.25)) * 1.25;
    for (let row = 0; row < rows; row++) {
      const vv = Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.08));
      const x = 18 + c * cw + cw / 2;
      const y = 32 + row * rh + rh / 2;
      g.beginPath();
      g.arc(x, y, Math.min(cw, rh) * 0.42, 0, Math.PI * 2);
      // MTT: amarelo (sem células) → roxo (formazan); luciferase: escuro → amarelo brilhante
      const [c0, c1] = lum ? [[20, 20, 30], [253, 224, 71]] : [[243, 231, 161], [76, 29, 149]];
      const m = vv ** 1.6;
      g.fillStyle = `rgb(${c0.map((x, k) => Math.round(x + (c1[k] - x) * m)).join(',')})`;
      g.fill();
    }
  }
  g.fillStyle = '#334155';
  g.font = '700 10px system-ui';
  g.fillText(t('fig.control'), 14, 16);
  g.textAlign = 'end';
  g.fillText(`${t('fig.dose')} →`, W - 12, 16);
  g.textAlign = 'start';
}

function cellsIn(p: (typeof PANELS)[number], rnd: () => number, n: number) {
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k < 300 && out.length < n; k++) {
    const c = { x: p.x + 16 + rnd() * (p.w - 32), y: p.y + 16 + rnd() * (p.h - 32) };
    if (out.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > 30)) out.push(c);
  }
  return out;
}

function drawImaging(g: G, r: LabResult) {
  const grp = agentGroup(r.agent);
  [0, 1].forEach((i) => {
    const e = i === 0 ? 0 : r.effect;
    const rnd = rng(r.seed + i * 17);
    clipPanel(g, i, '#03030a', (p) => {
      const cells = cellsIn(p, rnd, 12);
      for (const c of cells) {
        const bigger = r.readout === 'DAPI' || r.readout === 'H2B' ? (grp === 'dna' || grp === 'replication' ? 1 + 0.8 * e : 1) : 1;
        const nr = 8 * bigger * (0.85 + rnd() * 0.3);
        // actina (faloidina)
        if (r.readout === 'PHAL') {
          const area = grp === 'mitotic' ? 1 - 0.4 * e : grp === 'autophagy' ? 1 - 0.3 * e : 1 + 0.7 * e;
          const round = grp === 'mitotic' ? e : 0;
          const rx = 22 * Math.sqrt(area) * (1 + (1 - round) * 0.5 * rnd());
          const ry = rx * (round > 0.5 ? 0.95 : 0.55 + rnd() * 0.3);
          g.save();
          g.translate(c.x, c.y);
          g.rotate(rnd() * 3);
          g.beginPath();
          g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          g.strokeStyle = 'rgba(248,113,113,0.95)';
          g.lineWidth = 1.6;
          g.stroke();
          g.strokeStyle = 'rgba(248,113,113,0.4)';
          for (let k = -2; k <= 2; k++) {
            g.beginPath();
            g.moveTo(-rx * 0.8, k * ry * 0.25);
            g.lineTo(rx * 0.8, k * ry * 0.25);
            g.stroke();
          }
          g.restore();
        }
        if (r.readout === 'LC3') {
          g.beginPath();
          g.ellipse(c.x, c.y, 20, 14, rnd() * 3, 0, Math.PI * 2);
          g.fillStyle = 'rgba(74,222,128,0.12)';
          g.fill();
          const np = Math.round(3 + 20 * e * (0.7 + 0.6 * rnd()));
          g.fillStyle = '#4ade80';
          for (let k = 0; k < np; k++) {
            g.beginPath();
            g.arc(c.x + (rnd() - 0.5) * 34, c.y + (rnd() - 0.5) * 24, 1.6, 0, Math.PI * 2);
            g.fill();
          }
        }
        // núcleo
        let color = '#60a5fa';
        if (r.readout === 'H2B') color = '#4ade80';
        if (r.readout === '53BP1' || r.readout === 'LC3') color = 'rgba(96,165,250,0.35)';
        if (r.readout === 'FUCCI') {
          const x = rnd();
          const pGreen = grp === 'autophagy' ? 0.35 * (1 - e) : 0.35 + 0.5 * e;
          const pRed = grp === 'autophagy' ? 0.55 + 0.35 * e : (1 - pGreen) * 0.85;
          color = x < pRed ? '#f87171' : x < 1 - pGreen ? '#facc15' : '#4ade80';
        }
        const lobes = (r.readout === 'DAPI' || r.readout === 'H2B') && grp === 'mitotic' && rnd() < e ? 3 : 1;
        g.fillStyle = color;
        g.shadowColor = color;
        g.shadowBlur = 5;
        for (let l = 0; l < lobes; l++) {
          g.beginPath();
          g.arc(c.x + (lobes > 1 ? Math.cos(l * 2.1) * nr * 0.6 : 0), c.y + (lobes > 1 ? Math.sin(l * 2.1) * nr * 0.6 : 0), lobes > 1 ? nr * 0.75 : nr, 0, Math.PI * 2);
          g.fill();
        }
        g.shadowBlur = 0;
        // micronúcleos
        if ((r.readout === 'DAPI' || r.readout === 'H2B') && grp === 'dna' && rnd() < e * 0.8) {
          g.beginPath();
          g.arc(c.x + nr + 4, c.y - nr * 0.5, 2.2, 0, Math.PI * 2);
          g.fill();
        }
        if (r.readout === '53BP1') {
          const nf = Math.round(1.5 + 14 * e * (0.6 + 0.8 * rnd()));
          g.fillStyle = '#fb7185';
          for (let k = 0; k < nf; k++) {
            const a = rnd() * 6.28;
            const d = Math.sqrt(rnd()) * nr * 0.8;
            g.beginPath();
            g.arc(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 1.4, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      g.fillStyle = '#fff';
      g.fillRect(p.x + p.w - 42, p.y + p.h - 12, 30, 3);
    });
  });
  panelLabels(g, labs(r));
}

function drawScatter(g: G, r: LabResult, morph: boolean) {
  const grp = agentGroup(r.agent);
  [0, 1].forEach((i) => {
    const e = i === 0 ? 0 : r.effect;
    const rnd = rng(r.seed + i * 31);
    clipPanel(g, i, '#ffffff', (p) => {
      const ox = p.x + 22;
      const oy = p.y + p.h - 18;
      const sw = p.w - 30;
      const sh = p.h - 30;
      g.strokeStyle = '#94a3b8';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(ox, p.y + 8);
      g.lineTo(ox, oy);
      g.lineTo(ox + sw, oy);
      g.stroke();
      g.fillStyle = '#64748b';
      g.font = '9px system-ui';
      g.fillText(morph ? t('fig.ax.circ') : t('fig.ax.nii'), ox + sw - 50, oy + 12);
      g.save();
      g.translate(p.x + 10, p.y + 60);
      g.rotate(-Math.PI / 2);
      g.fillText(t('fig.ax.area'), -20, 0);
      g.restore();
      for (let k = 0; k < 120; k++) {
        const u = rnd();
        // populações: normal, senescente, apoptótica, catástrofe
        let x = 0.25 + (rnd() - 0.5) * 0.18;
        let y = 0.35 + (rnd() - 0.5) * 0.15;
        let color = '#94a3b8';
        if (!morph) {
          if (grp === 'mitotic' && u < 0.5 * e) [x, y, color] = [0.7 + rnd() * 0.25, 0.65 + rnd() * 0.25, '#f97316'];
          else if (grp !== 'mitotic' && u < 0.45 * e) [x, y, color] = [0.22 + rnd() * 0.12, 0.7 + rnd() * 0.2, '#3b82f6'];
          else if (u > 1 - 0.2 * e) [x, y, color] = [0.65 + rnd() * 0.3, 0.1 + rnd() * 0.12, '#ef4444'];
        } else {
          x = 0.35 + (rnd() - 0.5) * 0.3 + (grp === 'mitotic' ? 0.4 * e : 0);
          y = 0.4 + (rnd() - 0.5) * 0.25 + (grp === 'dna' ? 0.35 * e : grp === 'autophagy' ? -0.2 * e : grp === 'mitotic' ? -0.15 * e : 0);
          color = i === 0 ? '#94a3b8' : '#8b5cf6';
        }
        g.beginPath();
        g.arc(ox + Math.max(0.02, Math.min(0.98, x)) * sw, oy - Math.max(0.02, Math.min(0.98, y)) * sh, 2.4, 0, Math.PI * 2);
        g.fillStyle = color;
        g.globalAlpha = 0.75;
        g.fill();
        g.globalAlpha = 1;
      }
    });
  });
  panelLabels(g, labs(r));
}

function drawSagal(g: G, r: LabResult) {
  [0, 1].forEach((i) => {
    const frac = 0.05 + 0.6 * (i === 0 ? 0 : r.effect);
    const rnd = rng(r.seed + i * 7);
    clipPanel(g, i, '#efe9dc', (p) => {
      for (const c of cellsIn(p, rnd, 13)) {
        const blue = rnd() < frac;
        const big = blue ? 1.5 : 1;
        g.beginPath();
        g.ellipse(c.x, c.y, 18 * big, 11 * big, rnd() * 3, 0, Math.PI * 2);
        g.fillStyle = blue ? 'rgba(37,99,235,0.55)' : 'rgba(255,255,255,0.5)';
        g.fill();
        g.strokeStyle = 'rgba(80,66,52,0.5)';
        g.stroke();
        g.beginPath();
        g.arc(c.x, c.y, 4, 0, Math.PI * 2);
        g.fillStyle = 'rgba(80,66,52,0.4)';
        g.fill();
      }
    });
  });
  panelLabels(g, labs(r));
}

function drawClono(g: G, r: LabResult) {
  [0, 1].forEach((i) => {
    const n = Math.round(45 * (i === 0 ? 1 : 1 - 0.85 * r.effect));
    const rnd = rng(r.seed + i * 13);
    const p = PANELS[i];
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const R = Math.min(p.w, p.h) / 2 - 6;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fillStyle = '#f8fafc';
    g.fill();
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 3;
    g.stroke();
    for (let k = 0; k < n; k++) {
      const a = rnd() * 6.28;
      const d = Math.sqrt(rnd()) * (R - 8);
      g.beginPath();
      g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2 + rnd() * 5, 0, Math.PI * 2);
      g.fillStyle = `rgba(109,40,217,${0.5 + rnd() * 0.4})`;
      g.fill();
    }
  });
  panelLabels(g, labs(r));
}

function drawWound(g: G, r: LabResult) {
  [0, 1].forEach((i) => {
    const closure = 0.85 * (i === 0 ? 1 : 1 - 0.6 * r.effect);
    const rnd = rng(r.seed + i * 5);
    clipPanel(g, i, '#e9e4d8', (p) => {
      const mid = p.x + p.w / 2;
      const gap0 = 60;
      const gap = gap0 * (1 - closure);
      for (let k = 0; k < 160; k++) {
        const left = rnd() < 0.5;
        const span = (p.w - gap) / 2;
        const x = left ? p.x + rnd() * span : p.x + p.w - rnd() * span;
        const y = p.y + rnd() * p.h;
        g.beginPath();
        g.ellipse(x, y, 7, 4, rnd() * 3, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.fill();
        g.strokeStyle = 'rgba(70,58,45,0.5)';
        g.stroke();
      }
      g.setLineDash([4, 4]);
      g.strokeStyle = '#ef4444';
      g.lineWidth = 1.5;
      for (const x of [mid - gap0 / 2, mid + gap0 / 2]) {
        g.beginPath();
        g.moveTo(x, p.y);
        g.lineTo(x, p.y + p.h);
        g.stroke();
      }
      g.setLineDash([]);
    });
  });
  panelLabels(g, [`${labs(r)[0]} · 24 h`, `${labs(r)[1]} · 24 h`]);
}

function axes(g: G, p: (typeof PANELS)[number], xl: string) {
  g.strokeStyle = '#94a3b8';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(p.x + 14, p.y + 8);
  g.lineTo(p.x + 14, p.y + p.h - 16);
  g.lineTo(p.x + p.w - 6, p.y + p.h - 16);
  g.stroke();
  g.fillStyle = '#64748b';
  g.font = '9px system-ui';
  g.fillText(xl, p.x + p.w - 6 - g.measureText(xl).width, p.y + p.h - 4);
}

/** Barras empilhadas G1/S/G2-M (FUCCI computacional). */
function drawCycleBars(g: G, r: LabResult) {
  const colors = ['#f87171', '#facc15', '#4ade80'];
  const names = ['G1', 'S', 'G2/M'];
  const labels = labs(r);
  [0, 1].forEach((i) => {
    const fr = cycleFractions(r, i === 1);
    const x = 70 + i * 140;
    let y = 196;
    fr.forEach((f, k) => {
      const h = f * 160;
      g.fillStyle = colors[k];
      g.fillRect(x, y - h, 70, h);
      if (f > 0.07) {
        g.fillStyle = '#1e293b';
        g.font = '700 10px system-ui';
        g.fillText(`${names[k]} ${Math.round(f * 100)}%`, x + 6, y - h / 2 + 4);
      }
      y -= h;
    });
    g.fillStyle = '#1e293b';
    g.font = '700 11px system-ui';
    g.textAlign = 'center';
    g.fillText(labels[i], x + 35, 16);
    g.textAlign = 'start';
  });
}

/** Distribuições sobrepostas: controle (cinza) × tratado (cor). */
function drawHist(g: G, r: LabResult, mean0: number, mean1: number, max: number, xl: string, color: string) {
  const p = { x: 20, y: 22, w: W - 40, h: H - 30 };
  axes(g, p, xl);
  const curve = (mean: number, col: string) => {
    const sd = Math.max(0.8, mean * 0.45);
    g.beginPath();
    for (let k = 0; k <= 80; k++) {
      const x = (k / 80) * max;
      const yv = Math.exp(-(((x - mean) / sd) ** 2) / 2);
      const px = p.x + 14 + (k / 80) * (p.w - 20);
      const py = p.y + p.h - 16 - yv * (p.h - 34);
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.lineTo(p.x + p.w - 6, p.y + p.h - 16);
    g.lineTo(p.x + 14, p.y + p.h - 16);
    g.closePath();
    g.fillStyle = col;
    g.globalAlpha = 0.45;
    g.fill();
    g.globalAlpha = 1;
  };
  curve(mean0, '#94a3b8');
  curve(mean1, color);
  const [a, b] = labs(r);
  g.font = '700 10px system-ui';
  g.fillStyle = '#64748b';
  g.fillText(`■ ${a}`, p.x + 24, 14);
  g.fillStyle = color;
  g.fillText(`■ ${b}`, p.x + 120, 14);
}

/** Citometria: conteúdo de DNA (PI) com picos G1 e G2. */
function drawFlowCycle(g: G, r: LabResult) {
  const grp = agentGroup(r.agent);
  [0, 1].forEach((i) => {
    const [g1, sp, g2] = cycleFractions(r, i === 1);
    const subG1 = i === 1 && grp === 'dna' ? 0.15 * r.effect : 0.02;
    clipPanel(g, i, '#ffffff', (p) => {
      axes(g, p, t('fig.ax.dna'));
      const w = p.w - 20;
      g.beginPath();
      for (let k = 0; k <= 100; k++) {
        const x = k / 100;
        const y =
          g1 * Math.exp(-(((x - 0.33) / 0.035) ** 2)) +
          g2 * 0.55 * Math.exp(-(((x - 0.66) / 0.05) ** 2)) +
          (x > 0.36 && x < 0.62 ? sp * 0.35 : 0) +
          subG1 * Math.exp(-(((x - 0.15) / 0.05) ** 2));
        const px = p.x + 14 + x * w;
        const py = p.y + p.h - 16 - Math.min(1, y * 1.4) * (p.h - 34);
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokeStyle = '#7c3aed';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#64748b';
      g.font = '9px system-ui';
      g.fillText('G1', p.x + 14 + 0.3 * w, p.y + 18);
      g.fillText('G2', p.x + 14 + 0.63 * w, p.y + 18);
    });
  });
  panelLabels(g, labs(r));
}

/** Anexina V × PI: vivas, apoptose inicial, apoptose tardia/necrose. */
function drawApop(g: G, r: LabResult) {
  const grp = agentGroup(r.agent);
  const k = grp === 'dna' || grp === 'mitotic' ? 1 : 0.4;
  [0, 1].forEach((i) => {
    const e = i === 1 ? r.effect * k : 0;
    const rnd = rng(r.seed + 41 * i);
    clipPanel(g, i, '#ffffff', (p) => {
      axes(g, p, t('fig.ax.annexin'));
      const mx = p.x + 14 + (p.w - 20) / 2;
      const my = p.y + 8 + (p.h - 24) / 2;
      g.setLineDash([3, 3]);
      g.strokeStyle = '#cbd5e1';
      g.beginPath();
      g.moveTo(mx, p.y + 8);
      g.lineTo(mx, p.y + p.h - 16);
      g.moveTo(p.x + 14, my);
      g.lineTo(p.x + p.w - 6, my);
      g.stroke();
      g.setLineDash([]);
      for (let n = 0; n < 220; n++) {
        const u = rnd();
        let x = 0.2 + rnd() * 0.25;
        let y = 0.2 + rnd() * 0.25;
        if (u < 0.03 + 0.3 * e) x = 0.6 + rnd() * 0.3;
        else if (u < 0.06 + 0.65 * e) [x, y] = [0.6 + rnd() * 0.3, 0.6 + rnd() * 0.3];
        g.fillStyle = x > 0.5 ? (y > 0.5 ? '#ef4444' : '#f59e0b') : '#64748b';
        g.globalAlpha = 0.6;
        g.fillRect(p.x + 14 + x * (p.w - 20), p.y + p.h - 16 - y * (p.h - 24), 2.2, 2.2);
        g.globalAlpha = 1;
      }
    });
  });
  panelLabels(g, labs(r));
}

/** Multinucleação: actina (vermelho) + núcleos (azul). */
function drawMulti(g: G, r: LabResult) {
  const grp = agentGroup(r.agent);
  [0, 1].forEach((i) => {
    const frac = 0.03 + (i === 1 ? (grp === 'mitotic' ? 0.5 : 0.25) * r.effect : 0);
    const rnd = rng(r.seed + 23 * i);
    clipPanel(g, i, '#03030a', (p) => {
      for (const c of cellsIn(p, rnd, 9)) {
        const multi = rnd() < frac;
        const rx = multi ? 26 : 18;
        g.beginPath();
        g.ellipse(c.x, c.y, rx, rx * 0.7, rnd() * 3, 0, Math.PI * 2);
        g.strokeStyle = 'rgba(248,113,113,0.9)';
        g.lineWidth = 1.5;
        g.stroke();
        const nn = multi ? 2 + Math.floor(rnd() * 3) : 1;
        g.fillStyle = '#60a5fa';
        for (let k = 0; k < nn; k++) {
          g.beginPath();
          g.arc(c.x + (nn > 1 ? Math.cos((k / nn) * 6.28) * 9 : 0), c.y + (nn > 1 ? Math.sin((k / nn) * 6.28) * 6 : 0), 6, 0, Math.PI * 2);
          g.fill();
        }
      }
    });
  });
  panelLabels(g, labs(r));
}

/** Co-cultura: células principais (verde) com o parceiro (magenta). */
function drawCocult(g: G, r: LabResult) {
  const pt = r.partner ? partnerType(r.partner) : 'tumor';
  [0, 1].forEach((i) => {
    const rnd = rng(r.seed + 61 * i);
    clipPanel(g, i, '#03030a', (p) => {
      const main = cellsIn(p, rnd, i === 0 ? 11 : 8);
      if (i === 1) {
        // parceiro
        for (let k = 0; k < 10; k++) {
          const x = p.x + 10 + rnd() * (p.w - 20);
          const y = p.y + 10 + rnd() * (p.h - 20);
          g.fillStyle = 'rgba(232,121,249,0.85)';
          g.strokeStyle = 'rgba(232,121,249,0.85)';
          if (pt === 'fib') {
            g.save();
            g.translate(x, y);
            g.rotate(rnd() * 3);
            g.beginPath();
            g.ellipse(0, 0, 22, 4, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();
          } else if (pt === 'endo') {
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 70);
            g.stroke();
          } else {
            g.beginPath();
            g.arc(x, y, pt === 'immune' ? 4 : 8, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      for (const c of main) {
        g.beginPath();
        g.ellipse(c.x, c.y, 13, 9, rnd() * 3, 0, Math.PI * 2);
        g.fillStyle = 'rgba(74,222,128,0.85)';
        g.fill();
        if (i === 1 && pt === 'immune' && rnd() < 0.3 + 0.5 * r.effect) {
          // células T atacando: alvo fragmentado
          g.fillStyle = 'rgba(232,121,249,0.9)';
          for (let k = 0; k < 3; k++) {
            g.beginPath();
            g.arc(c.x + Math.cos(k * 2.1) * 14, c.y + Math.sin(k * 2.1) * 14, 3.5, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
    });
  });
  panelLabels(g, labs(r));
  g.fillStyle = '#64748b';
  g.font = '9px system-ui';
  g.fillText(r.partner ? `+ ${LINES[r.partner].name}` : '', PANELS[1].x + 6, H - 2);
}

export function ResultFigure({ r }: { r: LabResult }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    const rd = r.readout;
    if (rd === 'MTT') drawPlate(g, r, false);
    else if (rd === 'LUC') drawPlate(g, r, true);
    else if (rd === 'NMA') drawScatter(g, r, false);
    else if (rd === 'MORPH') drawScatter(g, r, true);
    else if (rd === 'SAGAL') drawSagal(g, r);
    else if (rd === 'CLONO') drawClono(g, r);
    else if (rd === 'WOUND') drawWound(g, r);
    else if (rd === 'CYCLE') drawCycleBars(g, r);
    else if (rd === 'AUTO') drawHist(g, r, 3, 3 + 20 * r.effect, 30, t('fig.ax.puncta'), '#22c55e');
    else if (rd === 'DDR') drawHist(g, r, 1.5, 1.5 + 14 * r.effect, 20, t('fig.ax.foci'), '#f43f5e');
    else if (rd === 'C12') drawHist(g, r, 3, 3 + 6 * r.effect, 12, t('fig.ax.c12'), '#2563eb');
    else if (rd === 'FLOWCYC') drawFlowCycle(g, r);
    else if (rd === 'APOP') drawApop(g, r);
    else if (rd === 'MULTI') drawMulti(g, r);
    else if (rd === 'COCULT') drawCocult(g, r);
    else drawImaging(g, r);
    if (!r.ok) {
      // dados inconclusivos: imagem ruidosa
      const rnd = rng(r.seed + 99);
      for (let k = 0; k < 2500; k++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? 0 : 255},${rnd() < 0.5 ? 0 : 255},${rnd() < 0.5 ? 0 : 255},0.25)`;
        g.fillRect(rnd() * W, rnd() * H, 2, 2);
      }
    }
  }, [r]);
  return <canvas ref={ref} className="result-fig" style={{ aspectRatio: `${W} / ${H}` }} />;
}
