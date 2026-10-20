import test from 'node:test';
import assert from 'node:assert/strict';
import { chatJson, loadConfig, parseEnvFile } from './llm.ts';
import { parseGen, parseGrade, parseQuiz } from './prompts.ts';

const cfg = { apiKey: 'k', baseUrl: 'https://x.test', model: 'm' };

function fakeFetch(contents: string[], seen: { body: any }[] = []): typeof fetch {
  let i = 0;
  return (async (_url: string, init: RequestInit) => {
    seen.push({ body: JSON.parse(String(init.body)) });
    const content = contents[i++];
    return new Response(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 1 } }), { status: 200 });
  }) as unknown as typeof fetch;
}

test('chatJson returns validated data and disables thinking by default', async () => {
  const seen: { body: any }[] = [];
  const { data } = await chatJson(cfg, { system: 's', user: 'u', validate: parseGen }, fakeFetch(['{"cards":[{"q":"a?","a":"b"}]}'], seen));
  assert.equal(data.length, 1);
  assert.deepEqual(seen[0].body.thinking, { type: 'disabled' });
  assert.deepEqual(seen[0].body.response_format, { type: 'json_object' });
});

test('chatJson retries once with the validation error', async () => {
  const seen: { body: any }[] = [];
  const { data } = await chatJson(cfg, { system: 's', user: 'u', validate: parseGen }, fakeFetch(['{"cards":[]}', '{"cards":[{"q":"a","a":"b"}]}'], seen));
  assert.equal(data.length, 1);
  assert.equal(seen.length, 2);
  assert.match(seen[1].body.messages.at(-1).content, /invalid/);
});

test('chatJson gives up after two invalid replies', async () => {
  await assert.rejects(chatJson(cfg, { system: 's', user: 'u', validate: parseGen }, fakeFetch(['nope', 'still nope'])));
});

test('chatJson surfaces HTTP errors', async () => {
  const f = (async () => new Response('bad key', { status: 401 })) as unknown as typeof fetch;
  await assert.rejects(chatJson(cfg, { system: 's', user: 'u', validate: parseGen }, f), /401/);
});

test('config: env wins over file; missing key gives null', () => {
  assert.deepEqual(parseEnvFile('# c\nDEEPSEEK_API_KEY="abc"\nX=1'), { DEEPSEEK_API_KEY: 'abc', X: '1' });
  assert.equal(loadConfig('/nonexistent/.env', {}), null);
  const c = loadConfig('/nonexistent/.env', { DEEPSEEK_API_KEY: 'k', DEEPSEEK_BASE_URL: 'https://a.b//' });
  assert.equal(c?.baseUrl, 'https://a.b');
  assert.equal(c?.model, 'deepseek-flash');
});

test('validators reject malformed output', () => {
  assert.throws(() => parseGen({}));
  assert.throws(() => parseQuiz({ questions: [{ q: 'x', key_points: [] }] }));
  assert.throws(() => parseGrade({ score: 9, feedback: 'x' }));
  assert.equal(parseGrade({ score: 2.6, feedback: 'ok', model_answer: 'm' }).score, 3);
  assert.deepEqual(parseQuiz({ questions: [{ q: 'x', key_points: ['k'] }] })[0].keyPoints, ['k']);
});
