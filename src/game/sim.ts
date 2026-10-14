import { CONTAM, FLASKS, LINES, MEDIA, STIPEND, SUSPENSION_MAX_DENSITY, levelOf } from './data';
import { log } from './econ';
import { resolveExperiment } from './research';
import type { Flask, GameState, MediumId, Mood } from './types';

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const LN2 = Math.log(2);

export function capacity(f: Pick<Flask, 'line' | 'type'>) {
  const L = LINES[f.line];
  const spec = FLASKS[f.type];
  return L.suspension ? spec.vol * SUSPENSION_MAX_DENSITY : spec.cap * L.size;
}
export const confluence = (f: Flask) => f.live / capacity(f);
export const viability = (f: { live: number; dead: number }) =>
  f.live + f.dead > 0 ? f.live / (f.live + f.dead) : 0;

export function co2Of(s: GameState, f: Flask) {
  const inc = s.incubators.find((i) => i.id === f.incubatorId);
  if (!inc || s.co2Tank <= 0) return 0.04;
  return inc.co2Set;
}

/**
 * Henderson–Hasselbalch: pH = 6,1 + log([HCO3-] / (0,0307 · pCO2)).
 * O ácido lático consome bicarbonato, então o meio acidifica conforme as células trabalham.
 */
export function eqPH(medium: MediumId, lactate: number, co2: number) {
  const pco2 = Math.max(co2, 0.04) * 7.13;
  const hco3 = Math.max(0.3, MEDIA[medium].hco3 - 1.2 * lactate);
  return clamp(6.1 + Math.log10(hco3 / (0.0307 * pco2)), 6.0, 8.6);
}

export function phFactor(pH: number) {
  if (pH >= 7.2 && pH <= 7.6) return 1;
  const d = pH < 7.2 ? 7.2 - pH : pH - 7.6;
  return Math.exp(-((d / 0.25) ** 2));
}

export const isMyco = (f: { contam: Flask['contam'] }) => f.contam?.type === 'mycoplasma';

function stepFlask(s: GameState, f: Flask, dt: number) {
  const L = LINES[f.line];
  const vol = FLASKS[f.type].vol;
  const K = capacity(f);
  const c = f.contam;

  f.pH += (eqPH(f.medium, f.lactate, co2Of(s, f)) - f.pH) * Math.min(1, dt / 1.5);
  const conf = f.live / K;

  let g = LN2 / L.td;
  g *= f.glucose / (f.glucose + 0.8);
  g *= phFactor(f.pH);
  g *= 1 / (1 + (f.lactate / 25) ** 2);
  if (f.medium !== L.medium) g *= 0.55;
  g *= Math.max(0, 1 - conf ** 3);
  if (f.transduction) g *= 0.4;
  if (f.mycoTreat > 0) g *= 0.6;
  if (f.afx) g *= 0.93; // anfotericina é um pouco tóxica
  if (L.maxPassage && f.passage > L.maxPassage) g *= 0.08;
  if (c?.type === 'mycoplasma') g *= 1 - 0.35 * c.level;

  let d = 0.002;
  if (f.glucose < 0.5) d += (0.04 * (0.5 - f.glucose)) / 0.5;
  if (f.lactate > 20) d += (0.006 * (f.lactate - 20)) / 5;
  if (f.ammonia > 3) d += 0.01 * (f.ammonia - 3);
  if (f.pH < 7.0) d += (0.015 * (7.0 - f.pH)) / 0.1;
  if (f.pH > 7.8) d += (0.012 * (f.pH - 7.8)) / 0.1;
  if (conf > 0.95) d += (0.02 * (conf - 0.95)) / 0.05;
  if (c?.type === 'bacteria') d += 0.15 * c.level;
  if (c?.type === 'fungus') d += 0.06 * c.level;
  d *= L.sens;

  const born = f.live * g * dt;
  const died = f.live * Math.min(1, d * dt);
  f.live = Math.max(0, f.live + born - died);
  f.dead = f.dead * (1 - 0.01 * dt) + died;

  const uptake = L.glcRate * (f.live / 1e6) * dt * (f.glucose / (f.glucose + 1));
  f.glucose = Math.max(0, f.glucose - uptake / vol);
  f.lactate += (1.7 * uptake) / vol;
  f.ammonia += (0.05 * (f.live / 1e6) * dt) / vol + 0.004 * dt;

  if (c) {
    const def = CONTAM[c.type];
    const prot = (c.type === 'bacteria' && f.abx) || (c.type === 'fungus' && f.afx);
    c.level = Math.min(1, c.level + (prot ? def.growthProtected : def.growth) * dt);
    if (c.type === 'bacteria') {
      // bactérias consomem glicose e acidificam: meio turvo e amarelo
      f.glucose = Math.max(0, f.glucose - 1.0 * c.level * dt);
      f.lactate += 1.2 * c.level * dt;
    } else if (c.type === 'fungus') {
      f.glucose = Math.max(0, f.glucose - 0.4 * c.level * dt);
      f.ammonia += 0.05 * c.level * dt;
      const inc = s.incubators.find((i) => i.id === f.incubatorId);
      if (inc) inc.spores = Math.min(1, inc.spores + 0.02 * c.level * dt);
    }
    if (!c.detected && c.type !== 'mycoplasma' && c.level >= 0.15) {
      c.detected = true;
      log(s, 'log.contamFound', { flask: flaskName(f), type: `@contam.${c.type}` }, 'bad');
    }
  }

  if (f.mycoTreat > 0) {
    f.mycoTreat -= dt;
    if (f.mycoTreat <= 0) {
      f.mycoTreat = 0;
      if (isMyco(f) && Math.random() < 0.9) {
        f.contam = null;
        log(s, 'log.mycoCured', { flask: flaskName(f) }, 'good');
      } else if (isMyco(f)) {
        log(s, 'log.mycoPersists', { flask: flaskName(f) }, 'warn');
      } else {
        log(s, 'log.mycoTreatDone', { flask: flaskName(f) }, 'info');
      }
    }
  }

  if (f.transduction) {
    f.transduction.hoursLeft -= dt;
    if (f.transduction.hoursLeft <= 0) {
      const mk = f.transduction.marker;
      if (!f.markers.includes(mk)) f.markers.push(mk);
      f.transduction = null;
      log(s, 'log.transductionDone', { flask: flaskName(f), marker: mk }, 'good');
    }
  }
}

