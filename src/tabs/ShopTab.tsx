import { useState } from 'react';
import { fmtMoney, fmtNum } from '../components/ui';
import { buy, have, shopPrice } from '../game/actions';
import { SHOP, SHOP_CATS, levelOf, type ShopCat, type ShopItem } from '../game/data';
import { act, useGame } from '../game/store';
import type { GameState } from '../game/types';

function owned(s: GameState, item: ShopItem) {
  if (item.inv) return `tem ${fmtNum(have(s, item.inv), 0)} ${item.unit}`;
  if (item.special === 'fluo' || item.special === 'irradiator') return s.equipment[item.special] ? '✔ instalado' : '';
  if (item.special === 'incubator') return `tem ${s.incubators.length}`;
  if (item.special === 'co2') return `cilindro em ${Math.round(s.co2Tank)}%`;
  if (item.special === 'vial') return `${s.vials.filter((v) => v.line === item.line).length} no freezer`;
  return '';
}

export function ShopTab() {
  const s = useGame();
  const [cat, setCat] = useState<ShopCat>('Meios');
  const lv = levelOf(s.xp);

  return (
    <div className="stack">
      <div className="chips">
        {SHOP_CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      {SHOP.filter((i) => i.cat === cat).map((item) => {
        const locked = lv < item.level;
        const price = shopPrice(s, item.id);
        return (
          <section key={item.id} className={`card shop-item ${locked ? 'locked' : ''}`}>
            <div className="grow">
              <h3>
                {locked && '🔒 '}
                {item.name}
              </h3>
              <p className="muted small">{item.desc}</p>
              <p className="small">{locked ? `Libera no nível ${item.level}` : owned(s, item)}</p>
            </div>
            <button className="btn gold" disabled={locked || s.money < price} onClick={() => act((st) => buy(st, item.id))}>
              {fmtMoney(price)}
            </button>
          </section>
        );
      })}
    </div>
  );
}
