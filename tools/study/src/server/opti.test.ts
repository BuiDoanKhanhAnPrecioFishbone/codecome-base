import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import type { JsonRequest } from '../llm.ts';
import { cleanMarkdown, parseIndex, pickDocs, resetIndexCache } from '../opti/docs.ts';
import { parseMcq } from '../opti/prompts.ts';
import { DOMAINS, TRACKS, allocate } from '../opti/tracks.ts';
import type { Storage } from '../storage/types.ts';
import { gradeOverall, isPassed, optiApp } from './opti.ts';

const INDEX = [
  '- [Smooth deployment](https://docs.optimizely.com/dxp/docs/smooth-deploy.md)',
  '- [Deploying](https://docs.optimizely.com/dxp/docs/deploying.md)',
  '- [CDN recommendations](https://docs.optimizely.com/dxp/docs/cdn-recommendations.md)',
  '- [Release notes for deployment](https://docs.optimizely.com/dxp/docs/release-notes-deploy.md)',
  '- [Create an initialization module](https://docs.optimizely.com/cms-12/docs/creating-an-initialization-module.md)',
  '- [Dependency injection](https://docs.optimizely.com/cms-12/docs/dependency-injection.md)',
  '- [Optimizely Experimentation](https://docs.optimizely.com/experimentation/docs/intro.md)',
].join('\n');

const docsFetch = (async (url: string) => {
  if (url.endsWith('llms.txt')) return new Response(INDEX);
  if (url.endsWith('.md') && !url.includes('missing')) return new Response(`---\ntitle: x\n---\n${'Deploy to the integration environment first. '.repeat(20)}`);
  return new Response('nope', { status: 404 });
}) as unknown as typeof fetch;

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getLesson: async (k: string) => (m.has(k) ? { content: m.get(k)!, updated: 't' } : null),
    putLesson: async (k: string, c: string) => void m.set(k, c),
  } as unknown as Storage;
}

const mcqRaw = (prefix: string) => ({
  questions: [1, 2, 3, 4].map((i) => ({
    q: `${prefix} question ${i}?`,
    options: ['alpha', 'beta', 'gamma', 'delta'].map((o) => `${o} ${i}`),
    answer: 'B',
    explain: 'Vì sao đúng.',
    doc: 1,
  })),
});

let llmCalls: string[] = [];
let scenarioRaw: unknown;
let gradeRaw: unknown;

function app(now = new Date('2026-11-02T08:00:00Z')) {
  return optiApp({
    storage: memoryStorage(),
    now: () => now,
    rng: () => 0.3,
    docsFetch,
    callLlm: async <T>(req: JsonRequest<T>) => {
      llmCalls.push(req.system.slice(0, 20));
      const raw = req.system.startsWith('You grade') ? gradeRaw : req.system.includes('one scenario-based') ? scenarioRaw : mcqRaw('Gen');
      return { data: req.validate(raw) };
    },
  });
}

const post = (routes: ReturnType<typeof optiApp>, path: string, body: Record<string, unknown>) => routes[`POST ${path}`](new URLSearchParams(), body);

beforeEach(() => {
  resetIndexCache();
  llmCalls = [];
  scenarioRaw = {
    title: 'Slow deploys',
    scenario: 'A client deploys weekly and sees downtime during releases on a single environment.',
    question: 'Which deployment approach do you pick and why?',
    requirements: ['Use smooth deployment', 'Tie to downtime constraint', 'Mention risk avoided', 'Reject an alternative'],
    doc: 1,
  };
  gradeRaw = {
    requirements: [{ met: true, comment: 'ok' }, { met: true, comment: 'ok' }, { met: false, comment: 'thiếu' }, { met: false, comment: 'thiếu' }],
    rationale: { score: 2, comment: 'chung chung' },
    feedback: 'Cần cụ thể hơn.',
    model_answer: 'Use smooth deployment.',
  };
});

test('blueprint weights add up to 100 and allocation matches the exam size', () => {
  for (const t of Object.values(TRACKS)) {
    assert.equal(Object.values(t.weights).reduce((a, b) => a + b, 0), 100, t.id);
    for (const d of Object.keys(t.weights)) assert.ok(DOMAINS[d], `${t.id}:${d}`);
    const plan = allocate(t.weights, t.mcq);
    assert.equal(Object.values(plan).reduce((a, b) => a + b, 0), t.mcq, t.id);
  }
  assert.equal(allocate(TRACKS['dev-core'].weights, 30).devex, 14);
});

test('doc picking pins core pages first, skips noise and other products', () => {
  const picks = pickDocs(parseIndex(INDEX), 'cloud', 6).map((d) => d.url.split('/docs/')[1]);
  assert.deepEqual(picks.slice(0, 2), ['deploying', 'smooth-deploy']);
  assert.ok(!picks.includes('release-notes-deploy'));
  assert.ok(!parseIndex(INDEX).some((d) => d.product === 'experimentation'));
  assert.equal(cleanMarkdown('---\ntitle: a\n---\nbody', 100), 'body');
});

