import { AGENTS, CELLS_PER_VIAL, FLASKS, LINES, MARKERS, MEDIA, SHOP, levelOf } from './data';
import { VIAL_PREMIUM, addXp, log, sellCells } from './econ';
import { expKey } from './research';
import { capacity, confluence, eqPH, flaskName, viability } from './sim';
import type { AgentId, Flask, FlaskType, GameState, LineId, MarkerId, MediumId, Readout } from './types';

export class GameError extends Error {}
const fail = (msg: string): never => {
  throw new GameError(msg);
};

export const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');

const INV_LABEL: Record<string, string> = {
  FBS: 'SFB',
  trypsin: 'tripsina',
  PBS: 'PBS',
  DMSO: 'DMSO',
  cryovial: 'criotubos',
  MTT: 'kit MTT',
  flask_T25: 'frascos T25',
  flask_T75: 'frascos T75',
  flask_T175: 'frascos T175',
};
export function invLabel(key: string) {
  if (key.startsWith('med_')) return MEDIA[key.slice(4) as MediumId].name;
  if (key.startsWith('drug_')) return AGENTS[key.slice(5) as AgentId].name;
  if (key.startsWith('virus_')) return `lentivírus ${MARKERS[key.slice(6) as MarkerId].name}`;
  return INV_LABEL[key] ?? key;
}

export const have = (s: GameState, key: string) => s.inventory[key] ?? 0;

/** Verifica todos os insumos de uma vez e só então consome. */
function spend(s: GameState, needs: Record<string, number>) {
  for (const [k, v] of Object.entries(needs)) {
    if (v > 0 && have(s, k) < v - 1e-9)
      fail(`Falta ${invLabel(k)}: precisa ${fmt(v)}, tem ${fmt(have(s, k))}. Compre na loja.`);
  }
  for (const [k, v] of Object.entries(needs)) s.inventory[k] = have(s, k) - v;
}

/** Meio completo: 90% meio basal + 10% SFB (exceto meios sem soro). */
export function mediumNeeds(medium: MediumId, vol: number): Record<string, number> {
  return MEDIA[medium].serum ? { [`med_${medium}`]: vol * 0.9, FBS: vol * 0.1 } : { [`med_${medium}`]: vol };
}

export function freeSlots(s: GameState) {
  return s.incubators.reduce((n, i) => n + i.capacity, 0) - s.flasks.length;
}

function incubatorWithSpace(s: GameState) {
  const inc = s.incubators.find((i) => s.flasks.filter((f) => f.incubatorId === i.id).length < i.capacity);
  return inc ?? fail('Sem espaço nas estufas! Venda, congele ou compre outra estufa.');
}

function getFlask(s: GameState, id: string) {
  return s.flasks.find((f) => f.id === id) ?? fail('Frasco não encontrado.');
}

function maybeContaminate(s: GameState, f: Flask, p: number) {
  if (Math.random() < p * LINES[f.line].sens) {
    f.contaminated = true;
    log(s, `🦠 Ops... ${flaskName(f)} foi contaminado durante a manipulação.`, 'bad');
  }
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
    contaminated: false,
    transduction: null,
    seed: Math.floor(Math.random() * 1e9),
    bornAt: s.time,
    lastMood: 'happy',
  };
  s.flasks.push(f);
  s.selectedFlaskId = f.id;
  return f;
}

// ---------------------------------------------------------------- cultivo

export function feed(s: GameState, id: string) {
  const f = getFlask(s, id);
  if (f.live < 5e3) fail('Esse frasco não tem mais células vivas. Descarte.');
  const vol = FLASKS[f.type].vol;
  spend(s, mediumNeeds(f.medium, vol));
  f.glucose = MEDIA[f.medium].glc;
  f.lactate = 0;
  f.ammonia = 0;
  f.dead *= LINES[f.line].suspension ? 0.6 : 0.15; // aderentes: as mortas saem com o meio
  maybeContaminate(s, f, 0.003);
  addXp(s, 2);
  return `Meio trocado em ${flaskName(f)} 🍽️`;
}

export function passage(s: GameState, id: string) {
  const f = getFlask(s, id);
  if (s.suspension) fail('Termine de distribuir a suspensão atual primeiro.');
  if (f.live < 5e4) fail('Poucas células vivas para repicar.');
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
  };
  if (f.contaminated) {
    s.suspension.dead += s.suspension.live * 0.5;
    s.suspension.live *= 0.5;
  }
  s.flasks = s.flasks.filter((x) => x.id !== id);
  s.selectedFlaskId = s.flasks[0]?.id ?? null;
  addXp(s, 5);
  return L.suspension ? 'Células centrifugadas e ressuspendidas.' : 'Tripsinizado! Agora distribua a suspensão.';
}

