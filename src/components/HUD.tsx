import { SPEEDS, levelProgress } from '../game/data';
import { act, useGame } from '../game/store';
import { t } from '../i18n';
import { difficultyIcon } from './DifficultyPicker';
import { fmtClock, fmtMoney } from './ui';

const SPEED_ICON: Record<number, string> = { 0: '⏸', 1: '▶', 4: '⏩' };

export function HUD() {
  const s = useGame();
  const { lv, pct } = levelProgress(s.xp);
  return (
    <header className="hud">
      <div className="hud-row">
        <div className="brand">
          🧫 <b>CellCare</b> {s.difficulty !== 'normal' && <span title={t(`difficulty.${s.difficulty}`)}>{difficultyIcon(s.difficulty)}</span>}
        </div>
        <div className="money" title={t('ui.currencyName')}>
          {fmtMoney(s.money)}
        </div>
      </div>
      <div className="hud-row">
        <div className="level" title={`${s.xp} XP`}>
          <span className="lv">{t('ui.lv', { lv })}</span>
          <div className="xp">
            <div style={{ width: `${Math.min(100, pct * 100)}%` }} />
          </div>
        </div>
        <div className="clock">{fmtClock(s.time)}</div>
        <div className="speeds">
          {SPEEDS.map((v) => (
            <button key={v} className={s.speed === v ? 'on' : ''} onClick={() => act((st) => void (st.speed = v), true)} title={t(`ui.speed${v}`)}>
              {SPEED_ICON[v]}
            </button>
          ))}
        </div>
        <div className={`tank ${s.co2Tank < 20 ? 'low' : ''}`} title={t('ui.co2Tank')}>
          CO₂ {Math.round(s.co2Tank)}%
        </div>
      </div>
    </header>
  );
}
