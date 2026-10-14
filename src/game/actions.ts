import { AGENTS, CELLS_PER_VIAL, CONTAM, DISINFECT_COST, EARLY_UNLOCK_MULT, FLASKS, GAMES, HELP_COOLDOWN_H, LINES, MARKERS, MEDIA, MIX_VOLUME, PASSES, SCOPES, SHOP, diff, gameMult, hasScope, levelOf, type PassId } from './data';
import { VIAL_PREMIUM, addXp, bump, log, m, sellCells } from './econ';
import { QUESTS } from './quests';
import { expKey } from './research';
import { advance, capacity, confluence, eqPH, flaskName, isMyco, viability } from './sim';
import type { AgentId, ContamType, Difficulty, Flask, FlaskType, GameId, GameState, LineId, MarkerId, MediumId, Msg, Readout } from './types';

export class GameError extends Error {
  constructor(public msg: Msg) {
    super(msg.k);
  }
}
const fail = (k: string, p?: Msg['p']): never => {
  throw new GameError(m(k, p));
};

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Chave de tradução para um item de inventário. */
export function invKey(key: string) {
  if (key.startsWith('med_')) return `medium.${key.slice(4)}`;
  if (key.startsWith('cmed_')) return `medium.${key.slice(5)}`;
  if (key.startsWith('drug_')) return `agent.${key.slice(5)}`;
  if (key.startsWith('virus_')) return `shop.virusOf`;
  return `inv.${key}`;
}

export const have = (s: GameState, key: string) => s.inventory[key] ?? 0;

/** Verifica todos os insumos de uma vez e só então consome. */
function spend(s: GameState, needs: Record<string, number>) {
  for (const [k, v] of Object.entries(needs)) {
    if (v > 0 && have(s, k) < v - 1e-9) {
      const marker = k.startsWith('virus_') ? ' ' + MARKERS[k.slice(6) as MarkerId].name : '';
      fail('err.missing', { item: '@' + invKey(k), marker, need: v, have: have(s, k) });
    }
  }
  for (const [k, v] of Object.entries(needs)) s.inventory[k] = have(s, k) - v;
}

/** Meio completo: meio basal + SFB (fração depende do meio). */
export function mediumNeeds(medium: MediumId, vol: number): Record<string, number> {
  const sf = MEDIA[medium].serum;
  return sf > 0 ? { [`med_${medium}`]: vol * (1 - sf), FBS: vol * sf } : { [`med_${medium}`]: vol };
}

/** Pen/Strep e anfotericina entram a 1% do volume, se ativados e em estoque. */
function additives(s: GameState, vol: number) {
  const out = { needs: {} as Record<string, number>, abx: false, afx: false };
  if (s.settings.penstrep) {
    if (have(s, 'penstrep') >= vol * 0.01) {
      out.needs.penstrep = vol * 0.01;
      out.abx = true;
    } else log(s, 'log.noPenstrep', undefined, 'warn');
  }
  if (s.settings.ampho && levelOf(s.xp) >= CONTAM.fungus.level) {
    if (have(s, 'ampho') >= vol * 0.01) {
      out.needs.ampho = vol * 0.01;
      out.afx = true;
    } else log(s, 'log.noAmpho', undefined, 'warn');
  }
  return out;
}

export function freeSlots(s: GameState) {
  return s.incubators.reduce((n, i) => n + i.capacity, 0) - s.flasks.length;
}

function incubatorWithSpace(s: GameState) {
  const inc = s.incubators.find((i) => s.flasks.filter((f) => f.incubatorId === i.id).length < i.capacity);
  return inc ?? fail('err.noSpace');
}

function getFlask(s: GameState, id: string) {
  return s.flasks.find((f) => f.id === id) ?? fail('err.noFlask');
}

/**
 * Risco de contaminação a cada manipulação na capela.
 * Bactéria (nível 1) e fungo (nível 2) são reduzidos por Pen/Strep e anfotericina.
 * Micoplasma (nível 4) ignora antibióticos e passa de frasco em frasco pela capela.
 */
