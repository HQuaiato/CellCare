import { useState } from 'react';
import { fmtMoney, fmtNum } from '../components/ui';
import { buy, have, shopPrice } from '../game/actions';
import { LINES, MARKERS, MEDIA, SHOP, SHOP_CATS, levelOf, type ShopCat, type ShopItem } from '../game/data';
import { act, useGame } from '../game/store';
import type { GameState } from '../game/types';
import { t } from '../i18n';

function owned(s: GameState, item: ShopItem) {
  if (item.inv) return t('shop.owned', { n: fmtNum(have(s, item.inv), 1), unit: `@unit.${item.unit}` });
  if (item.special === 'fluo' || item.special === 'irradiator') return s.equipment[item.special] ? `✔ ${t('shop.installed')}` : '';
  if (item.special === 'incubator') return t('shop.ownedCount', { n: s.incubators.length });
  if (item.special === 'co2') return t('shop.tankAt', { pct: Math.round(s.co2Tank) });
  if (item.special === 'vial') return t('shop.inFreezer', { n: s.vials.filter((v) => v.line === item.line).length });
  return '';
}

export function itemName(item: ShopItem) {
  if (item.medium) return t(`medium.${item.medium}`);
  if (item.agent) return t(`agent.${item.agent}`);
  if (item.marker) return t('shop.virus', { m: MARKERS[item.marker].name });
  if (item.line) return t('shop.vial', { line: LINES[item.line].name });
  return t(`shop.${item.id}`);
}

function itemDesc(item: ShopItem) {
  if (item.medium) {
    const M = MEDIA[item.medium];
    return t('shop.mediumDesc', { glc: M.glc, hco3: M.hco3, serum: Math.round(M.serum * 100) });
  }
  if (item.agent) return `${t(`agentcls.${item.agent}`)} · ${t('shop.treatments', { n: item.qty! })}`;
  if (item.marker) return t('shop.virusDesc', { desc: `@marker.${item.marker}`, b: Math.round(MARKERS[item.marker].bonus * 100) });
  if (item.line) return t('shop.vialDesc', { origin: `@line.${item.line}.origin`, p: LINES[item.line].startPassage });
  return t(`shop.${item.id}.desc`);
}

export function ShopTab() {
  const s = useGame();
  const [cat, setCat] = useState<ShopCat>('media');
  const lv = levelOf(s.xp);

  return (
    <div className="stack">
      <div className="chips">
        {SHOP_CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {t(`cat.${c}`)}
          </button>
        ))}
      </div>
      <p className="muted small">{t(`cat.${cat}.hint`)}</p>
      <div className="grid-2">
        {SHOP.filter((i) => i.cat === cat).map((item) => {
          const locked = lv < item.level;
          const price = shopPrice(s, item.id);
          return (
            <section key={item.id} className={`card shop-item ${locked ? 'locked' : ''}`}>
              <div className="grow">
                <h3>
                  {locked && '🔒 '}
                  {itemName(item)}
                  {item.qty && item.qty > 1 && <small className="muted"> · {item.qty} {t(`unit.${item.unit}`)}</small>}
                </h3>
                <p className="muted small">{itemDesc(item)}</p>
                <p className="small">{locked ? t('err.levelLocked', { lv: item.level }) : owned(s, item)}</p>
              </div>
              <button className="btn gold" disabled={locked || s.money < price} onClick={() => act((st) => buy(st, item.id))}>
                {fmtMoney(price)}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
