import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, get, type Today } from './api.ts';

export interface ApiState<T> {
  data?: T;
  error?: string;
  status?: number;
  loading: boolean;
  reload: () => void;
}

export function useApi<T>(url: string | null): ApiState<T> {
  const [state, setState] = useState<{ data?: T; error?: string; status?: number; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let live = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    get<T>(url).then(
      (data) => live && setState({ data, loading: false }),
      (e: unknown) => live && setState({ loading: false, error: msg(e), status: e instanceof ApiError ? e.status : 0 }),
    );
    return () => {
      live = false;
    };
  }, [url, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const AREA_TINT: Record<string, string> = {
  network: '#CDE6F7',
  devops: '#FFE0C4',
  database: '#CFEFE0',
  'system-design': '#CECDF2',
  ai: '#F8D3E0',
  dsa: '#FBEFB8',
  optimizely: '#D9E3FF',
  frontend: '#D4F0EA',
  architecture: '#FADBD0',
  interview: '#E3E5EE',
  english: '#FFE0C4',
};

export function Pill({ area, label }: { area: string; label?: string }) {
  return (
    <span className="pill" style={{ background: AREA_TINT[area] ?? '#E3E5EE' }}>
      {label ?? area}
    </span>
  );
}

export function ErrorBox({ error, status, onRetry }: { error: string; status?: number; onRetry?: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <p>{error}</p>
      {status !== 503 && onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Hero({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <section className={compact ? 'hero hero-compact' : 'hero'}>
      <div className="hero-in">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Loading({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <p className="muted mono" role="status">
      {label}
    </p>
  );
}

const WEEKDAY = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const parseDay = (k: string) => new Date(`${k}T00:00:00`);
export const weekdayLong = (k: string) => WEEKDAY[parseDay(k).getDay()];
export const weekdayShort = (k: string) => WEEKDAY_SHORT[parseDay(k).getDay()];
export const fmtDay = (k: string) => k.split('-').reverse().join('/');
export const fmtDM = (k: string) => `${Number(k.slice(8))}/${Number(k.slice(5, 7))}`;

export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} PHÚT`;
  return `${h}H ${String(m).padStart(2, '0')}`;
}

export const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

export function fmtInterval(days: number) {
  if (days < 1) return '<1 ngày';
  if (days < 30) return `${Math.round(days)} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${(days / 365).toFixed(1)} năm`;
}

export function noteLink(file: string) {
  return `/notes/${file.replace(/^notes[\\/]/, '').replace(/\\/g, '/')}`;
}

interface TodayCtx {
  today: ApiState<Today>;
}

const Ctx = createContext<TodayCtx | null>(null);
export const TodayProvider = Ctx.Provider;
export function useToday(): ApiState<Today> {
  const v = useContext(Ctx);
  if (!v) throw new Error('TodayProvider missing');
  return v.today;
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · amberjack`;
  }, [title]);
}
