import { setSetting } from '../game/actions';
import { LESSONS, seeLesson } from '../game/lessons';
import { act, useGame } from '../game/store';
import { t } from '../i18n';
import { Paras } from './ui';

/** Mostra a próxima lição da fila. */
export function LessonModal() {
  const s = useGame();
  const id = s.lessonQueue[0];
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) return null;
  const n = Object.keys(s.lessons).length + (s.lessons[id] ? 0 : 1);
  return (
    <div className="modal-backdrop lesson-backdrop">
      <div className="modal lesson">
        <div className="lesson-icon">{lesson.icon}</div>
        <small className="muted">{t('lesson.counter', { n: Math.min(n, LESSONS.length), total: LESSONS.length })}</small>
        <h2>{t(`lesson.${id}.title`)}</h2>
        <div className="lesson-body">
          <Paras text={t(`lesson.${id}.body`)} />
        </div>
        <button className="btn primary block" onClick={() => act((st) => seeLesson(st, id), true)}>
          {t('ui.gotIt')}
        </button>
        <button
          className="link-btn"
          onClick={() =>
            act((st) => {
              seeLesson(st, id);
              setSetting(st, 'tips', false);
            }, true)
          }
        >
          {t('lesson.disable')}
        </button>
      </div>
    </div>
  );
}
