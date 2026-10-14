import { ResultFigure, figureQuant } from '../components/ResultFigure';
import { Info, Modal } from '../components/ui';
import { LINES, finding } from '../game/data';
import { readoutName } from '../game/research';
import type { LabResult } from '../game/types';
import { t } from '../i18n';

const rname = (r: LabResult['readout']) => {
  const x = readoutName(r);
  return x.startsWith('@') ? t(x.slice(1)) : x;
};

/** Figura + legenda + quantificação de um resultado. */
export function ResultCard({ r }: { r: LabResult }) {
  const q = figureQuant(r);
  const f = finding(r.agent, r.readout, r.line);
  return (
    <div className="result-card">
      <ResultFigure r={r} />
      <p className="small">
        <b>{t('fig.legend', { line: LINES[r.line].name, agent: `@agent.${r.agent}`, readout: rname(r.readout) })}</b>{' '}
        <Info k={`fig.how.${r.readout in { MTT: 1, LUC: 1 } ? 'plate' : ['NMA', 'MORPH'].includes(r.readout) ? 'scatter' : ['CLONO', 'WOUND', 'SAGAL'].includes(r.readout) ? r.readout : 'imaging'}`} />
      </p>
      {r.ok ? (
        <>
          <div className="quant">
            <span>{q?.label}</span>
            <b>{q?.c}</b>
            <span>→</span>
            <b className="treated">{q?.t}</b>
          </div>
          <p className="small muted">
            {t(`agent.${r.agent}`)} {t(f.key)}.
          </p>
        </>
      ) : (
        <p className="hint warn">{t('fig.inconclusive', { q: Math.round(r.quality * 100) })}</p>
      )}
    </div>
  );
}

export function ResultModal({ r, onClose }: { r: LabResult; onClose: () => void }) {
  return (
    <Modal title={`🖼️ ${t('fig.title')}`} onClose={onClose}>
      <ResultCard r={r} />
    </Modal>
  );
}
