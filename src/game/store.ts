import { useSyncExternalStore } from 'react';
import { GameError } from './actions';
import { OFFLINE_CAP_H } from './data';
import { log } from './econ';
import { SAVE_VERSION, newGame } from './newgame';
import { lastProfile, localBackend } from './save';
import { advance } from './sim';
import type { GameState } from './types';

type Listener = () => void;

let state: GameState | null = null;
const listeners = new Set<Listener>();
let timer: number | undefined;
let ticks = 0;
let lastSeenSeq = 0;
const backend = localBackend;

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// ---------------------------------------------------------------- toasts

export interface Toast {
  id: number;
  msg: string;
  kind: 'info' | 'good' | 'warn' | 'bad';
}
let toasts: Toast[] = [];
let toastId = 0;
const toastListeners = new Set<Listener>();

export function toast(msg: string, kind: Toast['kind'] = 'info') {
  const t = { id: ++toastId, msg, kind };
  toasts = [...toasts.slice(-3), t];
  toastListeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l());
  }, kind === 'bad' ? 5000 : 3500);
}
export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => {
        toastListeners.delete(l);
      };
    },
    () => toasts,
  );
}

function toastNewLogs() {
  if (!state) return;
  const fresh = state.log.filter((e) => e.seq > lastSeenSeq && e.kind !== 'info').reverse();
  lastSeenSeq = state.logSeq;
  fresh.slice(-3).forEach((e) => toast(e.msg, e.kind));
}

// ---------------------------------------------------------------- estado

export function useGameMaybe() {
  return useSyncExternalStore(subscribe, () => state);
}
export function useGame(): GameState {
  return useSyncExternalStore(subscribe, () => state!);
}

function persist() {
  if (state) backend.save(state.player, state);
}

/** Executa uma ação do jogo numa cópia do estado. Erros de jogo viram toast. */
export function act(fn: (s: GameState) => string | void, quiet = false): boolean {
  if (!state) return false;
  const draft = structuredClone(state);
  try {
    const msg = fn(draft);
    state = draft;
    toastNewLogs();
    emit();
    persist();
    if (msg && !quiet) toast(msg, 'good');
    return true;
  } catch (e) {
    if (e instanceof GameError) {
      toast(e.message, 'bad');
      return false;
    }
    throw e;
  }
}

function tick() {
  if (!state) return;
  const now = Date.now();
  const hours = Math.min(((now - state.lastReal) / 60000) * state.speed, OFFLINE_CAP_H);
  const draft = structuredClone(state);
  draft.lastReal = now;
  if (hours > 0) advance(draft, hours);
  state = draft;
  toastNewLogs();
  emit();
  if (++ticks % 10 === 0) persist();
}

export function login(profile: string) {
  const name = profile.trim().slice(0, 24);
  if (!name) return;
  let s = backend.load(name);
  if (!s || s.version !== SAVE_VERSION) s = newGame(name);
  else {
    const away = Math.min(((Date.now() - s.lastReal) / 60000) * s.speed, OFFLINE_CAP_H);
    if (away > 0.5) log(s, `⏳ Enquanto você esteve fora, passaram ${away.toFixed(1).replace('.', ',')} h no laboratório.`, 'info');
  }
  state = s;
  lastSeenSeq = s.logSeq;
  lastProfile.set(name);
  emit();
  window.clearInterval(timer);
  timer = window.setInterval(tick, 1000);
  tick();
}

export function logout() {
  persist();
  window.clearInterval(timer);
  state = null;
  lastProfile.set(null);
  emit();
}

export function resetGame() {
  if (!state) return;
  const name = state.player;
  backend.remove(name);
  login(name);
}

export function listProfiles() {
  return backend.list();
}

export function exportSave() {
  return state ? JSON.stringify(state, null, 2) : '';
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });
  window.addEventListener('beforeunload', persist);
}