function expose(s: GameState, f: Flask, base = 1) {
  if (f.contam || s.time < s.boosts.shieldUntil) return;
  base *= diff(s).contam;
  const lv = levelOf(s.xp);
  const sens = LINES[f.line].sens;
  const inc = s.incubators.find((i) => i.id === f.incubatorId);
  const r = Math.random;
  let type: ContamType | null = null;
  if (r() < 0.012 * base * sens * (f.abx ? 0.15 : 1)) type = 'bacteria';
  else if (lv >= CONTAM.fungus.level && r() < (0.006 + 0.04 * (inc?.spores ?? 0)) * base * sens * (f.afx ? 0.2 : 1)) type = 'fungus';
  else if (lv >= CONTAM.mycoplasma.level) {
    const nMyco = s.flasks.filter((x) => isMyco(x) && x.id !== f.id).length;
    if (r() < (0.004 + 0.03 * nMyco) * base) type = 'mycoplasma';
  }
  if (type) f.contam = { type, level: 0.02, detected: false };
}

function createFlask(
  s: GameState,
  line: LineId,
  type: FlaskType,
  live: number,
  dead: number,
  passage: number,
  markers: MarkerId[],
): Flask {
  const inc = incubatorWithSpace(s);
  const medium = LINES[line].medium;
  const f: Flask = {
    id: uid(),
    no: s.nextNo++,
    line,
    type,
    medium,
    incubatorId: inc.id,
    live,
    dead,
    passage,
    glucose: MEDIA[medium].glc,
    lactate: 0,
    ammonia: 0,
    pH: eqPH(medium, 0, inc.co2Set),
    markers: [...markers],
    contam: null,
    abx: false,
    afx: false,
    mycoTreat: 0,
    transduction: null,
    seed: Math.floor(Math.random() * 1e9),
    bornAt: s.time,
    lastMood: 'happy',
  };
  s.flasks.push(f);
  s.selectedFlaskId = f.id;
  return f;
}

/** Consome meio completo + aditivos e marca o frasco com os protetores usados. */
function fillMedium(s: GameState, f: Pick<Flask, 'abx' | 'afx'>, medium: MediumId, vol: number, extra: Record<string, number> = {}) {
  if (have(s, `cmed_${medium}`) >= vol) {
    const amB = s.settings.ampho && have(s, 'ampho') >= vol * 0.01 && levelOf(s.xp) >= CONTAM.fungus.level;
    spend(s, { ...extra, [`cmed_${medium}`]: vol, ...(amB ? { ampho: vol * 0.01 } : {}) });
    f.abx = true;
    f.afx = amB;
    return;
  }
  const add = additives(s, vol);
  spend(s, { ...extra, ...mediumNeeds(medium, vol), ...add.needs });
  f.abx = add.abx;
  f.afx = add.afx;
}

// ---------------------------------------------------------------- cultivo

export function feed(s: GameState, id: string): Msg {
  const f = getFlask(s, id);
  if (f.live < 5e3) fail('err.flaskDead');
  fillMedium(s, f, f.medium, FLASKS[f.type].vol);
  f.glucose = MEDIA[f.medium].glc;
  f.lactate = 0;
  f.ammonia = 0;
  f.dead *= LINES[f.line].suspension ? 0.6 : 0.15;
  if (f.contam && f.contam.type !== 'mycoplasma') f.contam.level *= 0.7;
  expose(s, f, 0.6);
  bump(s, 'feeds');
  addXp(s, 2);
  return m('ok.feed', { flask: flaskName(f) });
}

export function passage(s: GameState, id: string): Msg {
  const f = getFlask(s, id);
  if (s.suspension) fail('err.suspensionPending');
  if (f.live < 5e4) fail('err.fewCells');
  const L = LINES[f.line];
  const t = FLASKS[f.type].trypsin;
  if (!L.suspension) spend(s, { PBS: t * 2, trypsin: t });
  const loss = L.suspension ? 0.97 : 0.92;
  s.suspension = {
    line: f.line,
    markers: [...f.markers],
    live: f.live * loss,
    dead: f.dead * 0.3 + f.live * (1 - loss),
    passage: f.passage,
    from: flaskName(f),
    contam: f.contam ? { ...f.contam } : null,
    immortal: f.immortal,
  };
  s.flasks = s.flasks.filter((x) => x.id !== id);
  s.selectedFlaskId = s.flasks[0]?.id ?? null;
  bump(s, 'passages');
  addXp(s, 5);
  return m(L.suspension ? 'ok.collected' : 'ok.trypsinized');
}

