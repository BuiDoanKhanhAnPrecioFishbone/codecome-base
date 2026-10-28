import type { LessonStrand } from './server/lessons.ts';

export interface Source {
  name: string;
  url: string;
}

const OPTI_DOCS = 'https://docs.developers.optimizely.com';
const CMS_DOCS = `${OPTI_DOCS}/content-management-system/docs`;
const CERT = 'https://certification.optimizely.com';

// Every URL here returned 200 with a real page title when checked (28/10/2026).
export const SEED_SOURCES: Record<LessonStrand, Source[]> = {
  S: [
    { name: 'Kubernetes: Overview', url: 'https://kubernetes.io/docs/concepts/overview/' },
    { name: 'Docker overview', url: 'https://docs.docker.com/get-started/docker-overview/' },
    { name: 'MDN: HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP' },
    { name: 'RFC 9110 HTTP Semantics', url: 'https://www.rfc-editor.org/rfc/rfc9110' },
    { name: 'RFC 9293 TCP', url: 'https://www.rfc-editor.org/rfc/rfc9293' },
    { name: 'Linux man pages', url: 'https://man7.org/linux/man-pages/' },
    { name: 'Google SRE Book', url: 'https://sre.google/sre-book/table-of-contents/' },
    { name: '.NET Architecture Guides', url: 'https://learn.microsoft.com/en-us/dotnet/architecture/' },
    { name: 'Azure Architecture Center', url: 'https://learn.microsoft.com/en-us/azure/architecture/' },
    { name: 'PostgreSQL docs', url: 'https://www.postgresql.org/docs/current/' },
    { name: 'OpenTelemetry docs', url: 'https://opentelemetry.io/docs/' },
    { name: 'Martin Fowler: Architecture', url: 'https://martinfowler.com/architecture/' },
    { name: 'AWS Well-Architected', url: 'https://aws.amazon.com/architecture/well-architected/' },
    { name: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/' },
    { name: 'The Twelve-Factor App', url: 'https://12factor.net/' },
    { name: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer' },
    { name: 'Helm docs', url: 'https://helm.sh/docs/' },
    { name: 'GitHub Actions docs', url: 'https://docs.github.com/en/actions' },
  ],
  F: [
    { name: 'MDN: JavaScript', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
    { name: 'MDN: Web Performance', url: 'https://developer.mozilla.org/en-US/docs/Web/Performance' },
    { name: 'React: Learn', url: 'https://react.dev/learn' },
    { name: 'React: Reference', url: 'https://react.dev/reference/react' },
    { name: 'TypeScript docs', url: 'https://www.typescriptlang.org/docs/' },
    { name: 'web.dev Learn', url: 'https://web.dev/learn' },
    { name: 'web.dev: Core Web Vitals', url: 'https://web.dev/articles/vitals' },
    { name: 'Next.js docs', url: 'https://nextjs.org/docs' },
    { name: 'Chrome DevTools', url: 'https://developer.chrome.com/docs/devtools' },
    { name: 'WCAG overview (W3C)', url: 'https://www.w3.org/WAI/standards-guidelines/wcag/' },
    { name: 'TanStack Query', url: 'https://tanstack.com/query/latest' },
    { name: 'Playwright docs', url: 'https://playwright.dev/docs/intro' },
    { name: 'Vitest guide', url: 'https://vitest.dev/guide/' },
  ],
  A: [
    { name: 'Anthropic docs', url: 'https://docs.anthropic.com/en/docs/overview' },
    { name: 'Hugging Face Learn', url: 'https://huggingface.co/learn' },
    { name: 'Ollama', url: 'https://github.com/ollama/ollama' },
    { name: 'OWASP GenAI Security', url: 'https://genai.owasp.org/' },
    { name: 'Karpathy: Zero to Hero', url: 'https://karpathy.ai/zero-to-hero.html' },
    { name: 'Model Context Protocol', url: 'https://modelcontextprotocol.io/introduction' },
    { name: 'Langfuse docs', url: 'https://langfuse.com/docs' },
    { name: 'pgvector', url: 'https://github.com/pgvector/pgvector' },
    { name: 'Anthropic: Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
    { name: 'AI for .NET developers', url: 'https://learn.microsoft.com/en-us/dotnet/ai/' },
  ],
  D: [
    { name: 'CP-Algorithms', url: 'https://cp-algorithms.com/' },
    { name: 'VisuAlgo', url: 'https://visualgo.net/en' },
    { name: 'NeetCode Roadmap', url: 'https://neetcode.io/roadmap' },
    { name: 'Big-O Cheat Sheet', url: 'https://www.bigocheatsheet.com/' },
    { name: '.NET collections', url: 'https://learn.microsoft.com/en-us/dotnet/standard/collections/' },
    { name: 'Algorithms 4th ed. (Princeton)', url: 'https://algs4.cs.princeton.edu/home/' },
    { name: 'MIT 6.006 Algorithms', url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/' },
  ],
  O: [
    { name: 'Certification: Foundations blueprint', url: `${CERT}/blueprint?track=foundation&tier=foundation` },
    { name: 'Certification: CMS PaaS Core Developer blueprint', url: `${CERT}/blueprint?track=cms-paas&tier=core&role=developer` },
    { name: 'Certification: CMS PaaS Advanced Developer blueprint', url: `${CERT}/blueprint?track=cms-paas&tier=advanced&role=developer` },
    { name: 'Certification: CMS PaaS Core Solutions Architect blueprint', url: `${CERT}/blueprint?track=cms-paas&tier=core&role=solutions-architect` },
    { name: 'Certification: Exams', url: `${CERT}/exams` },
    { name: 'Certification: Program', url: `${CERT}/program` },
    { name: 'Certification: FAQ', url: `${CERT}/faq` },
    { name: 'CMS 12: Getting started', url: `${CMS_DOCS}/getting-started` },
    { name: 'CMS 12: Architecture', url: `${CMS_DOCS}/architecture` },
    { name: 'CMS 12: Initialization', url: `${CMS_DOCS}/initialization` },
    { name: 'CMS 12: Scheduled jobs', url: `${CMS_DOCS}/scheduled-jobs` },
    { name: 'CMS 12: Content types', url: `${CMS_DOCS}/content-types` },
    { name: 'CMS 12: Properties', url: `${CMS_DOCS}/properties` },
    { name: 'CMS 12: Blocks', url: `${CMS_DOCS}/blocks` },
    { name: 'CMS 12: Dependency injection', url: `${CMS_DOCS}/dependency-injection` },
    { name: 'CMS 12: Routing', url: `${CMS_DOCS}/routing` },
    { name: 'CMS 12: Rendering', url: `${CMS_DOCS}/rendering` },
    { name: 'CMS 12: Permissions', url: `${CMS_DOCS}/permissions` },
    { name: 'CMS 12: Personalization', url: `${CMS_DOCS}/personalization` },
    { name: 'CMS 12: Security', url: `${CMS_DOCS}/security` },
    { name: 'CMS 12: Search', url: `${CMS_DOCS}/search` },
    { name: 'CMS 12: Globalization', url: `${CMS_DOCS}/globalization` },
    { name: 'CMS 12: Assets and media', url: `${CMS_DOCS}/assets-and-media` },
    { name: 'CMS 12: Object caching', url: `${CMS_DOCS}/object-caching` },
    { name: 'CMS 12: Configuration', url: `${CMS_DOCS}/configuration` },
    { name: 'CMS 12: Dynamic data store', url: `${CMS_DOCS}/dynamic-data-store` },
    { name: 'CMS 12: Add-ons', url: `${CMS_DOCS}/add-ons` },
    { name: 'CMS 12: Content providers', url: `${CMS_DOCS}/content-providers` },
    { name: 'CMS 12: Content approvals', url: `${CMS_DOCS}/content-approvals` },
    { name: 'CMS 12: Projects', url: `${CMS_DOCS}/projects` },
    { name: 'CMS 12: Upgrade to CMS 12', url: `${CMS_DOCS}/upgrade-to-cms-12` },
    { name: 'CMS 12: DAM in CMS', url: `${CMS_DOCS}/cmp-dam-in-cms` },
    { name: 'CMS 12: Release notes', url: `${CMS_DOCS}/release-notes` },
    { name: 'DXP: Overview', url: `${OPTI_DOCS}/digital-experience-platform/docs/dxp-overview` },
    { name: 'DXP: Deployment API', url: `${OPTI_DOCS}/digital-experience-platform/docs/deployment-api` },
    { name: 'DXP: Environments', url: `${OPTI_DOCS}/digital-experience-platform/docs/environments` },
    { name: 'DXP: Logging', url: `${OPTI_DOCS}/digital-experience-platform/docs/logging` },
    { name: 'Commerce Connect: Getting started', url: `${OPTI_DOCS}/commerce-connect/docs/getting-started` },
    { name: 'Feature Experimentation: Introduction', url: `${OPTI_DOCS}/feature-experimentation/docs/introduction` },
    { name: 'Optimizely: CMS product page', url: 'https://www.optimizely.com/products/content-management/' },
    { name: 'Optimizely: Commerce product page', url: 'https://www.optimizely.com/products/commerce/' },
    { name: 'Optimizely: Data Platform (ODP) product page', url: 'https://www.optimizely.com/products/data-platform/' },
    { name: 'Optimizely: Feature Experimentation product page', url: 'https://www.optimizely.com/products/feature-experimentation/' },
    { name: 'Optimizely: Web Experimentation product page', url: 'https://www.optimizely.com/products/web-experimentation/' },
    { name: 'Optimizely Support', url: 'https://support.optimizely.com/hc/en-us' },
    { name: 'Optimizely World', url: 'https://world.optimizely.com/' },
    { name: 'Alloy MVC template', url: 'https://github.com/episerver/alloy-mvc-template' },
  ],
};

export function allowedHosts(): Set<string> {
  const hosts = new Set<string>();
  for (const list of Object.values(SEED_SOURCES)) for (const s of list) hosts.add(new URL(s.url).hostname.replace(/^www\./, ''));
  return hosts;
}

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

export function sourcesPrompt(strand: LessonStrand): string {
  const list = SEED_SOURCES[strand].map((s) => `- [${s.name}](${s.url})`).join('\n');
  return `Verified source links (all checked and working) for this strand:\n${list}\nCite from this list. You may link a deeper page only on the same hosts and only when you are certain the exact URL exists; every link is machine-checked afterwards and broken or unknown ones are removed.`;
}

const LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;
const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;
// readme.io answers 200 for unknown pages and shows the portal homepage.
const SOFT_404_TITLE = /^Optimizely One - Homepage$/i;
const TIMEOUT_MS = 8000;

async function isAlive(url: string, fetchFn: typeof fetch): Promise<boolean> {
  try {
    const res = await fetchFn(url.split('#')[0], {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (study-link-check)' },
    });
    if (res.status === 404 || res.status === 410) return false;
    if (res.status >= 200 && res.status < 300) {
      const title = TITLE_RE.exec(await res.text())?.[1]?.trim() ?? '';
      return !SOFT_404_TITLE.test(title);
    }
    return true; // 403/429/5xx are usually bot-blocks or transient; keep the link
  } catch (e) {
    const code = (e as { cause?: { code?: string } })?.cause?.code;
    return !(code === 'ENOTFOUND' || code === 'ERR_INVALID_URL');
  }
}

export interface LinkReport {
  markdown: string;
  kept: number;
  removed: string[];
}

/** Unlinks links to unknown hosts and, when fetchFn is given, links that are dead. */
export async function verifyLinks(md: string, fetchFn?: typeof fetch | null): Promise<LinkReport> {
  const allowed = allowedHosts();
  const urls = new Set<string>();
  for (const m of md.matchAll(LINK_RE)) {
    const host = hostOf(m[2]);
    if (host && allowed.has(host)) urls.add(m[2]);
  }
  const dead = new Set<string>();
  if (fetchFn) {
    await Promise.all(
      [...urls].map(async (u) => {
        if (!(await isAlive(u, fetchFn))) dead.add(u);
      }),
    );
  }
  const removed: string[] = [];
  let kept = 0;
  const out = md.replace(LINK_RE, (_all, text: string, url: string) => {
    if (urls.has(url) && !dead.has(url)) {
      kept++;
      return `[${text}](${url})`;
    }
    removed.push(url);
    return text;
  });
  return { markdown: out, kept, removed };
}
