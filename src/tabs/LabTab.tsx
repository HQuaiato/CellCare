import { PrefsPicker } from '../components/Prefs';
import { fmtClock, fmtMoney } from '../components/ui';
import { claimQuest } from '../game/actions';
import { STIPEND, levelOf } from '../game/data';
import { QUESTS } from '../game/quests';
import { act, exportSave, logout, resetGame, useGame } from '../game/store';
import { t, tm } from '../i18n';

export const GUIDE = ['time', 'medium', 'co2', 'passage', 'freeze', 'contam', 'money', 'research'];

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
        <p className="muted small">{t('lab.profileNote')}</p>
        <PrefsPicker />
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
                  <b>{t(`quest.${q.id}.title`)}</b>
                  <small>{t(`quest.${q.id}.how`)}</small>
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
        <h3>📘 {t('lab.guide')}</h3>
        <p className="muted small">{t('lab.guideIntro', { stipend: fmtMoney(STIPEND(levelOf(s.xp))) })}</p>
        {GUIDE.map((g, i) => (
          <details key={g} className="guide-item" open={i === 0 && s.time < 30}>
            <summary>{t(`guide.${g}.title`)}</summary>
            <p>{t(`guide.${g}.body`)}</p>
          </details>
        ))}
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
