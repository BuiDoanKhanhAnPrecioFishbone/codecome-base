import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ROOT } from '../paths.ts';
import { addDays, parseRoadmap, planFor, weekOf } from './roadmap.ts';

const weeks = parseRoadmap(readFileSync(`${ROOT}ROADMAP.md`, 'utf8'));

test('parses all 23 weeks from the real ROADMAP.md', () => {
  assert.equal(weeks.length, 23);
  assert.deepEqual(weeks.map((w) => w.n), Array.from({ length: 23 }, (_, i) => i + 1));
  assert.equal(weeks[0].start, '2026-10-26');
  assert.equal(weeks[0].end, '2026-11-01');
  assert.equal(weeks[22].end, '2027-04-04');
  assert.match(weeks[0].s, /TCP\/IP/);
  assert.match(weeks[0].d, /Arrays/);
  assert.match(weeks[0].o, /CMS 12/);
});

test('Optimizely track covers weeks 1-10 and ends before the January weeks', () => {
  assert.deepEqual(weeks.filter((w) => w.o).map((w) => w.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.match(weeks[1].o, /Foundations/);
  assert.match(weeks[7].o, /19\/12/);
});

test('flags checkpoints, apply week and Tet week', () => {
  assert.deepEqual(weeks.filter((w) => w.checkpoint).map((w) => w.n), [4, 8, 13, 18, 22]);
  assert.deepEqual(weeks.filter((w) => w.apply).map((w) => w.n), [21]);
  assert.deepEqual(weeks.filter((w) => w.light).map((w) => w.n), [15]);
  assert.equal(weeks[14].start, '2027-02-01');
});

test('weekOf finds the week for a date, including year rollover', () => {
  assert.equal(weekOf(weeks, '2026-10-27')?.n, 1);
  assert.equal(weekOf(weeks, '2027-01-01')?.n, 10);
  assert.equal(weekOf(weeks, '2026-10-25'), null);
  assert.equal(weekOf(weeks, '2027-04-05'), null);
});

test('addDays crosses month boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('daily plan follows the weekly schedule', () => {
  const w1 = weeks[0];
  const slots = (day: string) => planFor(w1, day).map((i) => i.slot);
  assert.deepEqual(slots('2026-10-26'), ['rev', 'd', 's', 'o', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-10-27'), ['rev', 'f1', 'f2', 'o', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-10-29'), ['rev', 'a1', 'a2', 'o', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-10-31'), ['rev', 't7', 'o', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-11-01'), ['rev', 'o']);
  const tech = planFor(w1, '2026-10-26').filter((i) => ['D', 'S'].includes(i.strand));
  assert.equal(tech.reduce((s, i) => s + i.minutes, 0), 120);
  assert.match(planFor(w1, '2026-10-26')[1].title, /Arrays/);
  const o = (day: string) => planFor(w1, day).find((i) => i.slot === 'o')!;
  assert.equal(o('2026-10-26').minutes, 60);
  assert.equal(o('2026-11-01').minutes, 30);
});

test('weeks without an Optimizely topic have no O slot', () => {
  assert.ok(!planFor(weeks[10], '2027-01-04').some((i) => i.slot === 'o'));
});

test('plan without a roadmap week still works', () => {
  assert.ok(planFor(null, '2026-10-27').length > 0);
});
