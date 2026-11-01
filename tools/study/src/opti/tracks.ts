export interface Domain {
  id: string;
  name: string;
  topics: string;
  /** Words matched against doc titles/slugs (lower-case) to pick grounding pages. */
  keywords: string[];
  /** Doc products to search, in priority order. */
  products: string[];
}

export const DOMAINS: Record<string, Domain> = {
  cloud: {
    id: 'cloud',
    name: 'Cloud & Deployment',
    topics: 'deployment, CI/CD, build pipeline, environments, configuration, cloud hosting, auto scaling, CDN, high availability, caching, edge, performance, logging, monitoring, observability, troubleshooting, database',
    keywords: ['deploy', 'environment', 'cdn', 'smooth', 'performance', 'monitor', 'troubleshoot', 'health', 'cache', 'warming', 'scal', 'logging', 'database', 'release', 'code package'],
    products: ['dxp', 'cms-12', 'cms-13'],
  },
  security: {
    id: 'security',
    name: 'User Management & Security',
    topics: 'content permissions, access control, visitor groups, personalization, on-page editing',
    keywords: ['permission', 'access right', 'security', 'role', 'authorization', 'visitor group', 'audience', 'on-page', 'editing'],
    products: ['cms-12', 'cms-13', 'dxp'],
  },
  delivery: {
    id: 'delivery',
    name: 'Content Delivery (Graph, headless, search)',
    topics: 'GraphQL, headless, indexing, full-text search, real-time sync, webhooks, content sync, multi-channel, API authentication, query building, pagination',
    keywords: ['graphql', 'query', 'webhook', 'synchron', 'authentication', 'headless', 'filter', 'pagination', 'search', 'index', 'get started', 'cache'],
    products: ['graph', 'cms-13', 'cms-12'],
  },
  access: {
    id: 'access',
    name: 'Access & Identity',
    topics: 'access control, content security, roles, user provisioning, SSO, organization, enterprise SSO, cross-product identity, permissions',
    keywords: ['sso', 'scim', 'provision', 'identity', 'user', 'role', 'organization', 'permission', 'login', 'authentication', 'access'],
    products: ['opti-id', 'dxp', 'cms-12'],
  },
  devex: {
    id: 'devex',
    name: 'Developer Experience (editors, plugins, events, integrations)',
    topics: 'on-page editing, custom editors, plugins, integrations, content events, initialization modules, DAM, data migration, content export, marketing automation, AI content generation',
    keywords: ['initialization', 'editor', 'plugin', 'event', 'integrat', 'dam', 'migration', 'export', 'import', 'extend', 'custom', 'scheduled job', 'dependency injection', 'opal', 'add-on'],
    products: ['cms-12', 'cms-13', 'graph'],
  },
  personalization: {
    id: 'personalization',
    name: 'Personalization',
    topics: 'visitor groups, audiences, geo/behavioral targeting, real-time segments, recommendations, A/B testing',
    keywords: ['personalization', 'audience', 'visitor group', 'segment', 'target', 'recommend', 'a/b', 'experiment'],
    products: ['cms-12', 'cms-13'],
  },
  modeling: {
    id: 'modeling',
    name: 'Content Modeling',
    topics: 'content types, property configuration, content area, editor registration, rich text, block composition, validation, editor hints, tab grouping, custom property types',
    keywords: ['content type', 'propert', 'block', 'content area', 'rich text', 'validation', 'editor', 'tab', 'visual builder', 'page type', 'model'],
    products: ['cms-12', 'cms-13'],
  },
  multisite: {
    id: 'multisite',
    name: 'Multi-site & Localization',
    topics: 'multi-site, site configuration, content reuse, multilingual, localization, site structure, URL management',
    keywords: ['multisite', 'multi-site', 'site', 'language', 'globaliz', 'locali', 'translation', 'host', 'url', 'routing'],
    products: ['cms-12', 'dxp', 'cms-13'],
  },
  publishing: {
    id: 'publishing',
    name: 'Content Management & Publishing',
    topics: 'approval workflows, scheduled jobs, versions, content events, scheduled publishing, trash, categories, content type conversion',
    keywords: ['approval', 'workflow', 'scheduled', 'version', 'publish', 'trash', 'categor', 'project', 'content manage'],
    products: ['cms-12', 'cms-13'],
  },
  assets: {
    id: 'assets',
    name: 'Assets & Media',
    topics: 'Visual Builder, drag and drop, DAM, AI content generation, brand guidelines',
    keywords: ['asset', 'media', 'dam', 'visual builder', 'image', 'blob', 'opal', 'brand'],
    products: ['cms-12', 'cms-13'],
  },
};

export interface Track {
  id: string;
  name: string;
  tier: 'core' | 'advanced';
  role: 'developer' | 'solutions_architect';
  mcq: number;
  minutes: number;
  /** Developer exams add a scenario question graded with a written rationale. */
  scenario: boolean;
  weights: Record<string, number>;
  blueprint: string;
}

const bp = (tier: string, role: string) => `https://certification.optimizely.com/blueprint?track=cms-paas&tier=${tier}&role=${role}`;

export const TRACKS: Record<string, Track> = {
  'dev-core': {
    id: 'dev-core',
    name: 'CMS PaaS Core Developer',
    tier: 'core',
    role: 'developer',
    mcq: 30,
    minutes: 75,
    scenario: true,
    weights: { cloud: 10, security: 15, delivery: 20, access: 10, devex: 45 },
    blueprint: bp('core', 'developer'),
  },
  'dev-adv': {
    id: 'dev-adv',
    name: 'CMS PaaS Advanced Developer',
    tier: 'advanced',
    role: 'developer',
    mcq: 20,
    minutes: 90,
    scenario: true,
    weights: { cloud: 20, security: 10, delivery: 30, access: 10, devex: 30 },
    blueprint: bp('advanced', 'developer'),
  },
  'sa-core': {
    id: 'sa-core',
    name: 'CMS PaaS Core Solutions Architect',
    tier: 'core',
    role: 'solutions_architect',
    mcq: 30,
    minutes: 75,
    scenario: false,
    weights: { modeling: 15, personalization: 5, cloud: 20, multisite: 10, publishing: 10, delivery: 20, access: 5, devex: 15 },
    blueprint: bp('core', 'solutions_architect'),
  },
  'sa-adv': {
    id: 'sa-adv',
    name: 'CMS PaaS Advanced Solutions Architect',
    tier: 'advanced',
    role: 'solutions_architect',
    mcq: 20,
    minutes: 90,
    scenario: false,
    weights: { modeling: 7, personalization: 10, cloud: 28, multisite: 18, assets: 3, delivery: 22, access: 12 },
    blueprint: bp('advanced', 'solutions_architect'),
  },
};

export function trackOf(id: unknown): Track {
  const t = typeof id === 'string' ? TRACKS[id] : undefined;
  if (!t) throw new Error('Track không hợp lệ');
  return t;
}

/** Split `total` questions across domains by weight (largest remainder), so the mock mirrors the blueprint. */
export function allocate(weights: Record<string, number>, total: number): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const raw = Object.entries(weights).map(([id, w]) => ({ id, exact: (w / sum) * total }));
  const out: Record<string, number> = {};
  let used = 0;
  for (const r of raw) {
    out[r.id] = Math.floor(r.exact);
    used += out[r.id];
  }
  const order = [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) || b.exact - a.exact);
  for (let i = 0; used < total; i++, used++) out[order[i % order.length].id]++;
  return out;
}
