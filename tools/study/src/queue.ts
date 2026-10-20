import { State } from 'ts-fsrs';
import type { ReviewEntry, StoredCard } from './store.ts';

export interface QueueOptions {
  maxNew: number;
  maxTotal: number;
  newDoneToday: number;
  area?: string;
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isDue(c: StoredCard, now: Date): boolean {
  return !c.orphan && c.fsrs.state !== State.New && c.fsrs.due <= endOfLocalDay(now);
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Due cards first (shuffled across areas = interleaving), then a capped number of new cards. */
export function buildQueue(
  cards: StoredCard[],
  now: Date,
  opts: QueueOptions,
  rng: () => number = Math.random,
): StoredCard[] {
  const pool = cards.filter((c) => !c.orphan && (!opts.area || c.area === opts.area));
  const due = shuffle(pool.filter((c) => isDue(c, now)), rng).slice(0, opts.maxTotal);
  const newAllowed = Math.max(0, Math.min(opts.maxNew - opts.newDoneToday, opts.maxTotal - due.length));
  const fresh = shuffle(pool.filter((c) => c.fsrs.state === State.New), rng).slice(0, newAllowed);
  return [...due, ...fresh];
}

export function countNewDoneToday(reviews: ReviewEntry[], now: Date): number {
  const start = startOfLocalDay(now).getTime();
  return reviews.filter((r) => r.stateBefore === State.New && new Date(r.ts).getTime() >= start).length;
}
