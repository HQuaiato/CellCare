import { useEffect, useState } from 'react';
import { Info, Modal, pct } from '../components/ui';
import { agentBlock, coPartners, experimentHours, experimentQuality, have, readoutBlock, startExperiment } from '../game/actions';
import { AGENT_ORDER, AGENTS, ASSAY_ORDER, ASSAYS, LINES, MARKERS, finding, levelOf } from '../game/data';
import { queueLesson } from '../game/lessons';
import { REPLICATES_FOR_PAPER, expKey } from '../game/research';
import { flaskName } from '../game/sim';
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
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const partners = coPartners(s, flask);
  const partner = partners.find((x) => x.id === partnerId);
  const q = experimentQuality(flask, agent ?? undefined);
  const key = agent ? expKey(flask.line, agent, readout, readout === 'COCULT' ? partner?.line : undefined) : null;
  const n = key ? s.replicates[key] ?? 0 : 0;

  useEffect(() => {
    act((st) => queueLesson(st, 'experiment'), true);
  }, []);

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
          <button key={a} className={agent === a ? 'on' : ''} disabled={!!agentBlock(s, flask, a)} onClick={() => setAgent(a)}>
            <b>{t(`agent.${a}`)}</b>
            <small>
              {t(`agentcls.${a}`)}
              <br />
              {agentBlock(s, flask, a)
                ? `🔒 ${tm(agentBlock(s, flask, a)!)}`
                : AGENTS[a].needsIrradiator
                  ? t('exp.irradiatorReady')
                  : AGENTS[a].replicative
                    ? t('exp.replicativeReady')
                    : t('exp.doses', { n: have(s, `drug_${a}`) })}
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
      {readout === 'COCULT' && (
        <>
          <h4>
            3. {t('exp.partner')} <Info k="exp.partnerInfo" title={t('exp.partner')} />
          </h4>
          <div className="pick">
            {partners.map((x) => (
              <button key={x.id} className={partnerId === x.id ? 'on' : ''} onClick={() => setPartnerId(x.id)}>
                <b>
                  {LINES[x.line].badge} {flaskName(x)}
                </b>
                <small>
                  {t(`tissue.${LINES[x.line].tissue}`)} · {t(`kind.${LINES[x.line].kind}`)}
                  {x.markers.length > 0 && ` · 🧬 ${x.markers.join(', ')}`}
                </small>
              </button>
            ))}
          </div>
        </>
      )}
      {s.boosts.lucky > 0 && <p className="hint">🍀 {t('exp.lucky')}</p>}

      {key && agent && (
        <p className="muted small">
          {t('exp.progress', { line: LINES[flask.line].name, agent: `@agent.${agent}`, n, total: REPLICATES_FOR_PAPER })}
          {n > 0 && <> · <i>{t(finding(agent, readout, flask.line, partner?.line).key)}</i></>}
        </p>
      )}

      <button
        className="btn primary block"
        disabled={!agent || !!readoutBlock(s, flask, readout) || (readout === 'COCULT' && !partner)}
        onClick={() => {
          if (agent && act((st) => startExperiment(st, flask.id, agent, readout, partner?.id))) onClose();
        }}
      >
        {t('exp.start', { h: experimentHours(readout) })}
      </button>
    </Modal>
  );
}
