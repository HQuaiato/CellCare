import type { Flask } from '../game/types';

const STOPS: [number, [number, number, number]][] = [
  [6.4, [242, 209, 58]], // amarelo
  [6.8, [243, 154, 59]], // laranja
  [7.2, [232, 88, 74]], // vermelho-alaranjado
  [7.4, [224, 64, 95]], // vermelho-rosado (ideal)
  [7.8, [201, 56, 127]], // rosa-magenta
  [8.2, [155, 63, 166]], // roxo
];

/** Cor do vermelho de fenol em função do pH. */
export function phenolRed(pH: number) {
  if (pH <= STOPS[0][0]) return `rgb(${STOPS[0][1].join(',')})`;
  for (let i = 1; i < STOPS.length; i++) {
    if (pH <= STOPS[i][0]) {
      const [p0, c0] = STOPS[i - 1];
      const [p1, c1] = STOPS[i];
      const t = (pH - p0) / (p1 - p0);
      return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * t)).join(',')})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1][1].join(',')})`;
}

export function FlaskSvg({ flask, size = 96 }: { flask: Flask; size?: number }) {
  const color = phenolRed(flask.pH);
  return (
    <svg viewBox="0 0 120 80" width={size} height={(size * 80) / 120} className="flask-svg">
      <rect x={4} y={14} width={86} height={58} rx={8} fill="#eef6ff" stroke="#9fb4cc" strokeWidth={2.5} />
      <path d="M90,30 L104,26 L104,46 L90,42Z" fill="#eef6ff" stroke="#9fb4cc" strokeWidth={2.5} />
      <rect x={104} y={22} width={12} height={28} rx={3} fill={flask.markers.length ? '#7c5cff' : '#3b82f6'} />
      <rect x={6} y={46} width={82} height={24} rx={6} fill={color} />
      {flask.contam?.type === 'bacteria' && flask.contam.detected && <rect x={6} y={46} width={82} height={24} rx={6} fill="#f5f0d0" opacity={0.65} />}
      {flask.contam?.type === 'fungus' && flask.contam.detected && (
        <g fill="#e7ead8" stroke="#9aa77a">
          <circle cx={30} cy={52} r={5} />
          <circle cx={58} cy={56} r={4} />
          <circle cx={72} cy={50} r={3} />
        </g>
      )}
      <rect x={10} y={18} width={30} height={6} rx={3} fill="#fff" opacity={0.7} />
      <text x={47} y={38} fontSize={12} textAnchor="middle" fill="#5b6b80" fontWeight={700}>
        {flask.type}
      </text>
    </svg>
  );
}
