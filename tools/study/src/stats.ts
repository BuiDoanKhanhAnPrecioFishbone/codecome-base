import { State } from 'ts-fsrs';
import { endOfLocalDay, isDue, startOfLocalDay } from './queue.ts';
import type { ReviewEntry, StoredCard } from './store.ts';

export interface Stats {
  total: number;
  orphans: number;
  newCards: number;
  dueToday: number;
  byArea: { area: string; total: number; due: number }[];
  reviews30: number;
  retention30: number | null;
  streak: number;
  last7: { day: string; count: number }[];
  hardest: { q: string; lapses: number; area: string }[];
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function computeStats(cards: StoredCard[], reviews: ReviewEntry[], now: Date): Stats {
  const live = cards.filter((c) => !c.orphan);
  const areas = new Map<string, { total: number; due: number }>();
  for (const c of live) {
    const a = areas.get(c.area) ?? { total: 0, due: 0 };
    a.total++;
    if (isDue(c, now)) a.due++;
    areas.set(c.area, a);
  }

  const since = new Date(startOfLocalDay(now).getTime() - 29 * 86_400_000);
  const recent = reviews.filter((r) => new Date(r.ts) >= since);
  const mature = recent.filter((r) => r.stateBefore === State.Review);
  const retention30 = mature.length >= 10 ? mature.filter((r) => r.rating >= 2).length / mature.length : null;

  const perDay = new Map<string, number>();
  for (const r of reviews) {
    const k = dayKey(new Date(r.ts));
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  let streak = 0;
  const cursor = new Date(startOfLocalDay(now));
  if (!perDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (perDay.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfLocalDay(now));
    d.setDate(d.getDate() - (6 - i));
    return { day: dayKey(d), count: perDay.get(dayKey(d)) ?? 0 };
  });

  return {
    total: live.length,
    orphans: cards.length - live.length,
    newCards: live.filter((c) => c.fsrs.state === State.New).length,
    dueToday: live.filter((c) => isDue(c, now)).length,
    byArea: [...areas.entries()].map(([area, v]) => ({ area, ...v })).sort((a, b) => a.area.localeCompare(b.area)),
    reviews30: recent.length,
    retention30,
    streak,
    last7,
    hardest: live
      .filter((c) => c.fsrs.lapses > 0)
      .sort((a, b) => b.fsrs.lapses - a.fsrs.lapses)
      .slice(0, 5)
      .map((c) => ({ q: c.q, lapses: c.fsrs.lapses, area: c.area })),
  };
}

export { endOfLocalDay };
