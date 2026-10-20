import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { ParsedCard } from './cards.ts';

export interface StoredCard {
  id: string;
  q: string;
  a: string;
  file: string;
  area: string;
  orphan: boolean;
  fsrs: Card;
}

export interface StudyState {
  version: 1;
  cards: Record<string, StoredCard>;
}

export interface ReviewEntry {
  ts: string;
  id: string;
  area: string;
  rating: number;
  stateBefore: number;
}

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: false,
});

export function emptyState(): StudyState {
  return { version: 1, cards: {} };
}

function reviveFsrs(raw: Card): Card {
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  };
}

export function loadState(file: string): StudyState {
  if (!existsSync(file)) return emptyState();
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as StudyState;
  for (const c of Object.values(parsed.cards)) c.fsrs = reviveFsrs(c.fsrs);
  return parsed;
}

export function saveState(file: string, state: StudyState): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
  renameSync(tmp, file);
}

export interface SyncResult {
  added: number;
  updated: number;
  orphaned: number;
  restored: number;
}

/** Notes are the source of truth for text; review history lives only in state. Removed cards are kept as orphans. */
export function syncCards(state: StudyState, parsed: ParsedCard[], now: Date): SyncResult {
  const res: SyncResult = { added: 0, updated: 0, orphaned: 0, restored: 0 };
  const present = new Set<string>();
  for (const p of parsed) {
    present.add(p.id);
    const existing = state.cards[p.id];
    if (!existing) {
      state.cards[p.id] = { id: p.id, q: p.q, a: p.a, file: p.file, area: p.area, orphan: false, fsrs: createEmptyCard(now) };
      res.added++;
      continue;
    }
    if (existing.orphan) {
      existing.orphan = false;
      res.restored++;
    }
    if (existing.a !== p.a || existing.file !== p.file || existing.area !== p.area) {
      existing.a = p.a;
      existing.file = p.file;
      existing.area = p.area;
      res.updated++;
    }
  }
  for (const c of Object.values(state.cards)) {
    if (!present.has(c.id) && !c.orphan) {
      c.orphan = true;
      res.orphaned++;
    }
  }
  return res;
}

export function applyReview(card: StoredCard, rating: Grade, now: Date): ReviewEntry {
  const entry: ReviewEntry = {
    ts: now.toISOString(),
    id: card.id,
    area: card.area,
    rating,
    stateBefore: card.fsrs.state,
  };
  card.fsrs = scheduler.next(card.fsrs, now, rating).card;
  return entry;
}

/** Days until the next review for each rating (1-4), without changing the card. */
export function previewIntervals(card: StoredCard, now: Date): Record<1 | 2 | 3 | 4, number> {
  const next = scheduler.repeat(card.fsrs, now);
  const days = (g: Grade) => Math.max(0, Math.round((next[g].card.due.getTime() - now.getTime()) / 86_400_000));
  return { 1: days(Rating.Again), 2: days(Rating.Hard), 3: days(Rating.Good), 4: days(Rating.Easy) };
}

export function appendJsonl(file: string, entry: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(entry) + '\n');
}

export function readJsonl<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

export { Rating, State };
export type { Grade };
