import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyLinks } from './sources.ts';

const OK = 'https://kubernetes.io/docs/concepts/overview/';
const DOCS = 'https://docs.developers.optimizely.com/content-management-system/docs/initialization';

function pages(map: Record<string, { status: number; title?: string } | 'dns' | 'timeout'>): typeof fetch {
  return (async (url: string) => {
    const hit = map[url];
    if (hit === 'dns') throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    if (hit === 'timeout') throw new DOMException('timed out', 'TimeoutError');
    const { status, title } = hit ?? { status: 404 };
    return new Response(`<html><title>${title ?? 'Real page'}</title></html>`, { status });
  }) as unknown as typeof fetch;
}

test('verifyLinks keeps live links and unlinks unknown hosts', async () => {
  const md = `See [K8s](${OK}) and [Fake](https://evil.example.com/x).`;
  const r = await verifyLinks(md, pages({ [OK]: { status: 200 } }));
  assert.equal(r.markdown, `See [K8s](${OK}) and Fake.`);
  assert.deepEqual(r.removed, ['https://evil.example.com/x']);
  assert.equal(r.kept, 1);
});

test('verifyLinks drops 404, DNS failures and readme.io soft-404 pages', async () => {
  const soft = 'https://docs.developers.optimizely.com/content-management-system/docs/nope';
  const md = `[a](${OK}) [b](${DOCS}) [c](${soft}) [d](https://docs.docker.com/gone)`;
  const r = await verifyLinks(
    md,
    pages({ [OK]: { status: 404 }, [DOCS]: { status: 200, title: 'Initialize CMS - CMS 12 documentation' }, [soft]: { status: 200, title: 'Optimizely One - Homepage' }, 'https://docs.docker.com/gone': 'dns' }),
  );
  assert.equal(r.markdown, `a [b](${DOCS}) c d`);
});

test('verifyLinks keeps links on bot-blocks and timeouts', async () => {
  const r = await verifyLinks(`[a](${OK}) [b](${DOCS})`, pages({ [OK]: { status: 403 }, [DOCS]: 'timeout' }));
  assert.equal(r.kept, 2);
});

test('verifyLinks without a fetch only applies the host allowlist', async () => {
  const r = await verifyLinks(`[a](${OK}) [b](https://evil.example.com/)`, null);
  assert.equal(r.markdown, `[a](${OK}) b`);
});
