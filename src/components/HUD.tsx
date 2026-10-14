import { SPEEDS, levelProgress } from '../game/data';
import { act, useGame } from '../game/store';
import { fmtClock, fmtMoney } from './ui';

const SPEED_ICON: Record<number, string> = { 0: '⏸', 1: '▶', 4: '⏩' };

export function HUD() {
  const s = useGame();
  const { lv, pct } = levelProgress(s.xp);
  return (
    <header className="hud">
      <div className="hud-row">
        <div className="brand">
          🧫 <b>CellCare</b>
        </div>
        <div className="money">{fmtMoney(s.money)}</div>
      </div>
      <div className="hud-row">
        <div className="level" title={`${s.xp} XP`}>
          <span className="lv">Nv {lv}</span>
          <div className="xp">
            <div style={{ width: `${Math.min(100, pct * 100)}%` }} />
          </div>
        </div>
        <div className="clock">{fmtClock(s.time)}</div>
        <div className="speeds">
          {SPEEDS.map((v) => (
            <button key={v} className={s.speed === v ? 'on' : ''} onClick={() => act((st) => void (st.speed = v), true)} aria-label={`velocidade ${v}`}>
              {SPEED_ICON[v]}
            </button>
          ))}
        </div>
        <div className={`tank ${s.co2Tank < 20 ? 'low' : ''}`} title="Cilindro de CO₂">
          CO₂ {Math.round(s.co2Tank)}%
        </div>
      </div>
    </header>
  );
}
