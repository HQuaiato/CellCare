import { useState } from 'react';
import { Info, Modal, fmtCells, fmtMoney, fmtNum, pct } from '../components/ui';
import { discardSuspension, freeSlots, freeze, have, mediumNeeds, recommendedSeed, seed, sellSuspension } from '../game/actions';
import { CELLS_PER_VIAL, FLASK_TYPES, FLASKS, LINES } from '../game/data';
import { unitPrice } from '../game/econ';
import { viability } from '../game/sim';
import { act, useGame } from '../game/store';
import type { FlaskType } from '../game/types';
import { t } from '../i18n';

/** milhões, arredondado para baixo em 0,01 para nunca pedir mais do que existe */
const toM = (cells: number) => Math.floor(cells / 1e4) / 100;

export function SuspensionModal() {
  const s = useGame();
  const sus = s.suspension!;
  const L = LINES[sus.line];
  const [type, setType] = useState<FlaskType>('T75');
  const [millions, setMillions] = useState(() => toM(Math.min(sus.live, recommendedSeed(sus.line, 'T75'))));
  const maxVials = Math.floor(sus.live / CELLS_PER_VIAL);
  const [vials, setVials] = useState(Math.min(2, maxVials));
  const v = viability(sus);
  const saleValue = unitPrice(s, sus.line, sus.markers, v, sus.passage) * (sus.live / 1e6);
  const needs = mediumNeeds(L.medium, FLASKS[type].vol);
  const visibleContam = sus.contam?.detected && sus.contam.type !== 'mycoplasma';

  const pickType = (tp: FlaskType) => {
    setType(tp);
    setMillions(toM(Math.min(sus.live, recommendedSeed(sus.line, tp))));
  };

  return (
    <Modal title={`🧫 ${t('sus.title', { line: L.name })}`}>
      <div className="neubauer">
        <div>
          <small>
            {t('sus.count')} <Info k="help.neubauer" />
          </small>
          <b>{fmtCells(sus.live)}</b>
          <small>{t('sus.live')}</small>
        </div>
        <div>
          <small>{t('sus.viability')}</small>
          <b>{pct(v)}</b>
          <small>{t('sus.from', { from: sus.from, p: sus.passage })}</small>
        </div>
      </div>
      <p className="hint warn">⏱️ {t('sus.hurry')}</p>
      {visibleContam && <p className="hint bad">⚠️ {t('sus.contaminated')}</p>}

      <h4>
        {t('sus.seed')}{' '}
        <Info
          title={t('sus.seed')}
          text={t('sus.seedHint', {
            rec: fmtNum(recommendedSeed(sus.line, type) / 1e6),
            uses: Object.entries(needs)
              .map(([k, n]) => `${fmtNum(n)} mL ${k === 'FBS' ? t('inv.FBS') : t(`medium.${L.medium}.short`)}`)
              .join(' + '),
            slots: freeSlots(s),
          })}
        />
      </h4>
      <div className="seg small">
        {FLASK_TYPES.map((tp) => (
          <button key={tp} className={type === tp ? 'on' : ''} onClick={() => pickType(tp)}>
            {tp} <small>({have(s, `flask_${tp}`)})</small>
          </button>
        ))}
      </div>
      <div className="row">
        <input type="number" min={0.01} step={0.01} value={millions} onChange={(e) => setMillions(Math.max(0, +e.target.value))} className="num" />
        <span>{t('unit.millionLong')}</span>
        <button className="btn small" onClick={() => setMillions(toM(sus.live))}>
          {t('sus.all')}
        </button>
        <button className="btn primary" disabled={freeSlots(s) <= 0} onClick={() => act((st) => seed(st, type, millions))}>
          {t('sus.seedBtn')}
        </button>
      </div>

      <h4>
        {t('sus.freeze')}{' '}
        <Info
          title={t('sus.freeze')}
          text={t('sus.freezeHint', { fbs: fmtNum(0.9 * vials), dmso: fmtNum(0.1 * vials), hFbs: fmtNum(have(s, 'FBS')), hDmso: fmtNum(have(s, 'DMSO')), hVials: have(s, 'cryovial') })}
        />
      </h4>
      <div className="row">
        <input
          type="number"
          min={1}
          max={maxVials}
          value={vials}
          onChange={(e) => setVials(Math.max(0, Math.min(maxVials, Math.floor(+e.target.value))))}
          className="num"
        />
        <span>{t('sus.vials')}</span>
        <button className="btn" disabled={vials < 1} onClick={() => act((st) => freeze(st, vials))}>
          ❄️ {t('sus.freezeBtn')}
        </button>
      </div>

      <div className="row end wrap">
        <button className="btn danger" onClick={() => act(discardSuspension)}>
          {t('sus.discard')}
        </button>
        <button className="btn gold" disabled={!!visibleContam} onClick={() => act(sellSuspension)}>
          💰 {t('sus.sell', { v: fmtMoney(saleValue) })}
        </button>
      </div>
    </Modal>
  );
}
