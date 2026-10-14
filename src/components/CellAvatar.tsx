import { useMemo } from 'react';
import { LINES } from '../game/data';
import { flaskMood } from '../game/sim';
import type { Flask, Mood } from '../game/types';

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

/** Contorno da célula: aderente tem pseudópodes, suspensão é redondinha. */
function bodyPath(seed: number, suspension: boolean) {
  const r = rng(seed);
  const p1 = r() * 6.28;
  const p2 = r() * 6.28;
  const pod = r() * 6.28;
  const pts: [number, number][] = [];
  const N = 72;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    let rad = 86;
    if (!suspension) {
      rad *= 1 + 0.06 * Math.sin(3 * t + p1) + 0.04 * Math.sin(5 * t + p2);
      const dp = Math.atan2(Math.sin(t - pod), Math.cos(t - pod));
      rad += 18 * Math.exp(-((dp / 0.28) ** 2));
      const dp2 = Math.atan2(Math.sin(t - pod - 2.6), Math.cos(t - pod - 2.6));
      rad += 11 * Math.exp(-((dp2 / 0.25) ** 2));
    } else {
      rad *= 1 + 0.015 * Math.sin(4 * t + p1);
    }
    pts.push([120 + rad * Math.cos(t), 122 + rad * 0.92 * Math.sin(t)]);
  }
  // Catmull-Rom → Bézier para um contorno suave
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const a = pts[i];
    const b = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const c1 = [a[0] + (b[0] - p0[0]) / 6, a[1] + (b[1] - p0[1]) / 6];
    const c2 = [b[0] - (p3[0] - a[0]) / 6, b[1] - (p3[1] - a[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  }
  return d + 'Z';
}

function Eyes({ mood }: { mood: Mood }) {
  const L = 100;
  const R = 140;
  const Y = 140;
  const stroke = { stroke: '#2b2140', strokeWidth: 4, strokeLinecap: 'round' as const, fill: 'none' };
  switch (mood) {
    case 'dead':
    case 'dying':
      return (
        <g {...stroke}>
          {[L, R].map((x) => (
            <g key={x}>
              <path d={`M${x - 8},${Y - 8}l16,16`} />
              <path d={`M${x + 8},${Y - 8}l-16,16`} />
            </g>
          ))}
        </g>
      );
    case 'crowded':
      return (
        <g {...stroke}>
          <path d={`M${L - 9},${Y - 7}l14,7l-14,7`} />
          <path d={`M${R + 9},${Y - 7}l-14,7l14,7`} />
        </g>
      );
    case 'bacteria':
    case 'fungus':
    case 'alkaline':
      return (
        <g {...stroke} strokeWidth={3}>
          {[L, R].map((x) => (
            <path key={x} d={`M${x},${Y} m-2,0 a2,2 0 1,1 4,0 a5,5 0 1,1 -9,0 a8,8 0 1,1 15,0`} />
          ))}
        </g>
      );
    case 'transducing':
      return (
        <g fill="#2b2140">
          {[L, R].map((x) => (
            <path key={x} d={`M${x},${Y - 11} L${x + 3},${Y - 3} L${x + 11},${Y} L${x + 3},${Y + 3} L${x},${Y + 11} L${x - 3},${Y + 3} L${x - 11},${Y} L${x - 3},${Y - 3}Z`} />
          ))}
        </g>
      );
    default: {
      const lid = mood === 'sick' || mood === 'mycoplasma' || mood === 'treating' || mood === 'toxic' || mood === 'acid' || mood === 'senescent';
      const look = mood === 'lonely' ? 4 : 0;
      return (
        <g>
          {[L, R].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={Y} rx={11} ry={13} fill="#fff" stroke="#2b2140" strokeWidth={2.5} />
              <circle cx={x + 1} cy={Y + 2 + look} r={6.5} fill="#2b2140" />
              <circle cx={x + 3} cy={Y - 1 + look} r={2.2} fill="#fff" />
              {lid && <path d={`M${x - 12},${Y - 1} Q${x},${Y - 17} ${x + 12},${Y - 1}Z`} fill="var(--lid)" stroke="#2b2140" strokeWidth={2} />}
            </g>
          ))}
        </g>
      );
    }
  }
}

function Mouth({ mood }: { mood: Mood }) {
  const s = { stroke: '#2b2140', strokeWidth: 4, strokeLinecap: 'round' as const, fill: 'none' };
  switch (mood) {
    case 'happy':
    case 'transducing':
      return <path d="M106,165 Q120,180 134,165" {...s} />;
    case 'hungry':
      return (
        <g>
          <ellipse cx={120} cy={170} rx={11} ry={13} fill="#7a2944" stroke="#2b2140" strokeWidth={3} />
          <ellipse cx={120} cy={178} rx={6} ry={4} fill="#ff8fab" />
        </g>
      );
    case 'acid':
    case 'toxic':
    case 'bacteria':
    case 'fungus':
      return <path d="M104,170 q4,-6 8,0 t8,0 t8,0 t8,0" {...s} />;
    case 'alkaline':
      return <ellipse cx={120} cy={170} rx={6} ry={7} fill="#2b2140" />;
    case 'crowded':
      return <path d="M108,170 q6,-5 12,0 t12,0" {...s} />;
    case 'lonely':
    case 'senescent':
      return <path d="M110,170 L130,170" {...s} />;
    default:
      return <path d="M106,174 Q120,162 134,174" {...s} />;
  }
}

