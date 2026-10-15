import { useState } from 'react';
import { CellAvatar, previewFlask } from '../components/CellAvatar';
import { Info, fmtMoney, fmtNum } from '../components/ui';
import { buy, have, shopLevel, shopPrice } from '../game/actions';
import { LINES, MARKERS, MEDIA, PASSES, SCOPES, SHOP, SHOP_CATS, levelOf, type ShopCat, type ShopItem } from '../game/data';
import { act, useGame } from '../game/store';
import type { GameState } from '../game/types';
import { t } from '../i18n';

function owned(s: GameState, item: ShopItem) {
  if (item.medium && have(s, `cmed_${item.medium}`) > 0)
    return `${t('shop.owned', { n: fmtNum(have(s, item.inv!), 1), unit: '@unit.mL' })} · ${t('shop.complete', { n: fmtNum(have(s, `cmed_${item.medium}`), 0) })}`;
  if (item.inv && s.difficulty === 'creative') return t('shop.owned', { n: '∞', unit: `@unit.${item.unit}` });
  if (item.inv) return t('shop.owned', { n: fmtNum(have(s, item.inv), 1), unit: `@unit.${item.unit}` });
  if (item.special === 'irradiator' || item.special === 'computer' || item.special === 'cytometer')
    return s.equipment[item.special] ? `✔ ${t('shop.installed')}` : '';
  if (item.special === 'scope') return t('shop.scopeNow', { name: `@scope.${SCOPES[s.equipment.scope].id}` });
  if (item.special === 'incubator') return t('shop.ownedCount', { n: s.incubators.length });
  if (item.special === 'co2') return t('shop.tankAt', { pct: Math.round(s.co2Tank) });
  return '';
}

export function itemName(s: GameState, item: ShopItem) {
  if (item.medium) return t(`medium.${item.medium}`);
  if (item.agent) return t(`agent.${item.agent}`);
  if (item.marker) return t('shop.virus', { m: MARKERS[item.marker].name });
  if (item.special === 'pass') return `${PASSES.find((p) => `pass_${p.id}` === item.id)!.icon} ${t(`pass.${item.id.slice(5)}`)}`;
  if (item.special === 'scope') {
    const next = SCOPES[s.equipment.scope + 1];
    return next ? `${t(`scope.${next.id}.icon`)} ${t('shop.scopeUpgrade', { name: `@scope.${next.id}` })}` : `🔬 ${t('shop.scopeMax')}`;
  }
  return t(`shop.${item.id}`);
}

function itemDesc(s: GameState, item: ShopItem) {
  if (item.medium) {
    const M = MEDIA[item.medium];
    return t('shop.mediumDesc', { glc: M.glc, hco3: M.hco3, serum: Math.round(M.serum * 100) });
  }
  if (item.agent) return `${t(`agentcls.${item.agent}`)} · ${t('shop.treatments', { n: item.qty! })}`;
  if (item.marker) return t('shop.virusDesc', { desc: `@marker.${item.marker}`, b: Math.round(MARKERS[item.marker].bonus * 100) });
  if (item.special === 'pass') return t(`pass.${item.id.slice(5)}.desc`);
  if (item.special === 'scope') {
    const next = SCOPES[s.equipment.scope + 1];
    return next ? t(`scope.${next.id}.desc`) : t('shop.scopeMaxDesc');
  }
  return t(`shop.${item.id}.desc`);
}

/** Vitrine de linhagens: cada uma com sua carinha, nível e preço (dá para antecipar pagando mais). */
function CellShop({ s }: { s: GameState }) {
  const lv = levelOf(s.xp);
  return (
    <div className="cell-grid">
      {SHOP.filter((i) => i.cat === 'cells').map((item) => {
        const L = LINES[item.line!];
        const early = lv < item.level;
        const price = shopPrice(s, item.id);
        const inFreezer = s.vials.filter((v) => v.line === item.line).length;
        return (
          <section key={item.id} className={`card cell-card ${early ? 'early' : ''}`}>
            <div className="cell-thumb">
              <CellAvatar flask={previewFlask(item.line!)} time={0} />
            </div>
            <h3>
              {L.badge} {L.name}{' '}
              <Info
                title={L.name}
                text={[
                  `${t(`line.${item.line}.origin`)}.`,
                  t('culture.tissue', { tissue: `@tissue.${L.tissue}`, kind: `@kind.${L.kind}` }),
                  t(`line.${item.line}.fact`),
                  `${t(`medium.${L.medium}`)} · ${L.suspension ? t('shop.suspension') : t(`morph.${L.morph}`)} · ${t('shop.doubling', { h: L.td })}`,
                ].join('\n')}
              />
            </h3>
            <p className="small">{early ? `🔒 ${t('shop.lineLevel', { lv: item.level })}` : inFreezer ? t('shop.inFreezer', { n: inFreezer }) : t('shop.lineReady')}</p>
            <button className="btn gold block" disabled={s.money < price} onClick={() => act((st) => buy(st, item.id))}>
              {early ? t('shop.earlyBuy', { p: fmtMoney(price) }) : fmtMoney(price)}
            </button>
          </section>
        );
      })}
    </div>
  );
}

export function ShopTab() {
  const s = useGame();
  const [cat, setCat] = useState<ShopCat>('passes');
  const lv = levelOf(s.xp);

  return (
    <div className="stack">
      <div className="chips">
        {SHOP_CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {t(`cat.${c}`)}
          </button>
        ))}
        <Info k={`cat.${cat}.hint`} title={t(`cat.${cat}`)} />
      </div>
      {cat === 'cells' ? (
        <CellShop s={s} />
      ) : (
        <div className="grid-2">
          {SHOP.filter((i) => i.cat === cat).map((item) => {
            const need = shopLevel(s, item);
            const locked = lv < need;
            const price = shopPrice(s, item.id);
            const maxed = item.special === 'scope' && !SCOPES[s.equipment.scope + 1];
            return (
              <section key={item.id} className={`card shop-item ${locked ? 'locked' : ''}`}>
                <div className="grow">
                  <h3>
                    {locked && '🔒 '}
                    {itemName(s, item)}
                    {item.qty && item.qty > 1 && <small className="muted"> · {item.qty} {t(`unit.${item.unit}`)}</small>}{' '}
                    <Info text={itemDesc(s, item)} title={itemName(s, item)} />
                  </h3>
                  <p className="small">{locked ? t('err.levelLocked', { lv: need }) : owned(s, item)}</p>
                </div>
                {!maxed && (
                  <button className="btn gold" disabled={locked || s.money < price} onClick={() => act((st) => buy(st, item.id))}>
                    {fmtMoney(price)}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
