import { useEffect, useState } from 'react';
import { Info, Modal, pct } from '../components/ui';
import { experimentHours, experimentQuality, have, readoutBlock, startExperiment } from '../game/actions';
import { AGENT_ORDER, AGENTS, ASSAY_ORDER, ASSAYS, LINES, MARKERS, finding, levelOf } from '../game/data';
import { queueLesson } from '../game/lessons';
import { REPLICATES_FOR_PAPER, expKey } from '../game/research';
import { act, useGame } from '../game/store';
import type { AgentId, Flask, Readout } from '../game/types';
import { t, tm } from '../i18n';

export function ExperimentModal({ flask, onClose }: { flask: Flask; onClose: () => void }) {
  const s = useGame();
  const lv = levelOf(s.xp);
  const agents = AGENT_ORDER.filter((a) => AGENTS[a].level <= lv);
  const [agent, setAgent] = useState<AgentId | null>(null);
  const readouts: Readout[] = ['MTT', ...flask.markers, ...ASSAY_ORDER.filter((a) => ASSAYS[a].level <= lv)];
  const [readout, setReadout] = useState<Readout>('MTT');
  const q = experimentQuality(flask);
  const key = agent ? expKey(flask.line, agent, readout) : null;
  const n = key ? s.replicates[key] ?? 0 : 0;

  useEffect(() => {
    act((st) => queueLesson(st, 'experiment'), true);
  }, []);

  const agentAvail = (a: AgentId) => (AGENTS[a].needsIrradiator ? s.equipment.irradiator : have(s, `drug_${a}`) > 0);
  const title = (r: Readout) =>
    r === 'MTT' ? t('exp.mtt') : r in ASSAYS ? `${ASSAYS[r as keyof typeof ASSAYS].icon} ${t(`assay.${r}`)}` : t('exp.imaging', { m: MARKERS[r as keyof typeof MARKERS].name });
  const info = (r: Readout) => (r === 'MTT' ? t('assay.MTT.desc') : r in ASSAYS ? t(`assay.${r}.desc`) : t(`marker.${r}`));

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

      <h4>
        2. {t('exp.readout')} <Info k="exp.readoutInfo" title={t('exp.readout')} />
      </h4>
      <div className="pick">
        {readouts.map((r) => {
          const block = readoutBlock(s, flask, r);
          return (
            <div
              key={r}
              role="button"
              tabIndex={0}
              aria-disabled={!!block}
              className={`pick-item ${readout === r ? 'on' : ''} ${block ? 'disabled' : ''}`}
              onClick={() => !block && setReadout(r)}
            >
              <b>
                {title(r)} <Info text={info(r)} title={title(r)} />
              </b>
              <small>{block ? `🔒 ${tm(block)}` : t('exp.hours', { h: experimentHours(r) })}</small>
            </div>
          );
        })}
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
        disabled={!agent || !!readoutBlock(s, flask, readout)}
        onClick={() => {
          if (agent && act((st) => startExperiment(st, flask.id, agent, readout))) onClose();
        }}
      >
        {t('exp.start', { h: experimentHours(readout) })}
      </button>
    </Modal>
  );
}
