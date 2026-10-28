import { cardsSuffix, parseCards, scanNoteTexts } from '../cards.ts';
import { chatJson, loadConfig, type JsonRequest, type LlmConfig } from '../llm.ts';
import type { Paths } from '../paths.ts';
import {
  GEN_SYSTEM, GRADE_SYSTEM, LESSON_SYSTEM, QUIZ_SYSTEM, genUser, gradeUser, lessonUser, parseGen, parseGrade, parseLesson, parseQuiz, quizUser,
} from '../prompts.ts';
import { buildQueue, countNewDoneToday, isDue, shuffle, startOfLocalDay } from '../queue.ts';
import { computeStats } from '../stats.ts';
import { fileStorage } from '../storage/file.ts';
import type { QuizLog, Storage } from '../storage/types.ts';
import { applyReview, previewIntervals, syncCards, State, type ReviewEntry, type StoredCard, type StudyState } from '../store.ts';
import type { Grade } from '../store.ts';
import { HttpError, checkNotePath, createNote, listNotes, readNote, titleOf, writeNote } from './notes.ts';
import { STRAND_LABEL, lessonKey, parseLessonKey, readLesson, topicOf, writeLesson } from './lessons.ts';
import { addDays, dayKey, loadRoadmap, planFor, weekOf, type Week } from './roadmap.ts';
import { verifyLinks } from '../sources.ts';

const MAX_NOTE_CHARS = 60_000;

export interface Ctx {
  paths: Paths;
  storage?: Storage;
  now: () => Date;
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  linkFetch?: typeof fetch;
}

export interface Reply {
  status: number;
  body: unknown;
}

type Body = Record<string, unknown>;

const ok = (body: unknown): Reply => ({ status: 200, body });

function isDayKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && dayKey(new Date(`${v}T00:00:00`)) === v;
}

export function quizArea(file: string): string {
  const m = /(?:^|[\\/])notes[\\/]([^\\/]+)[\\/]/.exec(file);
  if (m) return m[1];
  const parts = file.split(/[\\/]/);
  return parts.length > 1 ? parts[0] : 'misc';
}

