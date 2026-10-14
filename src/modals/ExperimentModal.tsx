import { useState } from 'react';
import { useEffect } from 'react';
import { Info, Modal, pct } from '../components/ui';
import { queueLesson } from '../game/lessons';
import { experimentHours, experimentQuality, have, startExperiment } from '../game/actions';
import { AGENT_ORDER, AGENTS, LINES, MARKERS, finding, hasScope, levelOf } from '../game/data';
import { REPLICATES_FOR_PAPER, expKey } from '../game/research';
import { act, useGame } from '../game/store';
import type { AgentId, Flask, Readout } from '../game/types';
import { t } from '../i18n';

export function ExperimentModal({ flask, onClose }: { flask: Flask; onClose: () => void }) {
  const s = useGame();
  const lv = levelOf(s.xp);
  const agents = AGENT_ORDER.filter((a) => AGENTS[a].level <= lv);
  const [agent, setAgent] = useState<AgentId | null>(null);
  const readouts: Readout[] = ['MTT', ...flask.markers];
  const [readout, setReadout] = useState<Readout>('MTT');
  const q = experimentQuality(flask);
  const key = agent ? expKey(flask.line, agent, readout) : null;
  const n = key ? s.replicates[key] ?? 0 : 0;

  useEffect(() => {
    act((st) => queueLesson(st, 'experiment'), true);
  }, []);

  const agentAvail = (a: AgentId) => (AGENTS[a].needsIrradiator ? s.equipment.irradiator : have(s, `drug_${a}`) > 0);
  const fluo = hasScope(s.equipment.scope, 'fluo');
  const readoutAvail = (r: Readout) => (r === 'MTT' ? have(s, 'MTT') > 0 : fluo);

  return (
    <Modal title={`🧪 ${t('exp.title')}`} onClose={onClose}>
      <div className={`quality q-${q >= 0.8 ? 'good' : q >= 0.5 ? 'warn' : 'bad'}`}>
        {t('exp.quality', { q: pct(q) })} <Info k="exp.intro" p={{ n: REPLICATES_FOR_PAPER }} title={t('exp.title')} />
      </div>

      <h4>1. {t('exp.agent')}</h4>
      <div className="pick">
        {agents.map((a) => (
          <button key={a} className={agent === a ? 'on' : ''} disabled={!agentAvail(a)} onClick={() => setAgent(a)}>
            <b>{t(`agent.${a}`)}</b>
            <small>
              {t(`agentcls.${a}`)}
              <br />
              {AGENTS[a].needsIrradiator ? t(s.equipment.irradiator ? 'exp.irradiatorReady' : 'exp.needIrradiator') : t('exp.doses', { n: have(s, `drug_${a}`) })}
            </small>
          </button>
        ))}
      </div>

      <h4>2. {t('exp.readout')}</h4>
      <div className="pick">
        {readouts.map((r) => (
          <button key={r} className={readout === r ? 'on' : ''} disabled={!readoutAvail(r)} onClick={() => setReadout(r)}>
            <b>{r === 'MTT' ? t('exp.mtt') : t('exp.imaging', { m: MARKERS[r].name })}</b>
            <small>{r === 'MTT' ? t('exp.mttSub', { n: have(s, 'MTT') }) : t(fluo ? 'exp.imagingSub' : 'culture.needFluo')}</small>
          </button>
        ))}
      </div>
      {s.boosts.lucky > 0 && <p className="hint">🍀 {t('exp.lucky')}</p>}

      {key && agent && (
        <p className="muted small">
          {t('exp.progress', { line: LINES[flask.line].name, agent: `@agent.${agent}`, n, total: REPLICATES_FOR_PAPER })}
          {n > 0 && <> · <i>{t(finding(agent, readout, flask.line).key)}</i></>}
        </p>
      )}

      <button
        className="btn primary block"
        disabled={!agent}
        onClick={() => {
          if (agent && act((st) => startExperiment(st, flask.id, agent, readout))) onClose();
        }}
      >
        {t('exp.start', { h: experimentHours(readout) })}
      </button>
    </Modal>
  );
}
