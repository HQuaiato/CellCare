import { PrefsPicker } from '../components/Prefs';
import { Info, fmtClock, fmtMoney } from '../components/ui';
import { DifficultyPicker } from '../components/DifficultyPicker';
import { claimQuest, setDifficulty, setSetting } from '../game/actions';
import { LESSONS, queueLesson } from '../game/lessons';
import { QUESTS } from '../game/quests';
import { act, exportSave, logout, resetGame, useGame } from '../game/store';
import { t, tm } from '../i18n';

export function LabTab() {
  const s = useGame();

  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cellcare-${s.player}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack grid-2">
      <section className="card">
        <h3>🧑‍🔬 {s.player}</h3>
        <PrefsPicker />
        <small className="muted">{t('lab.difficulty')}</small>
        <DifficultyPicker
          value={s.difficulty}
          onChange={(d) => {
            if (d !== s.difficulty && window.confirm(t('lab.difficultyConfirm', { d: `@difficulty.${d}` }))) act((st) => setDifficulty(st, d));
          }}
        />
        <label className="toggle">
          <input type="checkbox" checked={s.settings.tips} onChange={(e) => act((st) => setSetting(st, 'tips', e.target.checked), true)} />
          <span>{t('lab.tips')}</span>
        </label>
        <div className="row wrap">
          <button className="btn small" onClick={download}>
            💾 {t('lab.export')}
          </button>
          <button className="btn small" onClick={logout}>
            🚪 {t('lab.switch')}
          </button>
          <button
            className="btn small danger"
            onClick={() => {
              if (window.confirm(t('lab.resetConfirm'))) resetGame();
            }}
          >
            ♻️ {t('lab.reset')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>🎯 {t('lab.quests')}</h3>
        <ul className="quests">
          {QUESTS.map((q) => {
            const claimed = !!s.quests[q.id];
            const done = q.done(s);
            return (
              <li key={q.id} className={claimed ? 'claimed' : done ? 'ready' : ''}>
                <span>{claimed ? '✅' : done ? '🎁' : '⬜'}</span>
                <div className="grow">
                  <b>
                    {t(`quest.${q.id}.title`)} <Info k={`quest.${q.id}.how`} title={t(`quest.${q.id}.title`)} />
                  </b>
                </div>
                {!claimed && (
                  <button className="btn small gold" disabled={!done} onClick={() => act((st) => claimQuest(st, q.id))}>
                    {fmtMoney(q.reward)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card span-2">
        <h3>
          📘 {t('lab.lessons')} · {Object.keys(s.lessons).length}/{LESSONS.length} <Info k="lab.lessonsIntro" />
        </h3>
        <div className="lesson-grid">
          {LESSONS.map((l) => {
            const seen = !!s.lessons[l.id];
            return (
              <button key={l.id} className={`lesson-chip ${seen ? '' : 'locked'}`} disabled={!seen} onClick={() => act((st) => queueLesson(st, l.id, true), true)}>
                <span>{seen ? l.icon : '🔒'}</span>
                {seen ? t(`lesson.${l.id}.title`) : t('lesson.locked')}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card span-2">
        <h3>📓 {t('lab.notebook')}</h3>
        <ul className="log">
          {s.log.map((e) => (
            <li key={e.seq} className={`log-${e.kind}`}>
              <small>{fmtClock(e.t)}</small>
              {tm(e)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
