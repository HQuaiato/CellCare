/**
 * Backend de save. Hoje é local (localStorage); depois basta criar um backend
 * Supabase com a mesma interface para ter login e save na nuvem.
 */
export interface SaveBackend {
  load(profile: string): unknown;
  save(profile: string, state: unknown): void;
  list(): string[];
  remove(profile: string): void;
}

const PREFIX = 'cellcare:save:';

export const localBackend: SaveBackend = {
  load(profile) {
    try {
      const raw = localStorage.getItem(PREFIX + profile);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(profile, state) {
    try {
      localStorage.setItem(PREFIX + profile, JSON.stringify(state));
    } catch {
      /* armazenamento indisponível (aba anônima etc.) */
    }
  },
  list() {
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .map((k) => k.slice(PREFIX.length));
    } catch {
      return [];
    }
  },
  remove(profile) {
    try {
      localStorage.removeItem(PREFIX + profile);
    } catch {
      /* ignore */
    }
  },
};

const LAST = 'cellcare:last';
export const lastProfile = {
  get: () => {
    try {
      return localStorage.getItem(LAST);
    } catch {
      return null;
    }
  },
  set: (p: string | null) => {
    try {
      if (p) localStorage.setItem(LAST, p);
      else localStorage.removeItem(LAST);
    } catch {
      /* ignore */
    }
  },
};