export function createApp(ctx: Ctx) {
  const { paths } = ctx;
  const storage = ctx.storage ?? fileStorage(paths);
  const readQuiz = () => storage.readQuiz();
  const readReviews = () => storage.readReviews();

  async function syncState(): Promise<StudyState> {
    const state = await storage.loadState();
    const notes = await storage.listNotes();
    const r = syncCards(state, scanNoteTexts(notes), ctx.now());
    if (r.added + r.updated + r.orphaned + r.restored > 0) await storage.saveState(state);
    return state;
  }

  function llm(): LlmConfig {
    const cfg = loadConfig(paths.envFile, ctx.env ?? process.env);
    if (!cfg) throw new HttpError(503, 'Chưa có DEEPSEEK_API_KEY. Đặt trong file .env ở thư mục gốc repo rồi khởi động lại server.');
    return cfg;
  }

  async function callLlm<T>(req: JsonRequest<T>) {
    try {
      return await chatJson<T>(llm(), req, ctx.fetch);
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(502, e instanceof Error ? e.message : String(e));
    }
  }

  async function noteText(rel: unknown): Promise<{ rel: string; text: string; area: string }> {
    const n = await readNote(storage, rel);
    return { rel: n.path, text: n.content.slice(0, MAX_NOTE_CHARS), area: n.area };
  }

  async function weekStats(weeks: Week[], now: Date) {
    const key = dayKey(now);
    const week = weekOf(weeks, key);
    const daily = await storage.loadDaily();
    let doneMin = 0;
    let totalMin = 0;
    if (week) {
      for (let i = 0; i < 7; i++) {
        const day = addDays(week.start, i);
        const items = planFor(week, day);
        const done = new Set(daily[day] ?? []);
        for (const it of items) {
          totalMin += it.minutes;
          if (done.has(it.slot)) doneMin += it.minutes;
        }
      }
    }
    return { week, doneMin, totalMin };
  }

  /** Study items from the last 7 days that were never ticked. English and review are daily habits, so they are not carried over. */
  async function missedItems(weeks: Week[], key: string, today: { strand: string; title: string }[]) {
    const first = weeks[0]?.start;
    if (!first) return [];
    const daily = await storage.loadDaily();
    const from = addDays(key, -7) < first ? first : addDays(key, -7);
    const studied = new Set(today.map((it) => `${it.strand}|${it.title}`));
    const seen = new Set<string>();
    const out: { date: string; week: number; slot: string; strand: string; minutes: number; title: string; detail?: string }[] = [];
    for (let day = from; day < key; day = addDays(day, 1)) {
      const w = weekOf(weeks, day);
      if (!w) continue;
      const done = new Set(daily[day] ?? []);
      for (const it of planFor(w, day)) {
        if (it.strand === 'REV' || it.strand === 'EN') continue;
        if (done.has(it.slot)) studied.add(`${it.strand}|${it.title}`);
        else seen.add(JSON.stringify([day, it.slot]));
      }
    }
    for (let day = from; day < key; day = addDays(day, 1)) {
      const w = weekOf(weeks, day);
      if (!w) continue;
      for (const it of planFor(w, day)) {
        const id = `${it.strand}|${it.title}`;
        if (!seen.has(JSON.stringify([day, it.slot])) || studied.has(id)) continue;
        studied.add(id);
        out.push({ date: day, week: w.n, ...it });
      }
    }
    return out;
  }

  function areaRows(cards: StoredCard[], reviews: ReviewEntry[], quiz: QuizLog[], now: Date) {
    const since = startOfLocalDay(now).getTime() - 29 * 86_400_000;
    const rows = new Map<string, { total: number; due: number; mature: number; remembered: number; quizN: number; quizSum: number }>();
    const row = (a: string) => {
      const r = rows.get(a) ?? { total: 0, due: 0, mature: 0, remembered: 0, quizN: 0, quizSum: 0 };
      rows.set(a, r);
      return r;
    };
    for (const c of cards) {
      if (c.orphan) continue;
      const r = row(c.area);
      r.total++;
      if (isDue(c, now)) r.due++;
    }
    for (const r of reviews) {
      if (new Date(r.ts).getTime() < since || r.stateBefore !== State.Review) continue;
      const x = row(r.area);
      x.mature++;
      if (r.rating >= 2) x.remembered++;
    }
    for (const q of quiz) {
      if (new Date(q.ts).getTime() < since) continue;
      const x = row(quizArea(q.file));
      x.quizN++;
      x.quizSum += q.score;
    }
    return [...rows.entries()]
      .map(([area, r]) => ({
        area,
        total: r.total,
        due: r.due,
        retention: r.mature >= 5 ? r.remembered / r.mature : null,
        quizAvg: r.quizN > 0 ? r.quizSum / r.quizN : null,
      }))
      .sort((a, b) => a.area.localeCompare(b.area));
  }

  const routes: Record<string, (q: URLSearchParams, body: Body) => Promise<Reply> | Reply> = {
    'GET /api/status': async () => {
      const cfg = loadConfig(paths.envFile, ctx.env ?? process.env);
      return ok({
        llm: cfg ? { configured: true, model: cfg.model } : { configured: false },
        notes: (await storage.listNotes()).length,
        storage: storage.kind,
      });
    },

    'GET /api/today': async () => {
      const now = ctx.now();
      const state = await syncState();
      const cards = Object.values(state.cards);
      const reviews = await readReviews();
      const weeks = loadRoadmap(paths.roadmapFile);
      const key = dayKey(now);
      const { week, doneMin, totalMin } = await weekStats(weeks, now);
      const stats = computeStats(cards, reviews, now);
      const queue = buildQueue(cards, now, { maxNew: 10, maxTotal: 40, newDoneToday: countNewDoneToday(reviews, now) });
      const done = new Set((await storage.loadDaily())[key] ?? []);
      const plan = planFor(week, key).map((it) => ({ ...it, done: done.has(it.slot) }));
      const backlog = await missedItems(weeks, key, plan);
      const first = weeks[0]?.start;
      const phase = !first || key < first ? 'before' : week ? 'active' : 'after';
      return ok({
        date: key,
        week,
        totalWeeks: weeks.length,
        phase,
        plan,
        backlog,
        queueCount: queue.length,
        stats: { streak: stats.streak, retention30: stats.retention30, total: stats.total },
        areas: areaRows(cards, reviews, await readQuiz(), now),
        last7: stats.last7,
        weak: cards
          .filter((c) => !c.orphan && c.fsrs.lapses > 0)
          .sort((a, b) => b.fsrs.lapses - a.fsrs.lapses)
          .slice(0, 3)
          .map((c) => ({ id: c.id, q: c.q, area: c.area, file: c.file, lapses: c.fsrs.lapses })),
        weekMinutes: { done: doneMin, total: totalMin },
      });
    },

    'POST /api/daily': async (_q, body) => {
      if (!isDayKey(body.date)) throw new HttpError(400, 'Ngày không hợp lệ');
      if (typeof body.slot !== 'string' || typeof body.done !== 'boolean') throw new HttpError(400, 'Thiếu slot hoặc done');
      const week = weekOf(loadRoadmap(paths.roadmapFile), body.date);
      if (!planFor(week, body.date).some((it) => it.slot === body.slot)) throw new HttpError(400, 'Không có mục này trong kế hoạch');
      const daily = await storage.loadDaily();
      const set = new Set(daily[body.date] ?? []);
      if (body.done) set.add(body.slot);
      else set.delete(body.slot);
      if (set.size > 0) daily[body.date] = [...set];
      else delete daily[body.date];
      await storage.saveDaily(daily);
      return ok({ done: [...set] });
    },

    'GET /api/queue': async (q) => {
      const now = ctx.now();
      const state = await syncState();
      const area = q.get('area') || undefined;
      const queue = buildQueue(Object.values(state.cards), now, {
        maxNew: 10,
        maxTotal: 40,
        newDoneToday: countNewDoneToday(await readReviews(), now),
        area,
      });
      return ok({
        cards: queue.map((c) => ({
          id: c.id, q: c.q, a: c.a, area: c.area, file: c.file, isNew: c.fsrs.state === State.New, intervals: previewIntervals(c, now),
        })),
      });
    },

    'POST /api/review': async (_q, body) => {
      const rating = body.rating;
      if (typeof body.id !== 'string' || ![1, 2, 3, 4].includes(rating as number)) throw new HttpError(400, 'Thiếu id hoặc rating 1-4');
      const state = await storage.loadState();
      const card = state.cards[body.id];
      if (!card || card.orphan) throw new HttpError(404, 'Không tìm thấy thẻ');
      await storage.addReview(applyReview(card, rating as Grade, ctx.now()));
      await storage.saveState(state);
      return ok({ next: card.fsrs.due.toISOString() });
    },

    'GET /api/lesson': async (q) => {
      const { week, strand } = parseLessonKey(q.get('week'), q.get('strand'));
      const w = loadRoadmap(paths.roadmapFile).find((x) => x.n === week);
      if (!w) throw new HttpError(404, 'Không có tuần này trong ROADMAP.md');
      const lesson = await readLesson(storage, lessonKey(week, strand));
      return ok({ week, strand, topic: topicOf(w, strand), exists: lesson !== null, ...(lesson ?? {}) });
    },

    'POST /api/lesson/gen': async (_q, body) => {
      const { week, strand } = parseLessonKey(body.week, body.strand);
      const w = loadRoadmap(paths.roadmapFile).find((x) => x.n === week);
      if (!w) throw new HttpError(404, 'Không có tuần này trong ROADMAP.md');
      const key = lessonKey(week, strand);
      const existing = await readLesson(storage, key);
      if (existing?.source === 'curated') throw new HttpError(409, 'Bài này đã được viết sẵn, không ghi đè.');
      if (existing && body.replace !== true) throw new HttpError(409, 'Bài đã tồn tại');
      const { data, usage } = await callLlm<string>({
        system: LESSON_SYSTEM,
        user: lessonUser(topicOf(w, strand), STRAND_LABEL[strand], week, strand),
        validate: parseLesson,
        maxTokens: 7000,
      });
      const draft = data.startsWith('<!-- ai-generated -->') ? data : `<!-- ai-generated -->\n${data}`;
      // Injected fetch (tests) only gets the host allowlist; the real fetch also checks liveness.
      const checked = await verifyLinks(draft, ctx.linkFetch ?? (ctx.fetch ? null : fetch));
      await writeLesson(storage, key, checked.markdown);
      return ok({ usage, links: { kept: checked.kept, removed: checked.removed } });
    },

    'GET /api/notes': async () => {
      const state = await syncState();
      const notes = listNotes(await storage.listNotes(), state, ctx.now());
      const areas = new Map<string, number>();
      for (const n of notes) areas.set(n.area, (areas.get(n.area) ?? 0) + 1);
      return ok({ notes, areas: [...areas.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => a.area.localeCompare(b.area)) });
    },

    'GET /api/note': async (q) => {
      const rel = q.get('path') ?? '';
      const note = await readNote(storage, rel);
      const state = await storage.loadState();
      const now = ctx.now();
      const cards = parseCards(note.content, rel, note.area).map((p) => {
        const c = state.cards[p.id];
        return { id: p.id, q: p.q, a: p.a, due: c ? isDue(c, now) : false, isNew: !c || c.fsrs.state === State.New, next: c && c.fsrs.state !== State.New ? c.fsrs.due.toISOString() : null, lapses: c?.fsrs.lapses ?? 0 };
      });
      return ok({ ...note, title: titleOf(note.content, rel), cards });
    },

    'PUT /api/note': async (_q, body) => {
      await writeNote(storage, body.path, body.content);
      await syncState();
      return ok({ saved: true });
    },

    'POST /api/notes': async (_q, body) => {
      const rel = await createNote(storage, paths.templateFile, body.area, body.title);
      await syncState();
      return { status: 201, body: { path: rel } };
    },

    'POST /api/gen': async (_q, body) => {
      const { rel, text, area } = await noteText(body.path);
      const existing = parseCards(text, rel, area).map((c) => c.q);
      const { data, usage } = await callLlm<ReturnType<typeof parseGen>>({ system: GEN_SYSTEM, user: genUser(text, existing), validate: parseGen });
      return ok({ proposals: data, usage });
    },

    'POST /api/cards': async (_q, body) => {
      const note = await readNote(storage, body.path);
      const list = Array.isArray(body.cards) ? body.cards : [];
      const cards = list
        .map((c: { q?: unknown; a?: unknown }) => ({ q: typeof c?.q === 'string' ? c.q.trim() : '', a: typeof c?.a === 'string' ? c.a.trim() : '' }))
        .filter((c) => c.q && c.a);
      if (cards.length === 0 || cards.length > 30) throw new HttpError(400, 'Cần 1-30 thẻ có đủ câu hỏi và đáp án');
      await writeNote(storage, note.path, note.content + cardsSuffix(note.content, cards));
      await syncState();
      return ok({ added: cards.length });
    },

    'POST /api/quiz/start': async (_q, body) => {
      const n = Math.max(1, Math.min(Number(body.n) || 3, 8));
      let rel = typeof body.path === 'string' ? body.path : '';
      if (!rel) {
        const area = typeof body.area === 'string' && /^[a-z0-9_-]+$/i.test(body.area) ? body.area : '';
        const pool = (await storage.listNotes())
          .filter((r) => (!area || r.path.startsWith(`${area}/`)) && r.content.length > 300)
          .map((r) => r.path);
        if (pool.length === 0) throw new HttpError(404, 'Chưa có note đủ nội dung để phỏng vấn');
        rel = shuffle(pool)[0];
      }
      const { text } = await noteText(rel);
      const { data, usage } = await callLlm<ReturnType<typeof parseQuiz>>({ system: QUIZ_SYSTEM, user: quizUser(text, n), validate: parseQuiz });
      return ok({ path: rel, title: titleOf(text, rel), questions: data.slice(0, n), usage });
    },

    'POST /api/quiz/grade': async (_q, body) => {
      const { text } = await noteText(body.path);
      const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
      const question = body.question as { q?: unknown; keyPoints?: unknown } | undefined;
      if (!answer || answer.length > 8000) throw new HttpError(400, 'Câu trả lời trống hoặc quá dài');
      if (!question || typeof question.q !== 'string' || !question.q.trim()) throw new HttpError(400, 'Thiếu câu hỏi');
      const keyPoints = Array.isArray(question.keyPoints) ? question.keyPoints.filter((k): k is string => typeof k === 'string') : [];
      const { data, usage } = await callLlm<ReturnType<typeof parseGrade>>({
        system: GRADE_SYSTEM,
        user: gradeUser(text, { q: question.q, keyPoints }, answer),
        validate: parseGrade,
      });
      await storage.addQuiz({ ts: ctx.now().toISOString(), file: `notes/${checkNotePath(body.path)}`, q: question.q, score: data.score, missing: data.missing });
      return ok({ grade: data, usage });
    },

    'GET /api/progress': async () => {
      const now = ctx.now();
      const state = await syncState();
      const cards = Object.values(state.cards);
      const reviews = await readReviews();
      const quiz = await readQuiz();
      const weeks = loadRoadmap(paths.roadmapFile);
      const stats = computeStats(cards, reviews, now);
      const { week, doneMin, totalMin } = await weekStats(weeks, now);

      const perDay = new Map<string, number>();
      for (const r of reviews) perDay.set(dayKey(new Date(r.ts)), (perDay.get(dayKey(new Date(r.ts))) ?? 0) + 1);
      const today = dayKey(now);
      const heatmap = Array.from({ length: 84 }, (_, i) => {
        const day = addDays(today, i - 83);
        return { day, count: perDay.get(day) ?? 0 };
      });
      const since = startOfLocalDay(now).getTime() - 29 * 86_400_000;
      const q30 = quiz.filter((q) => new Date(q.ts).getTime() >= since);
      return ok({
        date: today,
        stats,
        weeks: weeks.map(({ n, start, end, checkpoint, apply, light }) => ({ n, start, end, checkpoint, apply, light })),
        currentWeek: week?.n ?? null,
        areas: areaRows(cards, reviews, quiz, now),
        hardest: cards
          .filter((c) => !c.orphan && c.fsrs.lapses > 0)
          .sort((a, b) => b.fsrs.lapses - a.fsrs.lapses)
          .slice(0, 8)
          .map((c) => ({ id: c.id, q: c.q, area: c.area, file: c.file, lapses: c.fsrs.lapses })),
        heatmap,
        quiz: { count30: q30.length, avg30: q30.length ? q30.reduce((s, q) => s + q.score, 0) / q30.length : null },
        weekMinutes: { done: doneMin, total: totalMin },
      });
    },
  };

  return async function handle(method: string, pathname: string, query: URLSearchParams, body: Body): Promise<Reply> {
    const route = routes[`${method} ${pathname}`];
    if (!route) {
      const known = Object.keys(routes).some((k) => k.endsWith(` ${pathname}`));
      return { status: known ? 405 : 404, body: { error: known ? 'Method không hỗ trợ' : 'Không tìm thấy' } };
    }
    try {
      return await route(query, body);
    } catch (e) {
      if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
      console.error(e);
      return { status: 500, body: { error: 'Lỗi server' } };
    }
  };
}