export function recommendedSeed(line: LineId, type: FlaskType) {
  return capacity({ line, type }) * 0.2;
}

export function seed(s: GameState, type: FlaskType, millions: number): Msg {
  const sus = s.suspension ?? fail('err.noSuspension');
  const cells = millions * 1e6;
  if (cells <= 0) fail('err.seedAmount');
  if (cells > sus.live + 1) fail('err.notEnoughCells');
  incubatorWithSpace(s);
  const tmp = { abx: false, afx: false };
  fillMedium(s, tmp, LINES[sus.line].medium, FLASKS[type].vol, { [`flask_${type}`]: 1 });
  const frac = cells / sus.live;
  const deadCarry = sus.dead * frac;
  sus.live -= cells;
  sus.dead -= deadCarry;
  const f = createFlask(s, sus.line, type, cells, deadCarry, sus.passage + 1, sus.markers);
  f.abx = tmp.abx;
  f.afx = tmp.afx;
  f.contam = sus.contam ? { ...sus.contam } : null;
  f.immortal = sus.immortal;
  expose(s, f);
  if (sus.live < 1e4) s.suspension = null;
  return m('ok.seeded', { flask: flaskName(f), p: f.passage });
}

export function freeze(s: GameState, n: number): Msg {
  const sus = s.suspension ?? fail('err.noSuspension');
  if (n < 1) fail('err.vialAmount');
  if (n * CELLS_PER_VIAL > sus.live + 1) fail('err.vialCells');
  // meio de congelamento: 90% SFB + 10% DMSO, 1 mL por criotubo
  spend(s, { cryovial: n, FBS: 0.9 * n, DMSO: 0.1 * n });
  const v = viability(sus);
  for (let i = 0; i < n; i++) {
    s.vials.push({ id: uid(), line: sus.line, markers: [...sus.markers], passage: sus.passage + 1, viability: v, frozenAt: s.time, contam: sus.contam?.type ?? null, immortal: sus.immortal });
  }
  const frac = (n * CELLS_PER_VIAL) / sus.live;
  sus.dead -= sus.dead * frac;
  sus.live -= n * CELLS_PER_VIAL;
  if (sus.live < 1e4) s.suspension = null;
  bump(s, 'frozen', n);
  addXp(s, 2 * n);
  return m('ok.frozen', { n });
}

export function sellSuspension(s: GameState): Msg {
  const sus = s.suspension ?? fail('err.noSuspension');
  if (sus.contam && sus.contam.type !== 'mycoplasma' && sus.contam.detected) fail('err.sellContaminated');
  const total = sellCells(s, sus.line, sus.markers, sus.live / 1e6, viability(sus), sus.passage, 1, sus.contam?.type === 'mycoplasma');
  s.suspension = null;
  return total >= 0 ? m('ok.sold', { total: Math.round(total) }) : m('ok.soldFined');
}

export function discardSuspension(s: GameState): Msg {
  s.suspension = null;
  return m('ok.suspensionDiscarded');
}

export function discardFlask(s: GameState, id: string): Msg {
  const f = getFlask(s, id);
  s.flasks = s.flasks.filter((x) => x.id !== id);
  s.selectedFlaskId = s.flasks[0]?.id ?? null;
  return m('ok.discarded', { flask: flaskName(f) });
}

// ---------------------------------------------------------------- freezer

export function thaw(s: GameState, vialId: string, type: FlaskType): Msg {
  const vial = s.vials.find((v) => v.id === vialId) ?? fail('err.noVial');
  incubatorWithSpace(s);
  const tmp = { abx: false, afx: false };
  fillMedium(s, tmp, LINES[vial.line].medium, FLASKS[type].vol, { [`flask_${type}`]: 1 });
  const live = CELLS_PER_VIAL * vial.viability * 0.8;
  s.vials = s.vials.filter((v) => v.id !== vialId);
  const f = createFlask(s, vial.line, type, live, CELLS_PER_VIAL - live, vial.passage, vial.markers);
  f.abx = tmp.abx;
  f.afx = tmp.afx;
  if (vial.contam) f.contam = { type: vial.contam, level: vial.contam === 'mycoplasma' ? 0.3 : 0.1, detected: false };
  f.immortal = vial.immortal;
  expose(s, f);
  addXp(s, 3);
  return m('ok.thawed', { flask: flaskName(f) });
}

