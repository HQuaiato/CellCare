import type { ReactNode } from 'react';
import { CURRENCY } from '../game/data';
import { useToasts } from '../game/store';
import { fmtN, t, tm } from '../i18n';

export const fmtMoney = (n: number) => `${CURRENCY} ${fmtN(Math.round(n), 0)}`;

export function fmtCells(n: number) {
  if (n >= 1e6) return `${fmtN(n / 1e6, n >= 1e7 ? 0 : 1)} ${t('unit.million')}`;
  if (n >= 1e3) return `${fmtN(Math.round(n / 1e3), 0)} ${t('unit.thousand')}`;
  return String(Math.round(n));
}

export const fmtNum = (n: number, d = 1) => fmtN(Math.round(n * 10 ** d) / 10 ** d, d);
export const pct = (x: number) => Math.round(x * 100) + '%';

const pad = (n: number) => String(n).padStart(2, '0');
export function fmtClock(h: number) {
  return `${t('ui.day', { d: Math.floor(h / 24) + 1 })} · ${pad(Math.floor(h % 24))}:${pad(Math.floor((h * 60) % 60))}`;
}
export function fmtDuration(h: number) {
  const m = Math.max(1, Math.round(h * 60));
  const d = Math.floor(m / 1440);
  const hh = Math.floor((m % 1440) / 60);
  if (d) return `${d}d ${hh}h`;
  if (hh) return `${hh}h ${pad(m % 60)}min`;
  return `${m} min`;
}

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

/** Botão ⓘ que abre uma explicação curta. */
export function Info({ k, p }: { k: string; p?: Record<string, string | number> }) {
  return (
    <details className="info-tip" onClick={(e) => e.stopPropagation()}>
      <summary aria-label={t('ui.whatIsThis')}>i</summary>
      <p>{t(k, p)}</p>
    </details>
  );
}

export function Bar({ label, value, fill, tone, help }: { label: string; value: string; fill: number; tone: Tone; help?: string }) {
  return (
    <div className="bar">
      <div className="bar-head">
        <span>
          {label} {help && <Info k={help} />}
        </span>
        <b>{value}</b>
      </div>
      <div className="bar-track">
        <div className={`bar-fill tone-${tone}`} style={{ width: `${Math.max(2, Math.min(100, fill * 100))}%` }} />
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label={t('ui.close')}>
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts">
      {toasts.map((x) => (
        <div key={x.id} className={`toast toast-${x.kind}`}>
          {tm(x.msg)}
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