export function recommendedSeed(line: LineId, type: FlaskType) {
  return capacity({ line, type }) * 0.2;
}

export function seed(s: GameState, type: FlaskType, millions: number) {
  const sus = s.suspension ?? fail('Não há suspensão celular.');
  const cells = millions * 1e6;
  if (cells <= 0) fail('Escolha quantas células semear.');
  if (cells > sus.live + 1) fail('Não há células vivas suficientes na suspensão.');
  incubatorWithSpace(s);
  spend(s, { [`flask_${type}`]: 1, ...mediumNeeds(LINES[sus.line].medium, FLASKS[type].vol) });
  const frac = cells / sus.live;
  const deadCarry = sus.dead * frac;
  sus.live -= cells;
  sus.dead -= deadCarry;
  const f = createFlask(s, sus.line, type, cells, deadCarry, sus.passage + 1, sus.markers);
  maybeContaminate(s, f, 0.005);
  if (sus.live < 1e4) s.suspension = null;
  return `${flaskName(f)} semeado (P${f.passage}) 🧫`;
}

export function freeze(s: GameState, n: number) {
  const sus = s.suspension ?? fail('Não há suspensão celular.');
  if (n < 1) fail('Escolha quantos criotubos congelar.');
  if (n * CELLS_PER_VIAL > sus.live + 1) fail(`Cada criotubo leva 10⁶ células vivas.`);
  // meio de congelamento: 90% SFB + 10% DMSO, 1 mL por criotubo
  spend(s, { cryovial: n, FBS: 0.9 * n, DMSO: 0.1 * n });
  const v = viability(sus);
  for (let i = 0; i < n; i++) {
    s.vials.push({ id: uid(), line: sus.line, markers: [...sus.markers], passage: sus.passage + 1, viability: v, frozenAt: s.time });
  }
  const frac = (n * CELLS_PER_VIAL) / sus.live;
  sus.dead -= sus.dead * frac;
  sus.live -= n * CELLS_PER_VIAL;
  if (sus.live < 1e4) s.suspension = null;
  addXp(s, 2 * n);
  return `${n} criotubo(s) no freezer ❄️`;
}

export function sellSuspension(s: GameState) {
  const sus = s.suspension ?? fail('Não há suspensão celular.');
  const total = sellCells(s, sus.line, sus.markers, sus.live / 1e6, viability(sus), sus.passage);
  s.suspension = null;
  return `Vendido por R$ ${Math.round(total).toLocaleString('pt-BR')} 💰`;
}

export function discardSuspension(s: GameState) {
  s.suspension = null;
  return 'Suspensão descartada.';
}

export function discardFlask(s: GameState, id: string) {
  const f = getFlask(s, id);
  s.flasks = s.flasks.filter((x) => x.id !== id);
  s.selectedFlaskId = s.flasks[0]?.id ?? null;
  return `${flaskName(f)} foi para o lixo biológico (autoclave).`;
}

// ---------------------------------------------------------------- freezer

export function thaw(s: GameState, vialId: string, type: FlaskType) {
  const vial = s.vials.find((v) => v.id === vialId) ?? fail('Criotubo não encontrado.');
  incubatorWithSpace(s);
  spend(s, { [`flask_${type}`]: 1, ...mediumNeeds(LINES[vial.line].medium, FLASKS[type].vol) });
  const live = CELLS_PER_VIAL * vial.viability * 0.8;
  s.vials = s.vials.filter((v) => v.id !== vialId);
  const f = createFlask(s, vial.line, type, live, CELLS_PER_VIAL - live, vial.passage, vial.markers);
  maybeContaminate(s, f, 0.005);
  addXp(s, 3);
  return `${flaskName(f)} descongelado 🔥🧫`;
}

export function sellVial(s: GameState, vialId: string) {
  const vial = s.vials.find((v) => v.id === vialId) ?? fail('Criotubo não encontrado.');
  const total = sellCells(s, vial.line, vial.markers, CELLS_PER_VIAL / 1e6, vial.viability, vial.passage, VIAL_PREMIUM);
  s.vials = s.vials.filter((v) => v.id !== vialId);
  return `Criotubo vendido por R$ ${Math.round(total).toLocaleString('pt-BR')} 💰`;
}

// ---------------------------------------------------------------- loja e estufas

export function shopPrice(s: GameState, itemId: string) {
  const item = SHOP.find((i) => i.id === itemId)!;
  if (item.special === 'incubator') return item.price * s.incubators.length;
  return item.price;
}