export function sellVial(s: GameState, vialId: string): Msg {
  const vial = s.vials.find((v) => v.id === vialId) ?? fail('err.noVial');
  const total = sellCells(s, vial.line, vial.markers, CELLS_PER_VIAL / 1e6, vial.viability, vial.passage, VIAL_PREMIUM, vial.contam === 'mycoplasma');
  s.vials = s.vials.filter((v) => v.id !== vialId);
  return total >= 0 ? m('ok.vialSold', { total: Math.round(total) }) : m('ok.soldFined');
}

// ---------------------------------------------------------------- contaminação

export function treatContam(s: GameState, id: string): Msg {
  const f = getFlask(s, id);
  const c = f.contam;
  if (!c || !c.detected || c.type === 'mycoplasma') fail('err.nothingToTreat');
  const bact = c!.type === 'bacteria';
  spend(s, { [bact ? 'abx_high' : 'afx_high']: 1 });
  f.dead += f.live * (bact ? 0.15 : 0.2);
  f.live *= bact ? 0.85 : 0.8;
  bump(s, 'treatments');
  const chance = bact ? 1 - c!.level * 1.2 : 1 - c!.level * 1.5;
  if (Math.random() < chance) {
    f.contam = null;
    return m('ok.treated', { flask: flaskName(f) });
  }
  c!.level = Math.min(1, c!.level + 0.1);
  log(s, 'log.treatFailed', { flask: flaskName(f) }, 'bad');
  return m('ok.treatTried');
}

/** Com microscópio eletrônico dá para ver o micoplasma direto, sem PCR. */
export function testMyco(s: GameState, id: string): Msg {
  const f = getFlask(s, id);
  if (!hasScope(s.equipment.scope, 'electron')) spend(s, { myco_pcr: 1 });
  bump(s, 'mycoTests');
  if (isMyco(f) && f.contam!.level > 0.05) {
    f.contam!.detected = true;
    log(s, 'log.mycoPositive', { flask: flaskName(f) }, 'bad');
    return m('ok.mycoPositive');
  }
  log(s, 'log.mycoNegative', { flask: flaskName(f) }, 'good');
  return m('ok.mycoNegative');
}

export const MYCO_TREAT_H = 96;

export function treatMyco(s: GameState, id: string): Msg {
  const f = getFlask(s, id);
  if (f.mycoTreat > 0) fail('err.alreadyTreating');
  spend(s, { myco_treat: 1 });
  f.mycoTreat = MYCO_TREAT_H;
  bump(s, 'treatments');
  return m('ok.mycoTreatStarted');
}

export function disinfect(s: GameState, incId: string): Msg {
  const inc = s.incubators.find((i) => i.id === incId) ?? fail('err.noIncubator');
  const cost = Math.round(DISINFECT_COST * diff(s).price);
  if (s.money < cost) fail('err.noMoney');
  s.money -= cost;
  inc.spores = 0;
  return m('ok.disinfected', { inc: inc.name });
}

// ---------------------------------------------------------------- loja, estufas e ajustes

export function shopPrice(s: GameState, itemId: string) {
  const item = SHOP.find((i) => i.id === itemId)!;
  const k = diff(s).price;
  if (item.special === 'incubator') return Math.round(item.price * s.incubators.length * k);
  if (item.special === 'scope') return Math.round((SCOPES[s.equipment.scope + 1]?.price ?? 0) * k);
  if (item.special === 'vial' && levelOf(s.xp) < item.level) return Math.round(item.price * EARLY_UNLOCK_MULT * k);
  return Math.round(item.price * k);
}

/** Nível exigido de verdade (o microscópio depende do próximo upgrade; criotubos podem ser antecipados). */
export function shopLevel(s: GameState, item: (typeof SHOP)[number]) {
  if (item.special === 'scope') return SCOPES[s.equipment.scope + 1]?.level ?? 99;
  if (item.special === 'vial') return 1;
  return item.level;
}

