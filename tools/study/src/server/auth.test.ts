import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathsFor } from '../paths.ts';
import { copyAll } from '../storage/pg.ts';
import { fileStorage } from '../storage/file.ts';
import { createAuth } from './auth.ts';
import { createStudyServer } from './server.ts';

const T0 = new Date('2026-10-21T08:00:00Z');

test('auth: cookie roundtrip, tamper and expiry', () => {
  const auth = createAuth({ STUDY_PASSWORD: 'hunter2' });
  assert.equal(auth.enabled, true);
  assert.equal(auth.check('hunter2'), true);
  assert.equal(auth.check('wrong'), false);
  assert.equal(auth.check(undefined), false);
  const { token } = auth.issue(T0);
  assert.equal(auth.verify(`a=b; study_session=${token}`, T0), true);
  assert.equal(auth.verify(`study_session=${token}x`, T0), false);
  assert.equal(auth.verify(`study_session=${token.replace(/.$/, (c) => (c === '0' ? '1' : '0'))}`, T0), false);
  assert.equal(auth.verify(undefined, T0), false);
  assert.equal(auth.verify(`study_session=${token}`, new Date(T0.getTime() + 31 * 86_400_000)), false);
  const other = createAuth({ STUDY_PASSWORD: 'hunter2', STUDY_SESSION_SECRET: 'other' });
  assert.equal(other.verify(`study_session=${token}`, T0), false);
});

test('auth: disabled without a password', () => {
  const auth = createAuth({});
  assert.equal(auth.enabled, false);
  assert.equal(auth.check(''), false);
  assert.equal(auth.verify('study_session=1.' + 'a'.repeat(64), T0), false);
});

test('server: password gate over HTTP', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'study-auth-'));
  mkdirSync(join(dir, 'web'));
  writeFileSync(join(dir, 'web', 'index.html'), '<html></html>');
  const paths = pathsFor(dir);
  const server = createStudyServer({ paths, now: () => T0, env: { STUDY_PASSWORD: 'hunter2' } }, join(dir, 'web'));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const json = { 'content-type': 'application/json' };
  try {
    let res = await fetch(`${base}/api/session`);
    assert.deepEqual(await res.json(), { required: true, authed: false });
    res = await fetch(`${base}/api/status`);
    assert.equal(res.status, 401);
    res = await fetch(`${base}/api/login`, { method: 'POST', headers: json, body: JSON.stringify({ password: 'nope' }) });
    assert.equal(res.status, 401);
    res = await fetch(`${base}/api/login`, { method: 'POST', headers: json, body: JSON.stringify({ password: 'hunter2' }) });
    assert.equal(res.status, 200);
    const cookie = res.headers.get('set-cookie') ?? '';
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    const sent = cookie.split(';')[0];
    res = await fetch(`${base}/api/session`, { headers: { cookie: sent } });
    assert.deepEqual(await res.json(), { required: true, authed: true });
    res = await fetch(`${base}/api/status`, { headers: { cookie: sent } });
    assert.equal(res.status, 200);
    res = await fetch(`${base}/api/logout`, { method: 'POST', headers: json, body: '{}' });
    assert.match(res.headers.get('set-cookie') ?? '', /Max-Age=0/);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('copyAll copies notes, lessons, state and logs between storages', async () => {
  const a = mkdtempSync(join(tmpdir(), 'study-a-'));
  const b = mkdtempSync(join(tmpdir(), 'study-b-'));
  try {
    const from = fileStorage(pathsFor(a));
    const to = fileStorage(pathsFor(b));
    assert.equal(await from.createNote('notes/network/tcp.md', '# TCP\n'), true);
    await from.putLesson('w01-S', '# Bài 1');
    await from.saveDaily({ '2026-10-21': { 'S-0': true } } as never);
    await from.addReview({ ts: '2026-10-21T08:00:00.000Z', id: 'x', rating: 3 } as never);
    const counts = await copyAll(from, to);
    assert.deepEqual(counts, { notes: 1, lessons: 1, reviews: 1, quiz: 0 });
    assert.equal((await to.getNote('notes/network/tcp.md'))?.content, '# TCP\n');
    assert.equal((await to.getLesson('w01-S'))?.content, '# Bài 1');
    assert.equal((await to.readReviews()).length, 1);
    const again = await copyAll(from, to);
    assert.equal(again.reviews, 0);
    assert.equal((await to.readReviews()).length, 1);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});
