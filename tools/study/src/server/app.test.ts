import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { pathsFor, ROOT } from '../paths.ts';
import { quizArea } from './app.ts';
import { createStudyServer, hostOk, originOk } from './server.ts';

const NOTE = `# TCP vs UDP

TCP đảm bảo thứ tự và độ tin cậy, UDP đổi sự tin cậy lấy tốc độ. ${'Nội dung dài. '.repeat(30)}

## Cards

Q: TCP khác UDP ở điểm nào?
A: TCP đảm bảo thứ tự, UDP thì không.

Q: Khi nào chọn UDP?
A: Khi cần độ trễ thấp hơn độ tin cậy.
`;

let dir: string;
let server: Server;
let base: string;
let llmCalls = 0;
let llmReply: unknown = {};
let hasKey = true;

function fakeFetch(): typeof fetch {
  return (async () => {
    llmCalls++;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(llmReply) } }], usage: {} }), { status: 200 });
  }) as typeof fetch;
}

async function api(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

function rawRequest(opts: { host?: string; path: string; method?: string; headers?: Record<string, string> }): Promise<number> {
  const port = (server.address() as AddressInfo).port;
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: opts.path, method: opts.method ?? 'GET', headers: { host: opts.host ?? `127.0.0.1:${port}`, ...opts.headers } }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'study-app-'));
  const paths = pathsFor(dir);
  mkdirSync(join(paths.notesDir, 'network'), { recursive: true });
  mkdirSync(join(dir, 'templates'));
  mkdirSync(join(dir, 'web'));
  writeFileSync(join(dir, 'web', 'index.html'), '<!doctype html><title>x</title>');
  copyFileSync(`${ROOT}ROADMAP.md`, paths.roadmapFile);
  copyFileSync(`${ROOT}templates/note.md`, paths.templateFile);
  writeFileSync(join(paths.notesDir, 'network', 'tcp-vs-udp.md'), NOTE);
  const fixed = new Date(2026, 9, 20, 10, 0, 0);
  server = createStudyServer(
    { paths, now: () => fixed, env: new Proxy({}, { get: (_t, k) => (hasKey && k === 'DEEPSEEK_API_KEY' ? 'test-key' : undefined) }) as NodeJS.ProcessEnv, fetch: fakeFetch() },
    join(dir, 'web'),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

test('host and origin helpers', () => {
  assert.ok(hostOk('localhost:4173') && hostOk('127.0.0.1:1') && hostOk('[::1]:80'));
  assert.ok(!hostOk('evil.com') && !hostOk('localhost.evil.com') && !hostOk(undefined));
  assert.ok(originOk(undefined, 'localhost:1') && originOk('http://localhost:1', 'localhost:1'));
  assert.ok(!originOk('http://evil.com', 'localhost:1') && !originOk('http://localhost:2', 'localhost:1') && !originOk('garbage', 'localhost:1'));
});

test('rejects foreign Host, foreign Origin and non-JSON writes', async () => {
  assert.equal(await rawRequest({ host: 'evil.com', path: '/api/status' }), 403);
  assert.equal(await rawRequest({ path: '/api/status', headers: { origin: 'http://evil.com' } }), 403);
  const noJson = await fetch(`${base}/api/daily`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
  assert.equal(noJson.status, 415);
  const badJson = await fetch(`${base}/api/daily`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
  assert.equal(badJson.status, 400);
});

test('serves the SPA, blocks path traversal, 404s unknown API', async () => {
  const home = await fetch(`${base}/progress`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<title>x<\/title>/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await rawRequest({ path: '/..%2f..%2fROADMAP.md' }), 400);
  assert.equal(await rawRequest({ path: '/missing.js' }), 404);
  assert.equal(await rawRequest({ path: '/notes/network/tcp-vs-udp.md' }), 200);
  assert.equal((await api('GET', '/api/nope')).status, 404);
  assert.equal((await api('POST', '/api/status', {})).status, 405);
});

test('today: week 1 plan, due count and phase', async () => {
  const { status, json } = await api('GET', '/api/today');
  assert.equal(status, 200);
  assert.equal(json.phase, 'active');
  assert.equal(json.week.n, 1);
  assert.equal(json.date, '2026-10-20');
  assert.equal(json.queueCount, 2);
  assert.equal(json.plan[0].slot, 'rev');
  assert.equal(json.totalWeeks, 23);
});

test('daily ticks persist and validate', async () => {
  let r = await api('POST', '/api/daily', { date: '2026-10-20', slot: 'f1', done: true });
  assert.deepEqual(r.json.done, ['f1']);
  assert.equal((await api('POST', '/api/daily', { date: '2026-10-20', slot: 'zzz', done: true })).status, 400);
  assert.equal((await api('POST', '/api/daily', { date: '2026-13-40', slot: 'f1', done: true })).status, 400);
  const today = await api('GET', '/api/today');
  assert.equal(today.json.plan.find((p: any) => p.slot === 'f1').done, true);
  assert.equal(today.json.weekMinutes.done, 45);
  r = await api('POST', '/api/daily', { date: '2026-10-20', slot: 'f1', done: false });
  assert.deepEqual(r.json.done, []);
});

test('queue, review and interval preview', async () => {
  const q = await api('GET', '/api/queue');
  assert.equal(q.json.cards.length, 2);
  const card = q.json.cards[0];
  assert.equal(card.isNew, true);
  assert.ok(card.intervals[1] >= 1 && card.intervals[4] >= card.intervals[3]);
  assert.equal((await api('POST', '/api/review', { id: card.id, rating: 9 })).status, 400);
  assert.equal((await api('POST', '/api/review', { id: 'nope', rating: 3 })).status, 404);
  const r = await api('POST', '/api/review', { id: card.id, rating: 3 });
  assert.equal(r.status, 200);
  assert.match(readFileSync(join(dir, 'data', 'reviews.jsonl'), 'utf8'), new RegExp(card.id));
  const after = await api('GET', '/api/queue');
  assert.equal(after.json.cards.length, 1);
});

test('notes list, read, edit, create and traversal guard', async () => {
  const list = await api('GET', '/api/notes');
  assert.equal(list.json.notes.length, 1);
  assert.equal(list.json.notes[0].title, 'TCP vs UDP');
  assert.equal(list.json.notes[0].cards, 2);
  assert.match(list.json.notes[0].summary, /TCP đảm bảo/);

  const one = await api('GET', '/api/note?path=network/tcp-vs-udp.md');
  assert.equal(one.json.cards.length, 2);
  assert.equal((await api('GET', '/api/note?path=../../.env')).status, 400);
  assert.equal((await api('GET', '/api/note?path=network/none.md')).status, 404);

  const created = await api('POST', '/api/notes', { area: 'devops', title: 'Docker cơ bản' });
  assert.equal(created.status, 201);
  assert.equal(created.json.path, 'devops/docker-co-ban.md');
  assert.equal((await api('PUT', '/api/note', { path: created.json.path, content: '# Docker\n\nQ: Image là gì?\nA: Gói bất biến chứa app.\n' })).status, 200);
  const list2 = await api('GET', '/api/notes');
  assert.equal(list2.json.notes.length, 2);
  assert.equal(list2.json.areas.length, 2);
  assert.equal((await api('PUT', '/api/note', { path: '../x.md', content: 'x' })).status, 400);
});

test('gen proposes cards and cards endpoint appends them', async () => {
  llmReply = { cards: [{ q: 'Handshake có mấy bước?', a: '3 bước: SYN, SYN-ACK, ACK.' }] };
  const before = llmCalls;
  const g = await api('POST', '/api/gen', { path: 'network/tcp-vs-udp.md' });
  assert.equal(g.status, 200);
  assert.equal(llmCalls, before + 1);
  assert.equal(g.json.proposals[0].q, 'Handshake có mấy bước?');

  const add = await api('POST', '/api/cards', { path: 'network/tcp-vs-udp.md', cards: [g.json.proposals[0], { q: '', a: 'x' }] });
  assert.equal(add.json.added, 1);
  assert.match(readFileSync(join(dir, 'notes', 'network', 'tcp-vs-udp.md'), 'utf8'), /Q: Handshake có mấy bước\?\nA: 3 bước/);
  assert.equal((await api('POST', '/api/cards', { path: 'network/tcp-vs-udp.md', cards: [] })).status, 400);
  const note = await api('GET', '/api/note?path=network/tcp-vs-udp.md');
  assert.equal(note.json.cards.length, 3);
});

test('quiz start and grade write a log entry', async () => {
  llmReply = { questions: [{ q: 'Khi nào không dùng UDP?', key_points: ['không đảm bảo gói tới nơi'] }] };
  const s = await api('POST', '/api/quiz/start', { path: 'network/tcp-vs-udp.md', n: 2 });
  assert.equal(s.status, 200);
  assert.equal(s.json.questions.length, 1);
  const random = await api('POST', '/api/quiz/start', { area: 'network' });
  assert.equal(random.json.path, 'network/tcp-vs-udp.md');

  llmReply = { score: 2, covered: ['a'], missing: ['b'], wrong: [], feedback: 'Thiếu ý.', model_answer: 'Đáp án.' };
  const g = await api('POST', '/api/quiz/grade', { path: 'network/tcp-vs-udp.md', question: s.json.questions[0], answer: 'UDP không đảm bảo.' });
  assert.equal(g.json.grade.score, 2);
  assert.equal(g.json.grade.modelAnswer, 'Đáp án.');
  assert.equal((await api('POST', '/api/quiz/grade', { path: 'network/tcp-vs-udp.md', question: s.json.questions[0], answer: '  ' })).status, 400);
  assert.match(readFileSync(join(dir, 'data', 'quiz.jsonl'), 'utf8'), /"score":2/);
});

test('progress aggregates weeks, areas, heatmap and quiz', async () => {
  const { json } = await api('GET', '/api/progress');
  assert.equal(json.weeks.length, 23);
  assert.equal(json.currentWeek, 1);
  assert.equal(json.heatmap.length, 84);
  assert.equal(json.heatmap.at(-1).day, '2026-10-20');
  assert.equal(json.heatmap.at(-1).count, 1);
  assert.equal(json.quiz.count30, 1);
  assert.equal(json.quiz.avg30, 2);
  const net = json.areas.find((a: any) => a.area === 'network');
  assert.equal(net.quizAvg, 2);
});

test('LLM endpoints report a missing key and upstream failures clearly', async () => {
  hasKey = false;
  const r = await api('POST', '/api/gen', { path: 'network/tcp-vs-udp.md' });
  assert.equal(r.status, 503);
  assert.match(r.json.error, /DEEPSEEK_API_KEY/);
  assert.equal((await api('GET', '/api/status')).json.llm.configured, false);
  hasKey = true;
  llmReply = { cards: 'invalid' };
  assert.equal((await api('POST', '/api/gen', { path: 'network/tcp-vs-udp.md' })).status, 502);
});

test('quizArea reads the area from CLI and server log formats', () => {
  assert.equal(quizArea('\\notes\\network\\x.md'), 'network');
  assert.equal(quizArea('notes/devops/y.md'), 'devops');
  assert.equal(quizArea('frontend/z.md'), 'frontend');
  assert.equal(quizArea('z.md'), 'misc');
});