export function buy(s: GameState, itemId: string) {
  const item = SHOP.find((i) => i.id === itemId) ?? fail('Item inexistente.');
  if (levelOf(s.xp) < item.level) fail(`Disponível no nível ${item.level}.`);
  const price = shopPrice(s, itemId);
  if (s.money < price) fail('Dinheiro insuficiente. Venda células ou publique artigos!');
  switch (item.special) {
    case 'co2':
      if (s.co2Tank > 95) fail('O cilindro já está cheio.');
      s.co2Tank = 100;
      s.tankWarned = 0;
      break;
    case 'incubator':
      s.incubators.push({ id: uid(), name: `Estufa ${s.incubators.length + 1}`, co2Set: 5, capacity: 6 });
      break;
    case 'fluo':
    case 'irradiator':
      if (s.equipment[item.special]) fail('Você já tem esse equipamento.');
      s.equipment[item.special] = true;
      break;
    case 'vial':
      s.vials.push({ id: uid(), line: item.line!, markers: [], passage: 5, viability: 0.95, frozenAt: s.time });
      break;
    default:
      s.inventory[item.inv!] = have(s, item.inv!) + item.qty!;
  }
  s.money -= price;
  return `Comprado: ${item.name}`;
}

export function setCO2(s: GameState, incId: string, value: number) {
  const inc = s.incubators.find((i) => i.id === incId) ?? fail('Estufa não encontrada.');
  inc.co2Set = Math.max(0, Math.min(10, value));
}

export function moveFlask(s: GameState, flaskId: string, incId: string) {
  const f = getFlask(s, flaskId);
  const inc = s.incubators.find((i) => i.id === incId) ?? fail('Estufa não encontrada.');
  if (s.flasks.filter((x) => x.incubatorId === inc.id).length >= inc.capacity) fail(`${inc.name} está cheia.`);
  f.incubatorId = inc.id;
}

// ---------------------------------------------------------------- transdução e experimentos

export const TRANSDUCTION_HOURS = 72;

export function startTransduction(s: GameState, flaskId: string, marker: MarkerId) {
  const f = getFlask(s, flaskId);
  if (f.transduction) fail('Esse frasco já está em transdução.');
  if (f.markers.includes(marker)) fail('Essas células já expressam esse marcador.');
  if (f.contaminated) fail('Não dá pra transduzir células contaminadas.');
  spend(s, { [`virus_${marker}`]: 1 });
  f.dead += f.live * 0.4; // puromicina elimina as não transduzidas
  f.live *= 0.6;
  f.transduction = { marker, hoursLeft: TRANSDUCTION_HOURS };
  addXp(s, 10);
  return `Lentivírus ${MARKERS[marker].name} adicionado. Seleção com puromicina por 3 dias.`;
}

export function experimentQuality(f: Flask) {
  if (f.contaminated) return 0;
  const L = LINES[f.line];
  const v = viability(f);
  const c = confluence(f);
  let q = 1;
  if (v < 0.9) q *= Math.max(0, Math.min(1, (v - 0.5) / 0.4));
  if (c < 0.3) q *= 0.3;
  else if (c < 0.5) q *= 0.75;
  else if (c > 0.95) q *= 0.6;
  if (f.medium !== L.medium) q *= 0.7;
  if (f.passage > 30) q *= 0.8;
  if (L.maxPassage && f.passage > L.maxPassage) q *= 0.5;
  return q;
}

export const experimentHours = (r: Readout) => (r === 'MTT' ? 48 : 24);

export function startExperiment(s: GameState, flaskId: string, agent: AgentId, readout: Readout) {
  const f = getFlask(s, flaskId);
  if (f.transduction) fail('Espere a seleção da transdução terminar.');
  const A = AGENTS[agent];
  if (levelOf(s.xp) < A.level) fail(`${A.name} libera no nível ${A.level}.`);
  if (A.needsIrradiator && !s.equipment.irradiator) fail('Precisa de um irradiador (loja → equipamentos).');
  if (readout !== 'MTT') {
    if (!s.equipment.fluo) fail('Precisa do microscópio de fluorescência.');
    if (!f.markers.includes(readout)) fail(`Essas células não expressam ${MARKERS[readout].name}.`);
  }
  const needs: Record<string, number> = {};
  if (!A.needsIrradiator) needs[`drug_${agent}`] = 1;
  if (readout === 'MTT') needs.MTT = 1;
  spend(s, needs);
  s.experiments.push({
    id: uid(),
    key: expKey(f.line, agent, readout),
    line: f.line,
    agent,
    readout,
    markers: [...f.markers],
    quality: experimentQuality(f),
    startedAt: s.time,
    readyAt: s.time + experimentHours(readout),
    flaskName: flaskName(f),
  });
  s.flasks = s.flasks.filter((x) => x.id !== flaskId);
  s.selectedFlaskId = s.flasks[0]?.id ?? null;
  addXp(s, 8);
  return `Experimento iniciado! Resultado em ${experimentHours(readout)} h. 🔬`;
}
