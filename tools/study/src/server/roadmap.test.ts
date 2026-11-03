import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ROOT } from '../paths.ts';
import { addDays, parseRoadmap, planFor, weekOf } from './roadmap.ts';

const weeks = parseRoadmap(readFileSync(`${ROOT}ROADMAP.md`, 'utf8'));

test('parses all 26 weeks from the real ROADMAP.md', () => {
  assert.equal(weeks.length, 26);
  assert.deepEqual(weeks.map((w) => w.n), Array.from({ length: 26 }, (_, i) => i + 1));
  assert.equal(weeks[0].start, '2026-10-26');
  assert.equal(weeks[0].end, '2026-11-01');
  assert.equal(weeks[25].end, '2027-04-25');
  assert.match(weeks[0].s, /TCP\/IP/);
  assert.match(weeks[0].d, /Arrays/);
  assert.match(weeks[0].o, /CMS 12/);
});

test('Optimizely track: Foundations passed, 4 cert sprints, then retake buffer', () => {
  assert.deepEqual(weeks.filter((w) => w.o).map((w) => w.n), [1, 2, 3, 4, 5, 6, 7]);
  assert.match(weeks[0].o, /Foundations/);
  assert.match(weeks[0].o, /29\/10/);
  for (const i of [1, 2, 3, 4]) assert.match(weeks[i].o, /^\**Sprint/);
  assert.ok(!weeks[7].o);
});

test('flags checkpoints, apply week and Tet week', () => {
  assert.deepEqual(weeks.filter((w) => w.checkpoint).map((w) => w.n), [8, 12, 18, 22, 25]);
  assert.deepEqual(weeks.filter((w) => w.apply).map((w) => w.n), [24]);
  assert.deepEqual(weeks.filter((w) => w.light).map((w) => w.n), [15]);
  assert.equal(weeks[14].start, '2027-02-01');
});

test('weekOf finds the week for a date, including year rollover', () => {
  assert.equal(weekOf(weeks, '2026-10-27')?.n, 1);
  assert.equal(weekOf(weeks, '2027-01-01')?.n, 10);
  assert.equal(weekOf(weeks, '2026-10-25'), null);
  assert.equal(weekOf(weeks, '2027-04-26'), null);
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

test('sprint weeks drop S/F/A/D and give all tech time to Optimizely', () => {
  const slots = (day: string) => planFor(weeks[1], day).map((i) => i.slot);
  assert.match(weeks[1].o, /^Sprint/);
  assert.deepEqual(slots('2026-11-02'), ['rev', 'o1', 'o2', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-11-07'), ['rev', 'o1', 'o2', 'en1', 'en2', 'en3']);
  assert.deepEqual(slots('2026-11-08'), ['rev', 'o']);
  const mins = (day: string) => planFor(weeks[1], day).filter((i) => i.strand === 'O').reduce((s, i) => s + i.minutes, 0);
  assert.equal(mins('2026-11-03'), 180);
  assert.equal(mins('2026-11-08'), 45);
});

test('other strands restart on 30/11 with the retake buffer weeks', () => {
  const dec = planFor(weeks[5], '2026-11-30');
  assert.deepEqual(dec.map((i) => i.slot), ['rev', 'd', 's', 'o', 'en1', 'en2', 'en3']);
  assert.match(weeks[5].s, /Linux/);
  assert.equal(dec.find((i) => i.slot === 'o')!.minutes, 60);
});

test('weeks without an Optimizely topic have no O slot', () => {
  assert.ok(!planFor(weeks[10], '2027-01-04').some((i) => i.slot === 'o'));
});

test('plan without a roadmap week still works', () => {
  assert.ok(planFor(null, '2026-10-27').length > 0);
});
