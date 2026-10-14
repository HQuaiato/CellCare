import { useEffect, useRef, useState } from 'react';
import { LINE_ORDER, LINES, MARKER_ORDER, MARKERS } from '../game/data';
import { t } from '../i18n';

/**
 * Rotular criotubos: chega um criotubo com o conteúdo descrito; escolha a etiqueta certa
 * (linhagem, passagem, marcador e data) entre etiquetas quase iguais, antes que o tempo acabe.
 */
const DURATION = 40;

interface Label {
  line: string;
  p: number;
  marker: string;
  day: number;
}

const rand = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

function makeRound() {
  const real: Label = {
    line: LINES[rand(LINE_ORDER)].name,
    p: 3 + Math.floor(Math.random() * 25),
    marker: Math.random() < 0.5 ? '—' : MARKERS[rand(MARKER_ORDER)].name,
    day: 1 + Math.floor(Math.random() * 28),
  };
  // etiquetas erradas mudam um único detalhe: é preciso ler com atenção
  const wrong = (): Label => {
    const w = { ...real };
    const field = rand(['line', 'p', 'marker', 'day'] as const);
    if (field === 'line') w.line = LINES[rand(LINE_ORDER)].name;
    if (field === 'p') w.p = real.p + rand([-2, -1, 1, 2]);
    if (field === 'marker') w.marker = real.marker === '—' ? MARKERS[rand(MARKER_ORDER)].name : '—';
    if (field === 'day') w.day = Math.max(1, real.day + rand([-3, -1, 1, 3]));
    return w;
  };
  const same = (a: Label, b: Label) => a.line === b.line && a.p === b.p && a.marker === b.marker && a.day === b.day;
  const options: Label[] = [real];
  while (options.length < 4) {
    const w = wrong();
    if (!options.some((o) => same(o, w))) options.push(w);
  }
  return { real, options: options.sort(() => Math.random() - 0.5), same };
}

export function LabelGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
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

  const pick = (l: Label) => {
    const ok = round.same(l, round.real);
    scoreRef.current = Math.max(0, scoreRef.current + (ok ? 3 : -2));
    setScore(scoreRef.current);
    setFlash(ok ? 'ok' : 'bad');
    window.setTimeout(() => setFlash(null), 350);
    setRound(makeRound());
  };

  const r = round.real;
  return (
    <div className="game">
      <div className="game-hud">
        <span>⭐ {score}</span>
        <span>⏱️ {left}s</span>
      </div>
      <div className={`label-card ${flash ?? ''}`}>
        <small className="muted">{t('game.label.content')}</small>
        <div className="label-content">
          🧫 <b>{r.line}</b> · P{r.p} · 🧬 {r.marker} · 📅 {t('ui.day', { d: r.day })}
        </div>
        <div className="vial-big">🧪</div>
      </div>
      <div className="label-options">
        {round.options.map((o, i) => (
          <button key={i} className="label-opt" onClick={() => pick(o)}>
            <b>{o.line}</b>
            <span>P{o.p}</span>
            <span>{o.marker}</span>
            <span>{t('ui.day', { d: o.day })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
