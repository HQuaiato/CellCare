import { LINES, levelOf } from './data';
import { confluence, flaskMood } from './sim';
import type { GameState } from './types';

/**
 * Lições: pop-ups curtos que ensinam cada etapa na primeira vez que ela aparece no jogo.
 * Texto em lesson.<id>.title / lesson.<id>.body. Lições sem gatilho são disparadas pela interface
 * (abrir uma aba ou um modal).
 */
export interface Lesson {
  id: string;
  icon: string;
  when?: (s: GameState) => boolean;
}

const anyFlask = (s: GameState, fn: (f: GameState['flasks'][number]) => boolean) => s.flasks.some(fn);

export const LESSONS: Lesson[] = [
  { id: 'welcome', icon: '👋', when: () => true },
  { id: 'care', icon: '🧫', when: (s) => s.time > 8.2 },
  { id: 'medium', icon: '🍽️', when: (s) => anyFlask(s, (f) => f.glucose < 6 || f.lactate > 10 || ['hungry', 'acid', 'toxic'].includes(flaskMood(f))) },
  { id: 'co2', icon: '🌡️', when: (s) => s.co2Tank < 40 || anyFlask(s, (f) => f.pH > 7.78) },
  { id: 'passage', icon: '✂️', when: (s) => anyFlask(s, (f) => confluence(f) > 0.7) },
  { id: 'suspension', icon: '🔢', when: (s) => !!s.suspension },
  { id: 'freeze', icon: '❄️', when: (s) => (s.stats.frozen ?? 0) > 0 || s.vials.length > 0 },
  { id: 'sell', icon: '💰', when: (s) => (s.stats.sold ?? 0) > 0 },
  { id: 'protection', icon: '🛡️', when: (s) => s.settings.penstrep || levelOf(s.xp) >= 2 },
  { id: 'bacteria', icon: '🦠', when: (s) => anyFlask(s, (f) => f.contam?.type === 'bacteria' && f.contam.detected) },
  { id: 'fungus', icon: '🍄', when: (s) => anyFlask(s, (f) => f.contam?.type === 'fungus' && f.contam.detected) },
  { id: 'mycoplasma', icon: '🟣', when: (s) => levelOf(s.xp) >= 4 || anyFlask(s, (f) => f.contam?.type === 'mycoplasma' && f.contam.detected) },
  { id: 'transduction', icon: '🧬', when: (s) => levelOf(s.xp) >= 2 },
  { id: 'markers', icon: '✨', when: (s) => anyFlask(s, (f) => f.markers.length > 0) },
  { id: 'experiment', icon: '🧪', when: (s) => (s.stats.experiments ?? 0) > 0 },
  { id: 'paper', icon: '📄', when: (s) => (s.stats.papers ?? 0) > 0 },
  { id: 'senescence', icon: '⏳', when: (s) => anyFlask(s, (f) => !!LINES[f.line].maxPassage) },
  { id: 'scope', icon: '🔬', when: (s) => s.equipment.scope > 0 },
  { id: 'fixation', icon: '🧫', when: (s) => s.equipment.scope > 0 && levelOf(s.xp) >= 2 },
  { id: 'assays', icon: '💻', when: (s) => levelOf(s.xp) >= 3 || !!s.equipment.computer },
  { id: 'shop', icon: '🛒' },
  { id: 'freezer', icon: '🧊' },
  { id: 'games', icon: '🎮' },
  { id: 'passes', icon: '⚡' },
  { id: 'research', icon: '📊' },
];

export function queueLesson(s: GameState, id: string, force = false) {
  if (!force && (s.lessons[id] || !s.settings.tips)) return;
  if (!s.lessonQueue.includes(id)) s.lessonQueue.push(id);
}

/** Roda a cada tick/ação: enfileira as lições cujo gatilho acabou de acontecer. */
export function checkLessons(s: GameState) {
  if (!s.settings.tips) return;
  for (const l of LESSONS) if (l.when && !s.lessons[l.id] && l.when(s)) queueLesson(s, l.id);
}

export function seeLesson(s: GameState, id: string) {
  s.lessons[id] = 1;
  s.lessonQueue = s.lessonQueue.filter((x) => x !== id);
}