test('parseMcq keeps the right answer after shuffling and needs a valid doc', () => {
  const docs = [{ url: 'https://docs.optimizely.com/dxp/docs/deploying' }];
  for (const rng of [() => 0.1, () => 0.9]) {
    const [q] = parseMcq(mcqRaw('X'), docs, 'cloud', rng);
    assert.match(q.options[q.answer], /^beta/);
    assert.equal(q.source, docs[0].url);
  }
  assert.throws(() => parseMcq({ questions: [{ ...mcqRaw('X').questions[0], doc: 5 }] }, docs, 'cloud'));
});

test('pass rule needs 70% overall and 65% in each section', () => {
  assert.equal(isPassed(0.7, null), true);
  assert.equal(isPassed(0.69, null), false);
  assert.equal(isPassed(0.9, 0.6), false);
  assert.equal(isPassed(0.8, 0.7), true);
  assert.ok(Math.abs(gradeOverall(0.8, 0.5) - 0.74) < 1e-9);
});

test('bank, mock exam and grading round trip with persistence', async () => {
  const r = app();
  const gen = await post(r, '/api/opti/bank', { track: 'dev-core', domain: 'cloud', n: 4 });
  assert.equal((gen.body as any).added, 4);
  await assert.rejects(post(r, '/api/opti/bank', { track: 'dev-core', domain: 'modeling' }), /Domain không thuộc/);
  await assert.rejects(post(r, '/api/opti/bank', { track: 'nope', domain: 'cloud' }), /Track không hợp lệ/);

  const start = (await post(r, '/api/opti/exam/start', { track: 'dev-core', mode: 'mock' })).body as any;
  assert.equal(start.questions.length, 3);
  assert.equal(start.shortfall, 27);
  assert.equal(start.minutes, 75);
  assert.ok(start.scenario?.id);
  assert.equal('answer' in start.questions[0], false);
  assert.equal('rationale' in start.scenario, false);

  const ids = start.questions.map((q: any) => q.id);
  const submit = (answers: Record<string, number>) =>
    post(r, '/api/opti/exam/submit', {
      track: 'dev-core',
      mode: 'mock',
      ids,
      answers,
      seconds: 900,
      scenarioId: start.scenario.id,
      scenarioAnswer: 'Use smooth deployment on the integration environment first.',
      rationale: 'Because downtime is the constraint.',
    });

  const first = (await submit(Object.fromEntries(ids.map((id: string) => [id, 0])))).body as any;
  const key = Object.fromEntries(first.review.map((x: any) => [x.id, x.answer]));
  assert.equal(first.attempt.byDomain.cloud.total, 3);
  assert.ok(Math.abs(first.attempt.scenarioPct - 0.5) < 1e-9);
  assert.equal(first.attempt.passed, false);

  const second = (await submit(key)).body as any;
  assert.equal(second.attempt.correct, 3);
  assert.equal(second.attempt.mcqPct, 1);
  assert.equal(second.review.every((x: any) => x.correct && x.explain && x.source.startsWith('https://docs.optimizely.com/')), true);

  const attempts = ((await r['GET /api/opti/attempts'](new URLSearchParams('track=dev-core'), {})).body as any).attempts;
  assert.equal(attempts.length, 2);
  const overview = ((await r['GET /api/opti/overview'](new URLSearchParams(), {})).body as any).tracks;
  const dev = overview.find((t: any) => t.id === 'dev-core');
  assert.equal(dev.bank, 4);
  assert.equal(dev.attempts, 2);
  assert.ok(dev.readiness > 0);
  assert.equal(dev.domains.find((d: any) => d.id === 'cloud').total, 6);

  await assert.rejects(post(r, '/api/opti/exam/submit', { track: 'dev-core', ids: ['ffffffff'], answers: {} }), /không còn trong ngân hàng/);
});

test('practice mode serves unseen questions first and sa tracks have no scenario', async () => {
  const r = app();
  await post(r, '/api/opti/bank', { track: 'sa-core', domain: 'cloud', n: 4 });
  const first = (await post(r, '/api/opti/exam/start', { track: 'sa-core', mode: 'practice', domain: 'cloud', n: 2 })).body as any;
  assert.equal(first.questions.length, 2);
  assert.equal(first.scenario, null);
  await post(r, '/api/opti/exam/submit', { track: 'sa-core', mode: 'practice', domain: 'cloud', ids: first.questions.map((q: any) => q.id), answers: {} });
  const next = (await post(r, '/api/opti/exam/start', { track: 'sa-core', mode: 'practice', domain: 'cloud', n: 2 })).body as any;
  const done = new Set(first.questions.map((q: any) => q.id));
  assert.equal(next.questions.every((q: any) => !done.has(q.id)), true);
  await assert.rejects(post(r, '/api/opti/scenario', { track: 'sa-core' }), /không có scenario/);
});

