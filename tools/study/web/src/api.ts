export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được server. Kiểm tra mạng, hoặc chạy lại `npm run serve` trong tools/study nếu đang dùng bản local.');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401 && url !== '/api/login') window.dispatchEvent(new Event('study:unauthorized'));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Lỗi ${res.status}`);
  return data as T;
}

export const get = <T,>(url: string) => api<T>('GET', url);
export const post = <T,>(url: string, body: unknown) => api<T>('POST', url, body);
export const put = <T,>(url: string, body: unknown) => api<T>('PUT', url, body);

export interface Week {
  n: number;
  start: string;
  end: string;
  s: string;
  f: string;
  a: string;
  d: string;
  t7: string;
  checkpoint: boolean;
  apply: boolean;
  light: boolean;
}

export type Strand = 'S' | 'F' | 'A' | 'D' | 'T7' | 'EN' | 'REV';

export interface PlanItem {
  slot: string;
  strand: Strand;
  minutes: number;
  title: string;
  detail?: string;
  done: boolean;
}

export interface AreaRow {
  area: string;
  total: number;
  due: number;
  retention: number | null;
  quizAvg: number | null;
}

export interface WeakCard {
  id: string;
  q: string;
  area: string;
  file: string;
  lapses: number;
}

export interface BacklogItem extends Omit<PlanItem, 'done'> {
  date: string;
  week: number;
  done?: boolean;
}

export interface Today {
  date: string;
  week: Week | null;
  totalWeeks: number;
  phase: 'before' | 'active' | 'after';
  plan: PlanItem[];
  backlog: BacklogItem[];
  queueCount: number;
  stats: { streak: number; retention30: number | null; total: number };
  areas: AreaRow[];
  last7: { day: string; count: number }[];
  weak: WeakCard[];
  weekMinutes: { done: number; total: number };
}

export interface QueueCard {
  id: string;
  q: string;
  a: string;
  area: string;
  file: string;
  isNew: boolean;
  intervals: Record<1 | 2 | 3 | 4, number>;
}

export interface NoteMeta {
  path: string;
  area: string;
  title: string;
  summary: string;
  updated: string;
  cards: number;
  due: number;
}

export interface NoteCard {
  id: string;
  q: string;
  a: string;
  due: boolean;
  isNew: boolean;
  next: string | null;
  lapses: number;
}

export interface NoteDetail {
  path: string;
  area: string;
  title: string;
  content: string;
  updated: string;
  cards: NoteCard[];
}

export interface Proposal {
  q: string;
  a: string;
}

export interface QuizQuestion {
  q: string;
  keyPoints: string[];
}

export interface Grade {
  score: number;
  covered: string[];
  missing: string[];
  wrong: string[];
  feedback: string;
  modelAnswer: string;
}

export interface Progress {
  date: string;
  stats: { total: number; reviews30: number; retention30: number | null; streak: number; newCards: number; dueToday: number; orphans: number };
  weeks: Pick<Week, 'n' | 'start' | 'end' | 'checkpoint' | 'apply' | 'light'>[];
  currentWeek: number | null;
  areas: AreaRow[];
  hardest: WeakCard[];
  heatmap: { day: string; count: number }[];
  quiz: { count30: number; avg30: number | null };
  weekMinutes: { done: number; total: number };
}