export function buy(s: GameState, itemId: string): Msg {
  const item = SHOP.find((i) => i.id === itemId) ?? fail('err.noItem');
  if (levelOf(s.xp) < shopLevel(s, item)) fail('err.levelLocked', { lv: shopLevel(s, item) });
  const price = shopPrice(s, itemId);
  if (s.money < price) fail('err.noMoney');
  switch (item.special) {
    case 'co2':
      if (s.co2Tank > 95) fail('err.tankFull');
      s.co2Tank = 100;
      s.tankWarned = 0;
      break;
    case 'incubator':
      s.incubators.push({ id: uid(), name: `#${s.incubators.length + 1}`, co2Set: 5, capacity: 6, spores: 0 });
      break;
    case 'irradiator':
      if (s.equipment.irradiator) fail('err.alreadyOwned');
      s.equipment.irradiator = true;
      break;
    case 'scope':
      if (!SCOPES[s.equipment.scope + 1]) fail('err.alreadyOwned');
      s.equipment.scope += 1;
      break;
    case 'vial':
      s.vials.push({ id: uid(), line: item.line!, markers: [], passage: LINES[item.line!].startPassage, viability: 0.95, frozenAt: s.time, contam: null });
      break;
    case 'pass':
    default:
      s.inventory[item.inv!] = have(s, item.inv!) + item.qty!;
  }
  s.money -= price;
  if (item.marker) return m('ok.boughtVirus', { m: MARKERS[item.marker].name });
  if (item.line) return m('ok.boughtVial', { line: LINES[item.line].name });
  const name = item.medium
    ? `@medium.${item.medium}`
    : item.agent
      ? `@agent.${item.agent}`
      : item.special === 'pass'
        ? `@pass.${item.id.slice(5)}`
        : item.special === 'scope'
          ? `@scope.${SCOPES[s.equipment.scope].id}`
          : `@shop.${item.id}`;
  return m('ok.bought', { item: name });
}

export function setCO2(s: GameState, incId: string, value: number) {
  const inc = s.incubators.find((i) => i.id === incId) ?? fail('err.noIncubator');
  inc.co2Set = Math.max(0, Math.min(10, value));
}

export function moveFlask(s: GameState, flaskId: string, incId: string) {
  const f = getFlask(s, flaskId);
  const inc = s.incubators.find((i) => i.id === incId) ?? fail('err.noIncubator');
  if (s.flasks.filter((x) => x.incubatorId === inc.id).length >= inc.capacity) fail('err.incubatorFull');
  f.incubatorId = inc.id;
}

export function setSetting(s: GameState, key: keyof GameState['settings'], value: boolean) {
  s.settings[key] = value;
  if (key === 'tips' && !value) s.lessonQueue = [];
}

// ---------------------------------------------------------------- recuperação e missões

/** Pode pedir ajuda à orientadora: sem dinheiro e sem células saudáveis. */
export function canAskHelp(s: GameState) {
  const healthy = s.flasks.some((f) => f.live > 1e5 && !(f.contam && f.contam.detected && f.contam.type !== 'mycoplasma'));
  return s.money < 80 && !healthy && s.vials.length === 0 && !s.suspension && s.time >= s.helpReadyAt;
}

export function askHelp(s: GameState): Msg {
  if (!canAskHelp(s)) fail('err.helpUnavailable');
  s.helpReadyAt = s.time + HELP_COOLDOWN_H;
  // doação de outro laboratório: de procedência duvidosa (às vezes vem com micoplasma)
  s.vials.push({ id: uid(), line: 'L929', markers: [], passage: 14, viability: 0.9, frozenAt: s.time, contam: Math.random() < 0.1 ? 'mycoplasma' : null });
  const top = (k: string, min: number) => (s.inventory[k] = Math.max(have(s, k), min));
  top('med_MEM', 250);
  top('FBS', 25);
  top('flask_T25', 3);
  top('trypsin', 20);
  top('PBS', 100);
  log(s, 'log.help', undefined, 'good');
  return m('ok.help');
}

export function claimQuest(s: GameState, id: string): Msg {
  const q = QUESTS.find((x) => x.id === id) ?? fail('err.noItem');
  if (s.quests[id]) fail('err.alreadyClaimed');
  if (!q.done(s)) fail('err.questNotDone');
  s.quests[id] = 'claimed';
  s.money += q.reward;
  addXp(s, 10);
  return m('ok.questClaimed', { reward: q.reward });
}

