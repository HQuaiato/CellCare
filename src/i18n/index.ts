import { useSyncExternalStore } from 'react';
import en from './en';
import es from './es';
import pt from './pt';

export type Lang = 'pt' | 'en' | 'es';
export type Theme = 'lavender' | 'blue';
export type Params = Record<string, string | number>;

const DICTS: Record<Lang, Record<string, string>> = { pt, en, es };
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
];
export const THEMES: Theme[] = ['lavender', 'blue'];

interface Prefs {
  lang: Lang;
  theme: Theme;
}

const KEY = 'cellcare:prefs';

function detectLang(): Lang {
  const n = (typeof navigator !== 'undefined' ? navigator.language : 'pt').slice(0, 2);
  return n === 'en' ? 'en' : n === 'es' ? 'es' : 'pt';
}

function load(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { lang: p.lang in DICTS ? p.lang : detectLang(), theme: THEMES.includes(p.theme) ? p.theme : 'lavender' };
  } catch {
    return { lang: detectLang(), theme: 'lavender' };
  }
}

let prefs = load();
const listeners = new Set<() => void>();

function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale();
  document.documentElement.dataset.theme = prefs.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', prefs.theme === 'blue' ? '#2563eb' : '#7c5cff');
}
apply();

export function setPrefs(p: Partial<Prefs>) {
  prefs = { ...prefs, ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
  apply();
  listeners.forEach((l) => l());
}

export function usePrefs() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => prefs,
  );
}

export function locale() {
  return { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[prefs.lang];
}

export function fmtN(n: number, digits = 1) {
  return n.toLocaleString(locale(), { maximumFractionDigits: digits });
}

function resolve(v: string | number): string {
  if (typeof v === 'number') return fmtN(v);
  if (!v.startsWith('@') && !v.includes('|')) return v;
  return v
    .split('|')
    .map((part) => (part.startsWith('@') ? t(part.slice(1)) : part))
    .join(', ');
}

/**
 * Traduz uma chave. Parâmetros {nome} são interpolados; números saem formatados no idioma,
 * e textos que começam com "@" são outras chaves (listas separadas por "|").
 */
export function t(k: string, p?: Params): string {
  let s = DICTS[prefs.lang][k] ?? pt[k as keyof typeof pt] ?? k;
  if (p) s = s.replace(/\{(\w+)\}/g, (_, name: string) => (p[name] === undefined ? '' : resolve(p[name])));
  return s;
}

export const tm = (msg: { k: string; p?: Params }) => t(msg.k, msg.p);
