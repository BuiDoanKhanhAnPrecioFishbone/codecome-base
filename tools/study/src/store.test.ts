import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cardId } from './cards.ts';
import { buildQueue, countNewDoneToday, isDue } from './queue.ts';
import { applyReview, emptyState, loadState, Rating, saveState, State, syncCards } from './store.ts';
import { computeStats } from './stats.ts';

const parsed = (q: string, area = 'network') => ({ id: cardId(q), q, a: `ans ${q}`, file: `${area}/x.md`, area });
const now = new Date(2026, 9, 20, 10, 0, 0);

test('sync adds, orphans and restores cards', () => {
  const s = emptyState();
  assert.equal(syncCards(s, [parsed('a'), parsed('b')], now).added, 2);
  assert.equal(syncCards(s, [parsed('a')], now).orphaned, 1);
  assert.equal(s.cards[cardId('b')].orphan, true);
  assert.equal(syncCards(s, [parsed('a'), parsed('b')], now).restored, 1);
});

test('state survives save/load with Date revival', () => {
  const dir = mkdtempSync(join(tmpdir(), 'study-'));
  try {
    const file = join(dir, 'state.json');
    const s = emptyState();
    syncCards(s, [parsed('a')], now);
    applyReview(s.cards[cardId('a')], Rating.Good, now);
    saveState(file, s);
    const loaded = loadState(file);
    const c = loaded.cards[cardId('a')];
    assert.ok(c.fsrs.due instanceof Date);
    assert.ok(c.fsrs.due.getTime() > now.getTime());
    assert.notEqual(c.fsrs.state, State.New);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('queue: due first, new capped, area filter', () => {
  const s = emptyState();
  syncCards(s, [parsed('a'), parsed('b'), parsed('c'), parsed('d', 'devops')], now);
  const cards = Object.values(s.cards);
  const entry = applyReview(s.cards[cardId('a')], Rating.Again, new Date(now.getTime() - 5 * 86_400_000));
  assert.equal(entry.stateBefore, State.New);
  assert.ok(isDue(s.cards[cardId('a')], now));

  const q = buildQueue(cards, now, { maxNew: 2, maxTotal: 10, newDoneToday: 0 });
  assert.equal(q[0].id, cardId('a'));
  assert.equal(q.length, 3);
  assert.equal(buildQueue(cards, now, { maxNew: 2, maxTotal: 10, newDoneToday: 2 }).length, 1);
  assert.ok(buildQueue(cards, now, { maxNew: 5, maxTotal: 10, newDoneToday: 0, area: 'devops' }).every((c) => c.area === 'devops'));
  assert.equal(buildQueue(cards, now, { maxNew: 5, maxTotal: 2, newDoneToday: 0 }).length, 2);
});

test('new-done-today and stats', () => {
  const s = emptyState();
  syncCards(s, [parsed('a'), parsed('b')], now);
  const r = applyReview(s.cards[cardId('a')], Rating.Good, now);
  assert.equal(countNewDoneToday([r], now), 1);
  const st = computeStats(Object.values(s.cards), [r], now);
  assert.equal(st.total, 2);
  assert.equal(st.newCards, 1);
  assert.equal(st.streak, 1);
  assert.equal(st.retention30, null);
  assert.equal(st.last7.at(-1)?.count, 1);
});
