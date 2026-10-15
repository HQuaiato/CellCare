import { ResultFigure, figureQuant } from '../components/ResultFigure';
import { Info, Modal } from '../components/ui';
import { LINES, finding } from '../game/data';
import { readoutName } from '../game/research';
import type { LabResult } from '../game/types';
import { t } from '../i18n';

const figHow = (rd: LabResult['readout']) =>
  rd === 'MTT' || rd === 'LUC'
    ? 'plate'
    : rd === 'NMA' || rd === 'MORPH'
      ? 'scatter'
      : ['CLONO', 'WOUND', 'SAGAL', 'CYCLE', 'FLOWCYC', 'APOP', 'COCULT', 'MULTI'].includes(rd)
        ? rd
        : rd === 'AUTO' || rd === 'DDR' || rd === 'C12'
          ? 'hist'
          : 'imaging';

const rname = (r: LabResult['readout']) => {
  const x = readoutName(r);
  return x.startsWith('@') ? t(x.slice(1)) : x;
};

/** Figura + legenda + quantificação de um resultado. */
export function ResultCard({ r }: { r: LabResult }) {
  const q = figureQuant(r);
  const f = finding(r.agent, r.readout, r.line, r.partner);
  return (
    <div className="result-card">
      <ResultFigure r={r} />
      <p className="small">
        <b>{t('fig.legend', { line: LINES[r.line].name, agent: `@agent.${r.agent}`, readout: rname(r.readout) })}</b>{' '}
        <Info k={`fig.how.${figHow(r.readout)}`} />
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
