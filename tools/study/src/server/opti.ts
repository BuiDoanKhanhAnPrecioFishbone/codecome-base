import type { JsonRequest } from '../llm.ts';
import type { Storage } from '../storage/types.ts';
import { docsBlock, fetchDocTexts, loadIndex, pickDocs, type DocText } from '../opti/docs.ts';
import {
  MCQ_SYSTEM,
  SCENARIO_SYSTEM,
  SCN_GRADE_SYSTEM,
  mcqUser,
  parseMcq,
  parseScenario,
  parseScenarioGrade,
  scenarioUser,
  scnGradeUser,
  type Mcq,
  type Scenario,
  type ScenarioGrade,
} from '../opti/prompts.ts';
import { DOMAINS, TRACKS, allocate, trackOf, type Track } from '../opti/tracks.ts';
import { HttpError } from './notes.ts';

export interface Attempt {
  id: string;
  at: string;
  mode: 'mock' | 'practice';
  domain: string | null;
  seconds: number;
  total: number;
  correct: number;
  mcqPct: number;
  scenarioPct: number | null;
  overall: number;
  passed: boolean;
  byDomain: Record<string, { correct: number; total: number }>;
  wrong: string[];
  ids: string[];
  scenarioId: string | null;
  scenarioReview?: { title: string; answer: string; rationale: string; grade: ScenarioGrade };
}

export interface OptiDeps {
  storage: Storage;
  now: () => Date;
  callLlm: <T>(req: JsonRequest<T>) => Promise<{ data: T }>;
  docsFetch: typeof fetch;
  rng?: () => number;
}

type Body = Record<string, unknown>;

const MAX_BANK = 150;
const MAX_SCENARIOS = 30;
const MAX_ATTEMPTS = 40;
const PASS_OVERALL = 0.7;
const PASS_SECTION = 0.65;
const SCENARIO_SHARE = 0.2;

export const gradeOverall = (mcqPct: number, scenarioPct: number | null) => (scenarioPct === null ? mcqPct : (1 - SCENARIO_SHARE) * mcqPct + SCENARIO_SHARE * scenarioPct);

export const isPassed = (mcqPct: number, scenarioPct: number | null) =>
  mcqPct >= PASS_SECTION && (scenarioPct === null || scenarioPct >= PASS_SECTION) && gradeOverall(mcqPct, scenarioPct) >= PASS_OVERALL;

