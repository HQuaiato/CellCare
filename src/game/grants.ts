import { GRANT_REFRESH_H, GRANT_TIERS, MAX_PENDING_GRANTS, diff, levelOf } from './data';
import { log, m } from './econ';
import { hIndex, totalCitations } from './research';
import type { GameState, GrantTier, Msg } from './types';

/**
 * Editais de projeto (modo realista): chance baixa de aprovação, mas valores altos.
 * A relevância do pesquisador (índice h, citações, artigos e nível) aumenta a chance e o valor.
 */
export function relevance(s: GameState) {
  return hIndex(s) * 2 + s.papers.length + levelOf(s.xp) * 0.5 + totalCitations(s) / 50;
}

export function grantChance(s: GameState, tier: GrantTier) {
  return Math.min(0.75, GRANT_TIERS[tier].chance * (1 + relevance(s) / 8));
}

/** Valor que o projeto pede, limitado ao teto do edital. */
export function grantAmount(s: GameState, max: number) {
  return Math.round(Math.min(max, max * (0.35 + relevance(s) / 40)));
}

const uid = () => Math.random().toString(36).slice(2, 10);

function ensure(s: GameState) {
  s.grants ??= { calls: [], refreshAt: 0, apps: [], won: 0, lost: 0 };
  return s.grants;
}

/** Abre editais novos a cada semana de jogo e resolve os projetos cujo resultado saiu. */
export function tickGrants(s: GameState) {
  if (!diff(s).realistic) return;
  const g = ensure(s);
  if (s.time >= g.refreshAt) {
    g.refreshAt = s.time + GRANT_REFRESH_H;
    g.calls = (['small', 'medium', 'large'] as GrantTier[]).map((tier) => ({
      id: uid(),
      tier,
      max: Math.round((GRANT_TIERS[tier].max * (0.8 + Math.random() * 0.2) * diff(s).price) / 100) * 100,
      closesAt: s.time + GRANT_REFRESH_H,
    }));
    log(s, 'log.grantCalls', undefined, 'info');
  }
  const done = g.apps.filter((a) => a.resultAt <= s.time);
  if (!done.length) return;
  g.apps = g.apps.filter((a) => a.resultAt > s.time);
  for (const a of done) {
    if (Math.random() < a.chance) {
      s.money += a.amount;
      g.won += 1;
      log(s, 'log.grantWon', { tier: `@grant.${a.tier}`, amount: a.amount }, 'good');
    } else {
      g.lost += 1;
      log(s, 'log.grantLost', { tier: `@grant.${a.tier}` }, 'warn');
    }
  }
}

export function grantBlock(s: GameState, callId: string): Msg | null {
  const g = ensure(s);
  const call = g.calls.find((c) => c.id === callId);
  if (!call || call.closesAt <= s.time) return m('err.grantClosed');
  if (g.apps.length >= MAX_PENDING_GRANTS) return m('err.grantPending', { n: MAX_PENDING_GRANTS });
  return null;
}

/** Submete um projeto ao edital (o edital sai da lista). */
export function applyGrant(s: GameState, callId: string) {
  const g = ensure(s);
  const call = g.calls.find((c) => c.id === callId)!;
  g.calls = g.calls.filter((c) => c.id !== callId);
  g.apps.push({
    id: uid(),
    tier: call.tier,
    chance: grantChance(s, call.tier),
    amount: grantAmount(s, call.max),
    appliedAt: s.time,
    resultAt: s.time + GRANT_TIERS[call.tier].review,
  });
}