/** Esporos no ar contaminam vizinhos de estufa. */
function sporeSpread(s: GameState, dt: number) {
  if (levelOf(s.xp) < CONTAM.fungus.level) return;
  for (const inc of s.incubators) {
    if (inc.spores <= 0) continue;
    for (const f of s.flasks) {
      if (f.incubatorId !== inc.id || f.contam) continue;
      if (Math.random() < 0.002 * inc.spores * dt * (f.afx ? 0.2 : 1)) f.contam = { type: 'fungus', level: 0.02, detected: false };
    }
    inc.spores = Math.max(0, inc.spores - 0.01 * dt);
  }
}

export function flaskName(f: Flask) {
  return `${LINES[f.line].name} #${f.no}`;
}

export function flaskMood(f: Flask): Mood {
  const L = LINES[f.line];
  if (f.live < 5e3) return 'dead';
  const c = f.contam;
  if (c?.detected && c.type === 'bacteria') return 'bacteria';
  if (c?.detected && c.type === 'fungus') return 'fungus';
  const v = viability(f);
  if (v < 0.5) return 'dying';
  if (f.glucose < 1) return 'hungry';
  if (f.pH < 7.0) return 'acid';
  if (f.pH > 7.8) return 'alkaline';
  if (f.lactate > 20 || f.ammonia > 3) return 'toxic';
  if (confluence(f) > 0.9) return 'crowded';
  if (f.mycoTreat > 0) return 'treating';
  if (c?.detected && c.type === 'mycoplasma') return 'mycoplasma';
  if (f.transduction) return 'transducing';
  if (L.maxPassage && f.passage > L.maxPassage) return 'senescent';
  if (v < 0.8) return 'sick';
  if (confluence(f) < 0.12) return 'lonely';
  return 'happy';
}

const BAD_MOODS: Mood[] = ['hungry', 'acid', 'alkaline', 'toxic', 'crowded', 'dying', 'dead'];

export function advance(s: GameState, hours: number) {
  let remaining = hours;
  while (remaining > 1e-9) {
    const dt = Math.min(0.25, remaining);
    remaining -= dt;
    s.time += dt;

    for (const f of s.flasks) stepFlask(s, f, dt);
    sporeSpread(s, dt);

    if (s.suspension) {
      const lost = s.suspension.live * 0.03 * dt;
      s.suspension.live -= lost;
      s.suspension.dead += lost;
    }

    if (s.co2Tank > 0) {
      s.co2Tank = Math.max(0, s.co2Tank - 0.35 * s.incubators.length * dt);
      if (s.co2Tank < 20 && s.tankWarned < 1) {
        s.tankWarned = 1;
        log(s, 'log.co2Low', undefined, 'warn');
      }
      if (s.co2Tank === 0) {
        s.tankWarned = 2;
        log(s, 'log.co2Empty', undefined, 'bad');
      }
    }

    for (const k of Object.keys(s.demand)) s.demand[k] = Math.min(1, s.demand[k] + (0.15 / 24) * dt);

    const day = Math.floor(s.time / 24);
    if (day > s.lastStipendDay) {
      s.lastStipendDay = day;
      const amount = STIPEND(levelOf(s.xp));
      s.money += amount;
      log(s, 'log.stipend', { amount }, 'info');
    }

    const ready = s.experiments.filter((e) => e.readyAt <= s.time);
    if (ready.length) {
      s.experiments = s.experiments.filter((e) => e.readyAt > s.time);
      for (const e of ready) resolveExperiment(s, e);
    }
  }

  for (const f of s.flasks) {
    const md = flaskMood(f);
    if (md !== f.lastMood && BAD_MOODS.includes(md)) {
      log(s, 'log.moodAlert', { flask: flaskName(f), mood: `@mood.${md}` }, md === 'dead' || md === 'dying' ? 'bad' : 'warn');
    }
    f.lastMood = md;
  }
}
