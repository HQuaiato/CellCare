import type { ReactNode } from 'react';
import { useToasts } from '../game/store';

export const fmtMoney = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR');

export function fmtCells(n: number) {
  if (n >= 1e6) return (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: n >= 1e7 ? 0 : 1 }) + ' mi';
  if (n >= 1e3) return Math.round(n / 1e3).toLocaleString('pt-BR') + ' mil';
  return Math.round(n).toString();
}

export const fmtNum = (n: number, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });
export const pct = (x: number) => Math.round(x * 100) + '%';

const pad = (n: number) => String(n).padStart(2, '0');
export function fmtClock(h: number) {
  const day = Math.floor(h / 24) + 1;
  return `Dia ${day} · ${pad(Math.floor(h % 24))}:${pad(Math.floor((h * 60) % 60))}`;
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

export function Bar({ label, value, fill, tone }: { label: string; value: string; fill: number; tone: Tone }) {
  return (
    <div className="bar">
      <div className="bar-head">
        <span>{label}</span>
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
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
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
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.msg}
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
