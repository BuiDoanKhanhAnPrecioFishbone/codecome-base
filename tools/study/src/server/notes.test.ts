import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createNote, HttpError, resolveNotePath, summaryOf, titleOf, writeNote } from './notes.ts';

test('resolveNotePath accepts normal note paths', () => {
  const p = resolveNotePath('/tmp/notes', 'network/tcp-vs-udp.md');
  assert.ok(p.replaceAll('\\', '/').endsWith('/tmp/notes/network/tcp-vs-udp.md'));
});

test('resolveNotePath rejects traversal, absolute paths and non-md files', () => {
  const bad = [
    '../secrets.md', 'network/../../.env', '..\\x.md', '/etc/passwd.md', 'C:\\x.md', 'a//b.md', './a.md',
    'network/x.txt', '', 'network/x.md\0', 'a b/c.md', 'x'.repeat(250) + '.md', 5, null, undefined,
  ];
  for (const b of bad) {
    assert.throws(() => resolveNotePath('/tmp/notes', b), (e) => e instanceof HttpError && e.status === 400, String(b));
  }
});

test('title and summary extraction', () => {
  const md = '# **TCP** vs [UDP](x)\n\n- Ngày học: 20/10\n- Nguồn:\n\n## Vấn đề\n\nTCP đảm bảo thứ tự, UDP thì không.\n\nQ: x\nA: y\n';
  assert.equal(titleOf(md, 'fallback'), 'TCP vs UDP');
  assert.equal(titleOf('no heading', 'fallback'), 'fallback');
  assert.equal(summaryOf(md), 'TCP đảm bảo thứ tự, UDP thì không.');
  assert.equal(summaryOf('# T\n\n```\ncode line here ok\n```\n'), '');
});

test('create and write notes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'notes-'));
  try {
    const notes = join(dir, 'notes');
    mkdirSync(notes);
    const tpl = join(dir, 'tpl.md');
    writeFileSync(tpl, '# Chủ đề\n\n## Cards\n');
    const rel = createNote(notes, tpl, 'network', 'Đường đi của gói tin');
    assert.equal(rel, 'network/duong-di-cua-goi-tin.md');
    assert.match(readFileSync(join(notes, rel), 'utf8'), /^# Đường đi của gói tin/);
    assert.throws(() => createNote(notes, tpl, 'network', 'Đường đi của gói tin'), (e) => (e as HttpError).status === 409);
    assert.throws(() => createNote(notes, tpl, '../x', 'T'), (e) => (e as HttpError).status === 400);
    writeNote(notes, rel, '# Mới\n');
    assert.equal(readFileSync(join(notes, rel), 'utf8'), '# Mới\n');
    assert.throws(() => writeNote(notes, 'network/missing.md', 'x'), (e) => (e as HttpError).status === 404);
    assert.throws(() => writeNote(notes, rel, 42), (e) => (e as HttpError).status === 400);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
