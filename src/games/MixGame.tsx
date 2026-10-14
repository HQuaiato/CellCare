import { useState } from 'react';
import { fmtMoney } from '../components/ui';
import { have, mixFee } from '../game/actions';
import { LINES, MEDIUM_ORDER, MIX_VOLUME, mixRecipe } from '../game/data';
import { useGame } from '../game/store';
import type { MediumId } from '../game/types';
import { t } from '../i18n';

/**
 * Preparar meio: monte 500 mL de meio completo a partir das porcentagens da receita.
 * O jogador precisa converter % em mL — exatamente como na bancada.
 */
const COLORS: Record<string, string> = { basal: '#f9a8b8', fbs: '#fcd34d', gln: '#c4b5fd', ps: '#86efac' };

export function mixAccuracy(vols: Record<string, number>, medium: MediumId) {
  const err = mixRecipe(medium).reduce((acc, c) => acc + Math.abs((vols[c.id] ?? 0) - (c.pct / 100) * MIX_VOLUME), 0);
  return Math.max(0, Math.min(1, 1 - err / 50));
}

export function MixGame({ onFinish }: { onFinish: (score: number, extra: { medium: MediumId }) => void }) {
  const s = useGame();
  const used = new Set([...s.flasks.map((f) => LINES[f.line].medium), ...s.vials.map((v) => LINES[v.line].medium)]);
  const options = MEDIUM_ORDER.filter((m) => used.has(m) || m === 'DMEM');
  const [medium, setMedium] = useState<MediumId | null>(options.length === 1 ? options[0] : null);
  const [vols, setVols] = useState<Record<string, number>>({ basal: 0, fbs: 0, gln: 0, ps: 0 });

  if (!medium) {
    return (
      <div className="game mix">
        <p className="small">{t('game.mix.pick')}</p>
        <div className="pick">
          {options.map((m) => (
            <button key={m} disabled={s.money < mixFee(s, m)} onClick={() => setMedium(m)}>
              <b>{t(`medium.${m}`)}</b>
              <small>
                {t('game.mix.fee', { p: fmtMoney(mixFee(s, m)) })} · {t('game.mix.stock', { n: have(s, `cmed_${m}`) })}
              </small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const recipe = mixRecipe(medium);
  const total = Object.values(vols).reduce((a, b) => a + b, 0);
  const bump = (id: string, d: number) => setVols((v) => ({ ...v, [id]: Math.max(0, Math.min(MIX_VOLUME, +(v[id] + d).toFixed(1))) }));

  return (
    <div className="game mix">
      <div className="mix-recipe">
        <b>📋 {t('game.mix.recipe', { medium: `@medium.${medium}`, v: MIX_VOLUME })}</b>
        <div className="mix-pcts">
          {recipe.map((c) => (
            <span key={c.id}>
              {t(`game.mix.${c.id}`)}: <b>{c.pct}%</b>
            </span>
          ))}
        </div>
      </div>
      <div className="mix-body">
        <div className="mix-bottle">
          {recipe.map((c) => (
            <div key={c.id} style={{ height: `${(vols[c.id] / MIX_VOLUME) * 100}%`, background: COLORS[c.id] }} />
          ))}
          <div className="mix-line" />
          <span className="mix-total">{total.toFixed(0)} mL</span>
        </div>
        <div className="mix-rows">
          {recipe.map((c) => (
            <div key={c.id} className="mix-row">
              <span className="mix-name">
                <i style={{ background: COLORS[c.id] }} />
                {t(`game.mix.${c.id}`)}
              </span>
              <div className="mix-steps">
                <button onClick={() => bump(c.id, -10)}>−10</button>
                <button onClick={() => bump(c.id, -1)}>−1</button>
                <b>{vols[c.id]} mL</b>
                <button onClick={() => bump(c.id, 1)}>+1</button>
                <button onClick={() => bump(c.id, 10)}>+10</button>
                {c.id === 'basal' && <button onClick={() => bump(c.id, 100)}>+100</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {s.money < mixFee(s, medium) && <p className="hint bad">{t('err.noMoney')}</p>}
      <button className="btn primary block" disabled={total === 0 || s.money < mixFee(s, medium)} onClick={() => onFinish(Math.round(mixAccuracy(vols, medium) * 100), { medium })}>
        🧴 {t('game.mix.bottle', { p: fmtMoney(mixFee(s, medium)) })}
      </button>
    </div>
  );
}