// ---------------------------------------------------------------- transdução e experimentos

export const TRANSDUCTION_HOURS = 72;

export function startTransduction(s: GameState, flaskId: string, marker: MarkerId): Msg {
  const f = getFlask(s, flaskId);
  if (f.transduction) fail('err.alreadyTransducing');
  if (f.markers.includes(marker)) fail('err.alreadyMarker');
  if (f.contam?.detected) fail('err.contaminated');
  spend(s, { [`virus_${marker}`]: 1 });
  f.dead += f.live * 0.4;
  f.live *= 0.6;
  f.transduction = { marker, hoursLeft: TRANSDUCTION_HOURS };
  bump(s, 'transductions');
  addXp(s, 10);
  return m('ok.transduction', { marker: MARKERS[marker].name });
}

export function experimentQuality(f: Flask) {
  const c = f.contam;
  if (c && c.type !== 'mycoplasma') return 0;
  const L = LINES[f.line];
  const v = viability(f);
  const cf = confluence(f);
  let q = 1;
  if (v < 0.9) q *= Math.max(0, Math.min(1, (v - 0.5) / 0.4));
  if (cf < 0.3) q *= 0.3;
  else if (cf < 0.5) q *= 0.75;
  else if (cf > 0.95) q *= 0.6;
  if (f.medium !== L.medium) q *= 0.7;
  if (f.passage > 30) q *= 0.8;
  if (L.maxPassage && !f.immortal && f.passage > L.maxPassage) q *= 0.5;
  if (c?.type === 'mycoplasma') q *= 1 - 0.7 * c.level; // invisível, mas estraga os dados
  return q;
}

export const experimentHours = (r: Readout) => (r === 'MTT' ? 48 : 24);

export function startExperiment(s: GameState, flaskId: string, agent: AgentId, readout: Readout): Msg {
  const f = getFlask(s, flaskId);
  if (f.transduction) fail('err.waitTransduction');
  const A = AGENTS[agent];
  if (levelOf(s.xp) < A.level) fail('err.levelLocked', { lv: A.level });
  if (A.needsIrradiator && !s.equipment.irradiator) fail('err.needIrradiator');
  if (readout !== 'MTT') {
    if (!hasScope(s.equipment.scope, 'fluo')) fail('err.needFluo');
    if (!f.markers.includes(readout)) fail('err.noMarker');
  }
  const needs: Record<string, number> = {};
  if (!A.needsIrradiator) needs[`drug_${agent}`] = 1;
  if (readout === 'MTT') needs.MTT = 1;
  spend(s, needs);
  const lucky = s.boosts.lucky > 0;
  if (lucky) s.boosts.lucky -= 1;
  s.experiments.push({
    id: uid(),
    key: expKey(f.line, agent, readout),
    line: f.line,
    agent,
    readout,
    markers: [...f.markers],
    quality: lucky ? 1 : experimentQuality(f),
    lucky,
    startedAt: s.time,
    readyAt: s.time + experimentHours(readout),
    flaskName: flaskName(f),
  });
  s.flasks = s.flasks.filter((x) => x.id !== flaskId);
  s.selectedFlaskId = s.flasks[0]?.id ?? null;
  bump(s, 'experiments');
  addXp(s, 8);
  return m('ok.experiment', { h: experimentHours(readout) });
}

// ---------------------------------------------------------------- passes