export function CellAvatar({ flask, time }: { flask: Flask; time: number }) {
  const L = LINES[flask.line];
  const mood = flaskMood(flask);
  const path = useMemo(() => bodyPath(flask.seed, L.suspension), [flask.seed, L.suspension]);
  const r = rng(flask.seed + 7);
  const has = (m: string) => flask.markers.includes(m as never);

  const grey = mood === 'dead' || mood === 'dying' || mood === 'senescent' || mood === 'fungus';
  const sat = grey ? 12 : 70;
  const tint = mood === 'acid' || mood === 'toxic' ? 75 : mood === 'alkaline' ? 285 : L.hue;
  const fill = `hsl(${mood === 'acid' || mood === 'toxic' || mood === 'alkaline' ? (L.hue + tint) / 2 : L.hue} ${sat}% 88%)`;
  const strokeC = `hsl(${L.hue} ${grey ? 10 : 55}% 55%)`;

  // posição no ciclo celular para o FUCCI
  const phase = (time / L.td + (flask.seed % 1000) / 1000) % 1;
  let nucleus = `hsl(${L.hue} 40% 72%)`;
  let nucStroke = `hsl(${L.hue} 40% 50%)`;
  if (has('H2B')) {
    nucleus = '#86efac';
    nucStroke = '#16a34a';
  }
  if (has('FUCCI')) {
    nucleus = phase < 0.45 ? '#fca5a5' : phase < 0.55 ? '#fde047' : '#86efac';
    nucStroke = phase < 0.45 ? '#dc2626' : phase < 0.55 ? '#ca8a04' : '#16a34a';
  }

  const mito = Array.from({ length: 4 }, () => [60 + r() * 120, 150 + r() * 40, r() * 180]);
  const puncta = Array.from({ length: 9 }, () => [55 + r() * 130, 110 + r() * 85]);
  const foci = Array.from({ length: 4 }, () => [104 + r() * 32, 72 + r() * 26]);
  const bacteria = Array.from({ length: 9 }, () => [20 + r() * 200, 20 + r() * 200, r() * 180]);
  const hyphae = Array.from({ length: 5 }, () => [20 + r() * 200, 30 + r() * 190, r() * 6.28]);
  const myco = Array.from({ length: 14 }, () => r() * 6.28);

  const crowdScale = mood === 'crowded' ? 'scale(0.88 1.05)' : '';

  return (
    <svg viewBox="0 0 240 240" className={`avatar mood-${mood}`} style={{ ['--lid' as string]: fill }}>
      <defs>
        <radialGradient id={`g${flask.id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <filter id={`glow${flask.id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <ellipse cx={120} cy={226} rx={70} ry={8} fill="#000" opacity={0.08} />
      <g className="avatar-body" transform-origin="120 122" style={{ transform: crowdScale }}>
        {has('LUC') && <path d={path} fill="#fde047" opacity={0.7} filter={`url(#glow${flask.id})`} />}
        <path d={path} fill={fill} stroke={strokeC} strokeWidth={4} />
        <path d={path} fill={`url(#g${flask.id})`} />
        {mito.map(([x, y, a], i) => (
          <ellipse key={i} cx={x} cy={y} rx={8} ry={3.5} transform={`rotate(${a} ${x} ${y})`} fill={`hsl(${L.hue} 60% 78%)`} opacity={0.8} />
        ))}
        {has('LC3') && puncta.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.2} fill="#22c55e" opacity={0.9} />)}
        <ellipse cx={120} cy={86} rx={36} ry={30} fill={nucleus} stroke={nucStroke} strokeWidth={3} />
        <circle cx={128} cy={80} r={7} fill={nucStroke} opacity={0.35} />
        {has('53BP1') && foci.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill="#e11d48" />)}
        <Eyes mood={mood} />
        {(mood === 'happy' || mood === 'transducing') && (
          <g fill="#ff8fab" opacity={0.6}>
            <ellipse cx={84} cy={160} rx={9} ry={5} />
            <ellipse cx={156} cy={160} rx={9} ry={5} />
          </g>
        )}
        <Mouth mood={mood} />
      </g>
      {mood === 'bacteria' &&
        bacteria.map(([x, y, a], i) => (
          <rect key={i} className="bacterium" x={x} y={y} width={14} height={6} rx={3} fill="#a3a33a" transform={`rotate(${a} ${x} ${y})`} />
        ))}
      {mood === 'fungus' &&
        hyphae.map(([x, y, a], i) => (
          <g key={i} className="hypha" stroke="#7c8b5a" strokeWidth={2.5} fill="none" strokeLinecap="round">
            <path d={`M${x},${y} q${18 * Math.cos(a)},${18 * Math.sin(a)} ${34 * Math.cos(a + 0.6)},${34 * Math.sin(a + 0.6)}`} />
            <path d={`M${x},${y} l${14 * Math.cos(a - 1.2)},${14 * Math.sin(a - 1.2)}`} />
            <circle cx={x + 34 * Math.cos(a + 0.6)} cy={y + 34 * Math.sin(a + 0.6)} r={4} fill="#a3b17a" stroke="none" />
          </g>
        ))}
      {(mood === 'mycoplasma' || mood === 'treating') &&
        myco.map((a, i) => <circle key={i} cx={120 + 94 * Math.cos(a)} cy={122 + 86 * Math.sin(a)} r={2.4} fill="#8b5cf6" opacity={0.8} />)}
      {mood === 'hungry' && <text x={186} y={58} fontSize={26}>🍽️</text>}
      {mood === 'crowded' && <text x={186} y={58} fontSize={26}>😵</text>}
      {mood === 'happy' && <text className="float" x={190} y={56} fontSize={22}>💕</text>}
    </svg>
  );
}
