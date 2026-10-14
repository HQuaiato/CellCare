import { claimQuest } from '../game/actions';
import { nextQuest } from '../game/quests';
import { act, useGame } from '../game/store';
import { t } from '../i18n';
import { Info, fmtMoney } from './ui';

/** Próxima missão do tutorial em uma linha; o "como fazer" fica no ⓘ. */
export function QuestCard() {
  const s = useGame();
  const q = nextQuest(s);
  if (!q) return null;
  const done = q.done(s);
  return (
    <section className={`card quest ${done ? 'ready' : ''}`}>
      <span className="quest-title">
        🎯 {t(`quest.${q.id}.title`)} <Info k={`quest.${q.id}.how`} title={t(`quest.${q.id}.title`)} />
      </span>
      <button className="btn small gold" disabled={!done} onClick={() => act((st) => claimQuest(st, q.id))}>
        {done ? `${t('quest.claim')} ${fmtMoney(q.reward)}` : fmtMoney(q.reward)}
      </button>
    </section>
  );
}
