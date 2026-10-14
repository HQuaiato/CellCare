import { claimQuest } from '../game/actions';
import { QUESTS, nextQuest } from '../game/quests';
import { act, useGame } from '../game/store';
import { t } from '../i18n';
import { fmtMoney } from './ui';

/** Próxima missão do tutorial, com botão de resgatar a recompensa. */
export function QuestCard() {
  const s = useGame();
  const q = nextQuest(s);
  if (!q) return null;
  const done = q.done(s);
  const idx = QUESTS.indexOf(q) + 1;
  return (
    <section className={`card quest ${done ? 'ready' : ''}`}>
      <div className="row between">
        <h3>🎯 {t(`quest.${q.id}.title`)}</h3>
        <span className="pill">
          {idx}/{QUESTS.length}
        </span>
      </div>
      <p className="small">{t(`quest.${q.id}.how`)}</p>
      <div className="row between">
        <span className="small muted">{t('quest.reward', { r: fmtMoney(q.reward) })}</span>
        <button className="btn small gold" disabled={!done} onClick={() => act((st) => claimQuest(st, q.id))}>
          {done ? t('quest.claim') : t('quest.inProgress')}
        </button>
      </div>
    </section>
  );
}
