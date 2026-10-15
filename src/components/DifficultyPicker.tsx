import { DIFFICULTIES, DIFFICULTY_ORDER } from '../game/data';
import type { Difficulty } from '../game/types';
import { t } from '../i18n';
import { Info } from './ui';

const ICON: Record<Difficulty, string> = { creative: '🎨', easy: '🌱', normal: '🧪', hard: '🔥', expert: '☠️', realistic: '🎓' };

/** Texto do ⓘ com o que muda em cada dificuldade. */
export function difficultyInfo() {
  return DIFFICULTY_ORDER.map((d) => {
    const x = DIFFICULTIES[d];
    if (x.infinite || x.realistic) return `${ICON[d]} ${t(`difficulty.${d}`)}: ${t(`difficulty.${d}.desc`)}`;
    return `${ICON[d]} ${t(`difficulty.${d}`)}: ${t('difficulty.detail', {
      contam: `×${x.contam}`,
      price: `${Math.round(x.price * 100)}%`,
      sell: `${Math.round(x.sell * 100)}%`,
      xp: `×${x.xp}`,
    })}`;
  }).join('\n');
}

export function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <div className="diff-picker">
      <div className="seg small">
        {DIFFICULTY_ORDER.map((d) => (
          <button key={d} type="button" className={value === d ? 'on' : ''} onClick={() => onChange(d)}>
            {ICON[d]} {t(`difficulty.${d}`)}
          </button>
        ))}
      </div>
      <Info text={`${t('difficulty.intro')}\n${difficultyInfo()}`} title={t('login.difficulty')} />
    </div>
  );
}

export const difficultyIcon = (d: Difficulty) => ICON[d];
