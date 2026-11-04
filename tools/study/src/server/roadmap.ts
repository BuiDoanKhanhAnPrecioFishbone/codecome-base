import { existsSync, readFileSync } from 'node:fs';

export type Strand = 'S' | 'F' | 'A' | 'D' | 'O' | 'T7' | 'EN' | 'REV';

export interface Week {
  n: number;
  start: string;
  end: string;
  /** Optimizely certification track; empty once the exam window is over. */
  o: string;
  s: string;
  f: string;
  a: string;
  d: string;
  t7: string;
  checkpoint: boolean;
  apply: boolean;
  light: boolean;
}

export interface PlanItem {
  slot: string;
  strand: Strand;
  minutes: number;
  title: string;
  detail?: string;
}

/** Roadmap week 1 starts on this Monday (local time). */
export const ROADMAP_START = '2026-10-26';

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDayKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number): string {
  const d = parseDayKey(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

const clean = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').trim();

/** Short headline for a long roadmap cell: the part before the first colon, else a truncation. */
export function shortTopic(text: string, max = 60): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const head = t.split(/[:;]/)[0].trim();
  if (head.length >= 8 && head.length <= max) return head;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Reads the weekly table (`| n | dates | O | S | F | A | D | T7 |`) from ROADMAP.md. */
export function parseRoadmap(markdown: string, start: string = ROADMAP_START): Week[] {
  const weeks: Week[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 8 || !/^\d+$/.test(cells[0])) continue;
    const n = Number(cells[0]);
    const [, , o, s, f, a, d, t7] = cells;
    weeks.push({
      n,
      start: addDays(start, (n - 1) * 7),
      end: addDays(start, (n - 1) * 7 + 6),
      o: /^[—–-]*$/.test(o) ? '' : clean(o),
      s: clean(s),
      f: clean(f),
      a: clean(a),
      d: clean(d),
      t7: clean(t7),
      checkpoint: /checkpoint/i.test(t7),
      apply: /nộp đơn/i.test(t7),
      light: /nghỉ tết/i.test(s),
    });
  }
  return weeks;
}

export function loadRoadmap(file: string): Week[] {
  return existsSync(file) ? parseRoadmap(readFileSync(file, 'utf8')) : [];
}

export function weekOf(weeks: Week[], key: string): Week | null {
  return weeks.find((w) => key >= w.start && key <= w.end) ?? null;
}

const ENGLISH: PlanItem[] = [
  { slot: 'en1', strand: 'EN', minutes: 20, title: "English: nghe BBC 6 Minute + shadowing 5'" },
  { slot: 'en2', strand: 'EN', minutes: 20, title: 'English: trả lời 1 câu phỏng vấn trong 2 phút, ghi âm' },
  { slot: 'en3', strand: 'EN', minutes: 20, title: 'English: đọc 1 bài kỹ thuật, viết note ngày bằng tiếng Anh' },
];

const review = (minutes: number, title: string): PlanItem => ({ slot: 'rev', strand: 'REV', minutes, title });

/** Daily schedule from ROADMAP.md: Mon D+S, Tue F, Wed D+S, Thu A, Fri D+F, Sat project/lab, Sun review; plus the Optimizely hour while the cert track is active. Sprint weeks drop S/F/A/D and give the whole tech time to Optimizely. */
export function planFor(week: Week | null, key: string): PlanItem[] {
  const dow = parseDayKey(key).getDay();
  const sunday = dow === 0;
  if (week && /^Sprint/i.test(week.o)) {
    if (sunday) return [review(10, 'Ôn thẻ đến hạn'), optimizely(45, `Optimizely: ôn sổ lỗi + chuẩn bị tuần sau`, 'o', week.o)];
    return [
      review(10, 'Ôn thẻ đến hạn'),
      optimizely(90, `Optimizely: học ${shortTopic(week.o)}`, 'o1', 'Đọc bài học O của tuần + docs nguồn; ghi sổ lỗi'),
      optimizely(90, 'Optimizely: luyện đề trong Exam Lab', 'o2', 'Tạo câu hỏi, luyện theo domain, thi thử bấm giờ (/opti)'),
      ...ENGLISH,
    ];
  }
  const items = coreDay(week, key);
  if (!week?.o) return items;
  const o = optimizely(
    sunday ? 30 : 60,
    sunday ? `Optimizely: ôn lại + quiz tuần (${shortTopic(week.o, 40)})` : `Optimizely: ${shortTopic(week.o)}`,
    'o',
    'Luyện đề trong Exam Lab (/opti) + vá domain yếu',
  );
  const at = items.findIndex((i) => i.strand === 'EN');
  items.splice(at === -1 ? items.length : at, 0, o);
  return items;
}

const optimizely = (minutes: number, title: string, slot: string, detail?: string): PlanItem => ({
  slot,
  strand: 'O',
  minutes,
  title,
  ...(detail ? { detail } : {}),
});

function coreDay(week: Week | null, key: string): PlanItem[] {
  const dow = parseDayKey(key).getDay();
  const w = week
    ? { s: shortTopic(week.s), f: shortTopic(week.f), a: shortTopic(week.a), d: shortTopic(week.d), t7: shortTopic(week.t7, 80) }
    : { s: '', f: '', a: '', d: '', t7: '' };
  switch (dow) {
    case 1:
      return [
        review(10, 'Ôn thẻ đến hạn'),
        { slot: 'd', strand: 'D', minutes: 45, title: `DSA: ${w.d}` },
        { slot: 's', strand: 'S', minutes: 75, title: `Đọc/xem: ${w.s}` },
        ...ENGLISH,
      ];
    case 2:
      return [
        review(10, 'Ôn thẻ đến hạn'),
        { slot: 'f1', strand: 'F', minutes: 45, title: `Lý thuyết: ${w.f}` },
        { slot: 'f2', strand: 'F', minutes: 75, title: `Lab: ${w.f}`, detail: 'Viết note vào notes/frontend/' },
        ...ENGLISH,
      ];
    case 3:
      return [
        review(10, 'Ôn thẻ đến hạn'),
        { slot: 'd', strand: 'D', minutes: 45, title: `DSA: ${w.d}` },
        { slot: 's', strand: 'S', minutes: 75, title: `Lab hoặc viết note/vẽ thiết kế: ${w.s}` },
        ...ENGLISH,
      ];
    case 4:
      return [
        review(10, 'Ôn thẻ đến hạn'),
        { slot: 'a1', strand: 'A', minutes: 45, title: `Lý thuyết: ${w.a}` },
        { slot: 'a2', strand: 'A', minutes: 75, title: `Lab: ${w.a}` },
        ...ENGLISH,
      ];
    case 5:
      return [
        review(10, 'Ôn thẻ đến hạn'),
        { slot: 'd', strand: 'D', minutes: 45, title: `DSA: ${w.d} (bài mới hoặc bài sai 2 tuần trước)` },
        { slot: 'f', strand: 'F', minutes: 75, title: `Frontend: ${w.f}` },
        ...ENGLISH,
      ];
    case 6:
      return [
        review(10, 'Ôn thẻ đến hạn'),
        { slot: 't7', strand: 'T7', minutes: 120, title: w.t7 || 'Project hoặc lab' },
        ...ENGLISH,
      ];
    default:
      return [review(30, 'Ôn thẻ + review tuần (nghỉ phần còn lại)')];
  }
}