export function usePass(s: GameState, id: PassId, flaskId?: string): Msg {
  const def = PASSES.find((p) => p.id === id) ?? fail('err.noItem');
  const key = `pass_${id}`;
  if (have(s, key) < 1) fail('err.noPass');
  const f = def.flask ? (s.flasks.find((x) => x.id === flaskId) ?? fail('err.needFlask')) : null;
  switch (id) {
    case 'time12':
    case 'time48': {
      const h = id === 'time12' ? 12 : 48;
      if (s.suspension) fail('err.suspensionPending');
      s.boosts.autoFeedUntil = Math.max(s.boosts.autoFeedUntil, s.time + h);
      s.inventory[key] -= 1;
      bump(s, 'passes');
      advance(s, h);
      return m('ok.timeSkip', { h });
    }
    case 'confluence':
      f!.live = capacity(f!) * 0.85;
      f!.dead = f!.live * 0.04;
      f!.glucose = MEDIA[f!.medium].glc;
      f!.lactate = 0;
      f!.ammonia = 0;
      break;
    case 'autofeed':
      s.boosts.autoFeedUntil = Math.max(s.boosts.autoFeedUntil, s.time) + 72;
      break;
    case 'shield':
      s.boosts.shieldUntil = Math.max(s.boosts.shieldUntil, s.time) + 48;
      break;
    case 'lucky':
      s.boosts.lucky += 1;
      break;
    case 'sale2x':
      s.boosts.sale2xUntil = Math.max(s.boosts.sale2xUntil, s.time) + 24;
      break;
    case 'xp2x':
      s.boosts.xp2xUntil = Math.max(s.boosts.xp2xUntil, s.time) + 24;
      break;
    case 'express':
      if (!f!.transduction) fail('err.noTransduction');
      f!.transduction!.hoursLeft = 0.01;
      break;
    case 'cleanse':
      if (!f!.contam) fail('err.nothingToTreat');
      f!.contam = null;
      f!.mycoTreat = 0;
      break;
    case 'telomerase':
      if (!LINES[f!.line].maxPassage || f!.immortal) fail('err.alreadyImmortal');
      f!.immortal = true;
      break;
  }
  s.inventory[key] -= 1;
  bump(s, 'passes');
  return m(`ok.pass.${id}`);
}

// ---------------------------------------------------------------- minijogos

export function gamePlaysToday(s: GameState, id: GameId) {
  const day = Math.floor(s.time / 24);
  return s.gamePlays.day === day ? (s.gamePlays.counts[id] ?? 0) : 0;
}

/** Moedas que uma pontuação rende agora (considera o limite e as jogadas do dia). */
export function gameCoins(s: GameState, id: GameId, score: number) {
  const g = GAMES.find((x) => x.id === id)!;
  return Math.round(Math.min(g.cap, Math.max(0, score) * g.rate) * gameMult(gamePlaysToday(s, id)) * diff(s).games);
}

export function rewardGame(s: GameState, id: GameId, score: number): Msg {
  const coins = gameCoins(s, id, score);
  const day = Math.floor(s.time / 24);
  if (s.gamePlays.day !== day) s.gamePlays = { day, counts: {} };
  const plays = s.gamePlays.counts[id] ?? 0;
  s.gamePlays.counts[id] = plays + 1;
  s.bestScores[id] = Math.max(s.bestScores[id] ?? 0, score);
  s.money += coins;
  bump(s, 'games');
  addXp(s, Math.min(10, Math.round(coins / 10)));
  return m('ok.gameReward', { coins });
}

// ---------------------------------------------------------------- dificuldade e meio feito na bancada

export function setDifficulty(s: GameState, d: Difficulty): Msg {
  s.difficulty = d;
  return m('ok.difficulty', { d: `@difficulty.${d}` });
}

/** Taxa para preparar 500 mL de meio completo: metade do valor de comprar meio + SFB. */
export function mixFee(s: GameState, medium: MediumId) {
  const M = MEDIA[medium];
  const basal = MIX_VOLUME * (1 - M.serum) * (M.price / 500);
  const fbs = MIX_VOLUME * M.serum * (90 / 50);
  return Math.round((basal + fbs) * 0.5 * diff(s).price);
}

/** Resultado do minijogo "Preparar meio": quanto mais preciso, mais meio aproveitável. */
export function mixMedium(s: GameState, medium: MediumId, accuracy: number): Msg {
  const fee = mixFee(s, medium);
  if (s.money < fee) fail('err.noMoney');
  s.money -= fee;
  bump(s, 'games');
  if (accuracy < 0.5) {
    log(s, 'log.mixFailed', { medium: `@medium.${medium}` }, 'warn');
    return m('ok.mixFailed');
  }
  const ml = accuracy >= 0.95 ? MIX_VOLUME : Math.round(MIX_VOLUME * accuracy);
  s.inventory[`cmed_${medium}`] = have(s, `cmed_${medium}`) + ml;
  addXp(s, Math.round(accuracy * 10));
  return m('ok.mixed', { ml, medium: `@medium.${medium}` });
}
