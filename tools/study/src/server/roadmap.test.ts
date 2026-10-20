import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ROOT } from '../paths.ts';
import { addDays, parseRoadmap, planFor, weekOf } from './roadmap.ts';

const weeks = parseRoadmap(readFileSync(`${ROOT}ROADMAP.md`, 'utf8'));

test('parses all 23 weeks from the real ROADMAP.md', () => {
  assert.equal(weeks.length, 23);
  assert.deepEqual(weeks.map((w) => w.n), Array.from({ length: 23 }, (_, i) => i + 1));
  assert.equal(weeks[0].start, '2026-10-19');
  assert.equal(weeks[0].end, '2026-10-25');
  assert.equal(weeks[22].end, '2027-03-28');
  assert.match(weeks[0].s, /TCP\/IP/);
  assert.match(weeks[0].d, /Arrays/);
});

test('flags checkpoints, apply week and Tet week', () => {
  assert.deepEqual(weeks.filter((w) => w.checkpoint).map((w) => w.n), [4, 8, 13, 18, 22]);
  assert.deepEqual(weeks.filter((w) => w.apply).map((w) => w.n), [21]);
  assert.deepEqual(weeks.filter((w) => w.light).map((w) => w.n), [16]);
});

test('weekOf finds the week for a date, including year rollover', () => {
  assert.equal(weekOf(weeks, '2026-10-20')?.n, 1);
  assert.equal(weekOf(weeks, '2027-01-01')?.n, 11);
  assert.equal(weekOf(weeks, '2026-10-18'), null);
  assert.equal(weekOf(weeks, '2027-03-29'), null);
});

test('addDays crosses month boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('daily plan follows the weekly schedule', () => {
  const w1 = weeks[0];
  const slots = (day: string) => planFor(w1, day).map((i) => i.slot);
  assert.deepEqual(slots('2026-10-19'), ['rev', 'd', 's', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-10-20'), ['rev', 'f1', 'f2', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-10-22'), ['rev', 'a1', 'a2', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-10-24'), ['rev', 't7', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-10-25'), ['rev']);
  const tech = planFor(w1, '2026-10-19').filter((i) => ['D', 'S'].includes(i.strand));
  assert.equal(tech.reduce((s, i) => s + i.minutes, 0), 120);
  assert.match(planFor(w1, '2026-10-19')[1].title, /Arrays/);
});

test('plan without a roadmap week still works', () => {
  assert.ok(planFor(null, '2026-10-20').length > 0);
});
