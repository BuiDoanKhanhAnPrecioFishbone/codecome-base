import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSyncPath, mergeLines, planPull, planPush, type LocalFile, type RemoteFile } from './cloud.ts';

const local = (path: string, content: string, mtime: number, kind: LocalFile['kind'] = 'note'): LocalFile => ({ path, kind, content, sha256: `s:${content}`, mtime });
const remote = (path: string, content: string, updatedAt: number, kind: RemoteFile['kind'] = 'note'): RemoteFile => ({ path, kind, content, sha256: `s:${content}`, updatedAt });

test('only notes and the four data files may sync', () => {
  assert.ok(isSyncPath('notes/network/tcp.md'));
  assert.ok(isSyncPath('data/state.json'));
  assert.ok(!isSyncPath('notes/../.env'));
  assert.ok(!isSyncPath('.env'));
  assert.ok(!isSyncPath('data/other.json'));
  assert.ok(!isSyncPath('notes/a\\b.md'));
});

test('mergeLines keeps order and drops duplicates and blanks', () => {
  assert.equal(mergeLines('a\nb\n', 'b\nc\n\n'), 'a\nb\nc\n');
  assert.equal(mergeLines('', ''), '');
});

test('push: new, unchanged, merged log, conflict and force', () => {
  const l = [local('notes/a/x.md', 'new', 10), local('notes/a/y.md', 'same', 10), local('notes/a/z.md', 'local', 10), local('data/reviews.jsonl', 'a\nb\n', 10, 'log')];
  const r = [remote('notes/a/y.md', 'same', 5), remote('notes/a/z.md', 'cloud', 99), remote('data/reviews.jsonl', 'a\nc\n', 5, 'log')];
  const p = planPush(l, r);
  assert.deepEqual(p.actions.map((a) => [a.path, a.why]), [['notes/a/x.md', 'new'], ['data/reviews.jsonl', 'merged']]);
  assert.equal(p.actions[1].content, 'a\nc\nb\n');
  assert.deepEqual(p.conflicts, ['notes/a/z.md']);
  assert.equal(p.same, 1);
  assert.equal(planPush(l, r, true).conflicts.length, 0);
});

test('pull: restores missing files, keeps newer local edits, merges logs', () => {
  const l = [local('notes/a/z.md', 'local', 99), local('data/quiz.jsonl', 'q1\n', 10, 'log'), local('notes/a/old.md', 'old', 1)];
  const r = [remote('notes/a/missing.md', 'm', 5), remote('notes/a/z.md', 'cloud', 50), remote('data/quiz.jsonl', 'q1\nq2\n', 5, 'log'), remote('notes/a/old.md', 'newer', 50), remote('../evil.md', 'x', 1)];
  const p = planPull(l, r);
  assert.deepEqual(p.actions.map((a) => [a.path, a.why]), [['notes/a/missing.md', 'new'], ['data/quiz.jsonl', 'merged'], ['notes/a/old.md', 'changed']]);
  assert.deepEqual(p.conflicts, ['notes/a/z.md']);
  assert.equal(planPull(l, r, true).actions.some((a) => a.path === 'notes/a/z.md'), true);
});