function shuffled<T>(list: T[], rng: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function track(body: Body | URLSearchParams): Track {
  const id = body instanceof URLSearchParams ? body.get('track') : body.track;
  try {
    return trackOf(id);
  } catch {
    throw new HttpError(400, 'Track không hợp lệ (dev-core, dev-adv, sa-core, sa-adv)');
  }
}

function domainOf(t: Track, v: unknown): string {
  if (typeof v !== 'string' || !(v in t.weights)) throw new HttpError(400, `Domain không thuộc ${t.name}: ${t.id}`);
  return v;
}

export function optiApp(deps: OptiDeps) {
  const { storage } = deps;
  const rng = deps.rng ?? Math.random;

  async function load<T>(key: string, field: string): Promise<T[]> {
    const rec = await storage.getLesson(key);
    if (!rec) return [];
    try {
      const v = (JSON.parse(rec.content) as Record<string, unknown>)[field];
      return Array.isArray(v) ? (v as T[]) : [];
    } catch {
      return [];
    }
  }
  const save = (key: string, field: string, list: unknown[]) => storage.putLesson(key, JSON.stringify({ [field]: list }));

  const bankKey = (t: Track) => `opti-bank-${t.id}`;
  const scnKey = (t: Track) => `opti-scn-${t.id}`;
  const attKey = (t: Track) => `opti-att-${t.id}`;
  const loadBank = (t: Track) => load<Mcq>(bankKey(t), 'questions');
  const loadScenarios = (t: Track) => load<Scenario>(scnKey(t), 'scenarios');
  const loadAttempts = (t: Track) => load<Attempt>(attKey(t), 'attempts');

  async function groundedDocs(domain: string, limit = 6): Promise<DocText[]> {
    let index;
    try {
      index = await loadIndex(deps.docsFetch);
    } catch (e) {
      throw new HttpError(502, `Không tải được mục lục docs.optimizely.com: ${e instanceof Error ? e.message : String(e)}`);
    }
    const docs = await fetchDocTexts(pickDocs(index, domain, limit), deps.docsFetch);
    if (docs.length < 2) throw new HttpError(502, 'Không tải đủ tài liệu từ docs.optimizely.com để tạo câu hỏi có nguồn');
    return docs;
  }

  async function generateBank(t: Track, domain: string, n: number) {
    const docs = await groundedDocs(domain);
    const bank = await loadBank(t);
    const existing = bank.filter((q) => q.domain === domain).slice(-40).map((q) => q.q);
    const { data } = await deps.callLlm<Mcq[]>({
      system: MCQ_SYSTEM,
      user: mcqUser(t, domain, docs, docsBlock(docs), n, existing),
      validate: (raw) => parseMcq(raw, docs, domain, rng),
      maxTokens: 6000,
    });
    const have = new Set(bank.map((q) => q.id));
    const fresh = data.filter((q) => !have.has(q.id));
    const next = [...bank, ...fresh].slice(-MAX_BANK);
    await save(bankKey(t), 'questions', next);
    return { added: fresh.length, bank: next.length, docs: docs.map((d) => ({ title: d.title, url: d.url })) };
  }

  async function generateScenario(t: Track, domain: string): Promise<Scenario> {
    const docs = await groundedDocs(domain);
    const list = await loadScenarios(t);
    const { data } = await deps.callLlm<Scenario>({
      system: SCENARIO_SYSTEM,
      user: scenarioUser(t, domain, docsBlock(docs), list.slice(-10).map((s) => s.title)),
      validate: (raw) => parseScenario(raw, docs, domain),
      maxTokens: 3000,
    });
    if (!list.some((s) => s.id === data.id)) await save(scnKey(t), 'scenarios', [...list, data].slice(-MAX_SCENARIOS));
    return data;
  }

  function weightedDomain(t: Track): string {
    const entries = Object.entries(t.weights);
    let r = rng() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [d, w] of entries) {
      r -= w;
      if (r <= 0) return d;
    }
    return entries[0][0];
  }

  /** Unseen questions first, then ones answered wrong before, then ones answered right. */
  function ranked(pool: Mcq[], seen: Set<string>, wrong: Set<string>): Mcq[] {
    const tier = (q: Mcq) => (!seen.has(q.id) ? 0 : wrong.has(q.id) ? 1 : 2);
    return shuffled(pool, rng).sort((a, b) => tier(a) - tier(b));
  }

  const strip = (q: Mcq) => ({ id: q.id, domain: q.domain, q: q.q, options: q.options });

  const routes: Record<string, (q: URLSearchParams, body: Body) => Promise<{ status: number; body: unknown }>> = {
    'GET /api/opti/overview': async () => {
      const out = [];
      for (const t of Object.values(TRACKS)) {
        const [bank, attempts, scenarios] = await Promise.all([loadBank(t), loadAttempts(t), loadScenarios(t)]);
        const recent = attempts.slice(-10);
        const mocks = attempts.filter((a) => a.mode === 'mock');
        out.push({
          id: t.id,
          name: t.name,
          tier: t.tier,
          role: t.role,
          mcq: t.mcq,
          minutes: t.minutes,
          scenario: t.scenario,
          blueprint: t.blueprint,
          bank: bank.length,
          scenarios: scenarios.length,
          attempts: attempts.length,
          lastMock: mocks.at(-1) ? { at: mocks.at(-1)!.at, overall: mocks.at(-1)!.overall, passed: mocks.at(-1)!.passed } : null,
          bestMock: mocks.length ? Math.max(...mocks.map((a) => a.overall)) : null,
          readiness: mocks.length ? mocks.slice(-3).reduce((s, a) => s + a.overall, 0) / Math.min(3, mocks.length) : null,
          domains: Object.entries(t.weights).map(([id, weight]) => {
            const stat = recent.reduce((acc, a) => ({ correct: acc.correct + (a.byDomain[id]?.correct ?? 0), total: acc.total + (a.byDomain[id]?.total ?? 0) }), { correct: 0, total: 0 });
            return { id, name: DOMAINS[id].name, weight, bank: bank.filter((q) => q.domain === id).length, ...stat };
          }),
        });
      }
      return { status: 200, body: { tracks: out } };
    },

    'GET /api/opti/attempts': async (q) => {
      const t = track(q);
      return { status: 200, body: { attempts: (await loadAttempts(t)).slice(-20).reverse() } };
    },

    'POST /api/opti/bank': async (_q, body) => {
      const t = track(body);
      const domain = domainOf(t, body.domain);
      const n = Math.max(1, Math.min(Number(body.n) || 8, 10));
      return { status: 200, body: await generateBank(t, domain, n) };
    },

    'POST /api/opti/scenario': async (_q, body) => {
      const t = track(body);
      if (!t.scenario) throw new HttpError(400, 'Cert này không có scenario');
      const s = await generateScenario(t, body.domain ? domainOf(t, body.domain) : weightedDomain(t));
      return { status: 200, body: { id: s.id, title: s.title } };
    },

    'POST /api/opti/exam/start': async (_q, body) => {
      const t = track(body);
      const mode = body.mode === 'practice' ? 'practice' : 'mock';
      const bank = await loadBank(t);
      const attempts = await loadAttempts(t);
      const seen = new Set<string>();
      const wrong = new Set<string>();
      for (const a of attempts) {
        for (const id of a.ids) {
          seen.add(id);
          if (a.wrong.includes(id)) wrong.add(id);
          else wrong.delete(id);
        }
      }

      let picked: Mcq[] = [];
      let wanted = t.mcq;
      if (mode === 'practice') {
        const domain = domainOf(t, body.domain);
        wanted = Math.max(1, Math.min(Number(body.n) || 10, 30));
        picked = ranked(bank.filter((q) => q.domain === domain), seen, wrong).slice(0, wanted);
      } else {
        const plan = allocate(t.weights, t.mcq);
        for (const [domain, count] of Object.entries(plan)) {
          picked.push(...ranked(bank.filter((q) => q.domain === domain), seen, wrong).slice(0, count));
        }
        picked = shuffled(picked, rng);
      }
      if (picked.length === 0) throw new HttpError(409, 'Chưa có câu hỏi trong ngân hàng. Hãy tạo câu hỏi cho từng domain trước.');

      let scenario: Scenario | null = null;
      let warning = '';
      if (t.scenario && mode === 'mock') {
        try {
          const done = new Set(attempts.map((a) => a.scenarioId));
          const pool = (await loadScenarios(t)).filter((s) => !done.has(s.id));
          scenario = pool.length ? shuffled(pool, rng)[0] : await generateScenario(t, weightedDomain(t));
        } catch (e) {
          warning = `Không tạo được scenario: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
      return {
        status: 200,
        body: {
          track: t.id,
          mode,
          minutes: mode === 'mock' ? t.minutes : Math.ceil(picked.length * 2),
          wanted,
          shortfall: Math.max(0, wanted - picked.length),
          questions: picked.map(strip),
          scenario: scenario ? { id: scenario.id, title: scenario.title, scenario: scenario.scenario, question: scenario.question } : null,
          warning,
        },
      };
    },

    'POST /api/opti/exam/submit': async (_q, body) => {
      const t = track(body);
      const mode = body.mode === 'practice' ? 'practice' : 'mock';
      const domain = mode === 'practice' ? domainOf(t, body.domain) : null;
      const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((x): x is string => typeof x === 'string'))] : [];
      if (ids.length === 0 || ids.length > 60) throw new HttpError(400, 'Cần 1-60 câu hỏi');
      const bank = new Map((await loadBank(t)).map((q) => [q.id, q]));
      if (ids.some((id) => !bank.has(id))) throw new HttpError(400, 'Có câu hỏi không còn trong ngân hàng');
      const answers = (body.answers && typeof body.answers === 'object' ? body.answers : {}) as Record<string, unknown>;

      const review = ids.map((id) => {
        const q = bank.get(id)!;
        const picked = Number.isInteger(answers[id]) ? (answers[id] as number) : null;
        return { ...q, picked, correct: picked === q.answer };
      });
      const byDomain: Attempt['byDomain'] = {};
      for (const r of review) {
        const d = (byDomain[r.domain] ??= { correct: 0, total: 0 });
        d.total++;
        if (r.correct) d.correct++;
      }
      const correct = review.filter((r) => r.correct).length;
      const mcqPct = correct / review.length;

      let scenarioPct: number | null = null;
      let scenarioReview: Attempt['scenarioReview'];
      let scenarioId: string | null = null;
      if (t.scenario && typeof body.scenarioId === 'string') {
        const s = (await loadScenarios(t)).find((x) => x.id === body.scenarioId);
        if (!s) throw new HttpError(400, 'Scenario không còn trong ngân hàng');
        scenarioId = s.id;
        const answer = typeof body.scenarioAnswer === 'string' ? body.scenarioAnswer.trim().slice(0, 4000) : '';
        const rationale = typeof body.rationale === 'string' ? body.rationale.trim().slice(0, 4000) : '';
        if (answer.length < 20) {
          scenarioPct = 0;
        } else {
          const own = await fetchDocTexts([{ title: s.title, url: s.source, product: '' }], deps.docsFetch);
          const more = await groundedDocs(s.domain, 4);
          const docs = [...own, ...more.filter((d) => d.url !== s.source)];
          const { data } = await deps.callLlm<ScenarioGrade>({
            system: SCN_GRADE_SYSTEM,
            user: scnGradeUser(s, docsBlock(docs), answer, rationale),
            validate: (raw) => parseScenarioGrade(raw, s),
            maxTokens: 2500,
          });
          scenarioPct = data.pct;
          scenarioReview = { title: s.title, answer, rationale, grade: data };
        }
      }

      const overall = gradeOverall(mcqPct, scenarioPct);
      const attempt: Attempt = {
        id: deps.now().getTime().toString(36),
        at: deps.now().toISOString(),
        mode,
        domain,
        seconds: Math.max(0, Math.min(Number(body.seconds) || 0, 24 * 3600)),
        total: review.length,
        correct,
        mcqPct,
        scenarioPct,
        overall,
        passed: isPassed(mcqPct, scenarioPct),
        byDomain,
        wrong: review.filter((r) => !r.correct).map((r) => r.id),
        ids,
        scenarioId,
        scenarioReview,
      };
      await save(attKey(t), 'attempts', [...(await loadAttempts(t)), attempt].slice(-MAX_ATTEMPTS));
      return { status: 200, body: { attempt, review } };
    },
  };

  return routes;
}
