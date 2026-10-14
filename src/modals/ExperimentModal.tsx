import { useState } from 'react';
import { Modal, pct } from '../components/ui';
import { experimentHours, experimentQuality, have, startExperiment } from '../game/actions';
import { AGENT_ORDER, AGENTS, LINES, MARKERS, levelOf } from '../game/data';
import { REPLICATES_FOR_PAPER, expKey } from '../game/research';
import { act, useGame } from '../game/store';
import type { AgentId, Flask, Readout } from '../game/types';

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

  const agentAvail = (a: AgentId) => (AGENTS[a].needsIrradiator ? s.equipment.irradiator : have(s, `drug_${a}`) > 0);
  const readoutAvail = (r: Readout) => (r === 'MTT' ? have(s, 'MTT') > 0 : s.equipment.fluo);

  return (
    <Modal title="🧪 Novo experimento" onClose={onClose}>
      <p className="muted">
        O frasco inteiro vai para o ensaio. Use células saudáveis (viabilidade &gt; 90%, confluência 50–90%) para ter
        dados confiáveis. Com {REPLICATES_FOR_PAPER} réplicas bem-sucedidas, você publica um artigo.
      </p>
      <div className={`quality q-${q >= 0.8 ? 'good' : q >= 0.5 ? 'warn' : 'bad'}`}>
        Qualidade esperada das amostras: <b>{pct(q)}</b>
      </div>

      <h4>1. Agente terapêutico</h4>
      <div className="pick">
        {agents.map((a) => (
          <button key={a} className={agent === a ? 'on' : ''} disabled={!agentAvail(a)} onClick={() => setAgent(a)}>
            <b>{AGENTS[a].name}</b>
            <small>
              {AGENTS[a].cls}
              <br />
              {AGENTS[a].needsIrradiator ? (s.equipment.irradiator ? 'irradiador pronto' : 'precisa do irradiador') : `${have(s, `drug_${a}`)} doses`}
            </small>
          </button>
        ))}
      </div>

      <h4>2. Leitura</h4>
      <div className="pick">
        {readouts.map((r) => (
          <button key={r} className={readout === r ? 'on' : ''} disabled={!readoutAvail(r)} onClick={() => setReadout(r)}>
            <b>{r === 'MTT' ? 'Viabilidade (MTT)' : `Imagem: ${MARKERS[r].name}`}</b>
            <small>
              {r === 'MTT' ? `${have(s, 'MTT')} ensaios · 48 h` : s.equipment.fluo ? 'microscopia de fluorescência · 24 h' : 'precisa do microscópio de fluorescência'}
            </small>
          </button>
        ))}
      </div>
      {flask.markers.length === 0 && (
        <p className="hint">💡 Células com marcadores (FUCCI, 53BP1, LC3…) rendem descobertas de maior impacto.</p>
      )}

      {key && (
        <p className="muted">
          {LINES[flask.line].name} + {AGENTS[agent!].name}: {n}/{REPLICATES_FOR_PAPER} réplicas
          {s.results[key] && <> · achado até agora: <i>{s.results[key]}</i></>}
        </p>
      )}

      <button
        className="btn primary block"
        disabled={!agent}
        onClick={() => {
          if (agent && act((st) => startExperiment(st, flask.id, agent, readout))) onClose();
        }}
      >
        Iniciar ({experimentHours(readout)} h)
      </button>
    </Modal>
  );
}
