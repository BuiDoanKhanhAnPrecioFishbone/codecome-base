import { DOMAINS } from './tracks.ts';

export interface DocRef {
  title: string;
  url: string;
  product: string;
}

export interface DocText extends DocRef {
  text: string;
}

const INDEX_URL = 'https://docs.optimizely.com/llms.txt';
const LINE = /^- \[([^\]]+)\]\((https:\/\/docs\.optimizely\.com\/([a-z0-9-]+)\/docs\/[^)\s]+?)\.md\)/;
const NOISE = /release notes?|changelog|what'?s new|mailing|mark chat|deprecat|end of life/i;
const PRODUCTS = new Set(['cms-12', 'cms-13', 'dxp', 'graph', 'opti-id']);

let cached: Promise<DocRef[]> | undefined;

export function parseIndex(text: string): DocRef[] {
  const out: DocRef[] = [];
  for (const line of text.split('\n')) {
    const m = LINE.exec(line.trim());
    if (m && PRODUCTS.has(m[3])) out.push({ title: m[1], url: m[2], product: m[3] });
  }
  return out;
}

export function loadIndex(fetchFn: typeof fetch = fetch): Promise<DocRef[]> {
  cached ??= fetchFn(INDEX_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`docs index HTTP ${r.status}`);
      return r.text();
    })
    .then(parseIndex)
    .catch((e) => {
      cached = undefined;
      throw e;
    });
  return cached;
}

export function resetIndexCache() {
  cached = undefined;
}

function score(doc: DocRef, keywords: string[], products: string[]): number {
  const title = doc.title.toLowerCase();
  const slug = doc.url.slice(doc.url.lastIndexOf('/') + 1).toLowerCase();
  let s = 0;
  for (const k of keywords) {
    if (title.includes(k)) s += 2;
    else if (slug.includes(k)) s += 1;
  }
  if (s === 0 || NOISE.test(doc.title)) return 0;
  const rank = products.indexOf(doc.product);
  return rank < 0 ? 0 : s + (products.length - rank);
}

/** Hand-checked core pages per domain (`product/slug`); keyword scoring only fills the remaining slots. */
export const PINS: Record<string, string[]> = {
  cloud: ['dxp/deploying', 'dxp/smooth-deploy', 'dxp/environment-configurations', 'dxp/cdn-recommendations', 'dxp/application-performance-management', 'dxp/development-considerations'],
  security: ['cms-12/access-rights-with-opti-id', 'cms-12/access-rights-without-opti-id', 'cms-12/set-permissions', 'cms-12/permissions-to-functions', 'dxp/optimizely-platform-security', 'cms-12/audiences'],
  delivery: ['graph/get-started-with-the-graphql-api', 'graph/authentication', 'graph/webhooks', 'dxp/headless-optimizely', 'dxp/nextjs-isr-caching-and-optimizely-graph-webhooks'],
  access: ['opti-id/overview-of-configuring-your-own-sso-for-opti-id', 'opti-id/overview-of-scim-provisioning-for-opti-id', 'cms-12/access-rights-with-opti-id', 'cms-13/set-access-rights-with-opti-id', 'cms-13/use-opti-id-with-separate-visitor-authentication'],
  devex: ['cms-12/creating-an-initialization-module', 'cms-12/dependency-injection', 'cms-12/scheduled-jobs', 'cms-12/developing-an-event-provider', 'cms-12/registering-a-custom-editor', 'cms-12/integrate-optimizely-products'],
  personalization: ['cms-12/audiences', 'cms-12/audience-criteria', 'cms-12/developing-custom-visitor-group-criteria', 'cms-12/odp-cms'],
  modeling: ['cms-12/content-types', 'cms-12/properties', 'cms-13/building-blocks-of-content-modeling', 'cms-13/advanced-content-types', 'cms-12/using-a-block-as-a-property', 'cms-12/restricting-content-types-in-properties'],
  multisite: ['dxp/multisite-development', 'cms-12/languages', 'cms-12/language-routing-1', 'cms-12/manage-website-languages'],
  publishing: ['cms-12/approval-sequences', 'cms-12/publish-versions-of-content', 'cms-12/scheduled-jobs', 'cms-12/compare-versions-of-content'],
  assets: ['cms-12/assets-and-media', 'cms-13/digital-asset-management-dam', 'cms-13/manage-assets-with-dam', 'cms-12/cmp-dam-asset-picker'],
};

const BASE = 'https://docs.optimizely.com';

function pinRef(index: DocRef[], pin: string): DocRef {
  const [product, slug] = pin.split('/');
  const url = `${BASE}/${product}/docs/${slug}`;
  return index.find((d) => d.url === url) ?? { title: slug.replace(/-/g, ' '), url, product };
}

/** Pinned pages first, then the highest-scoring doc pages for a domain; stable for the same index. */
export function pickDocs(index: DocRef[], domainId: string, limit = 5): DocRef[] {
  const d = DOMAINS[domainId];
  if (!d) return [];
  const pinned = (PINS[domainId] ?? []).map((p) => pinRef(index, p));
  const seen = new Set<string>(pinned.map((p) => p.url));
  const scored = index
    .map((doc) => ({ doc, s: score(doc, d.keywords, d.products) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.doc.url.localeCompare(b.doc.url))
    .filter(({ doc }) => {
      const key = doc.title.toLowerCase();
      if (seen.has(doc.url) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((x) => x.doc);
  return [...pinned, ...scored].slice(0, limit);
}

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

export function cleanMarkdown(md: string, max: number): string {
  const body = md.replace(FRONTMATTER, '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return body.length > max ? `${body.slice(0, max)}\n…` : body;
}

export async function fetchDocTexts(docs: DocRef[], fetchFn: typeof fetch = fetch, maxChars = 5000): Promise<DocText[]> {
  const settled = await Promise.all(
    docs.map(async (d) => {
      try {
        const r = await fetchFn(`${d.url}.md`);
        if (!r.ok) return null;
        return { ...d, text: cleanMarkdown(await r.text(), maxChars) };
      } catch {
        return null;
      }
    }),
  );
  return settled.filter((d): d is DocText => d !== null && d.text.length > 200);
}

export function docsBlock(docs: DocText[]): string {
  return docs.map((d, i) => `### DOC ${i + 1}: ${d.title}\nURL: ${d.url}\n\n${d.text}`).join('\n\n');
}
