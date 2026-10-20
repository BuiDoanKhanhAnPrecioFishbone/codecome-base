import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, relative, sep } from 'node:path';
import { appendCards, listNoteFiles, parseCards, scanNotes } from '../cards.ts';
import { chatJson, loadConfig, type JsonRequest, type LlmConfig } from '../llm.ts';
import type { Paths } from '../paths.ts';
import {
  GEN_SYSTEM, GRADE_SYSTEM, LESSON_SYSTEM, QUIZ_SYSTEM, genUser, gradeUser, lessonUser, parseGen, parseGrade, parseLesson, parseQuiz, quizUser,
} from '../prompts.ts';
import { buildQueue, countNewDoneToday, isDue, shuffle, startOfLocalDay } from '../queue.ts';
import { computeStats } from '../stats.ts';
import {
  appendJsonl, applyReview, loadState, previewIntervals, readJsonl, saveState, syncCards, State,
  type ReviewEntry, type StoredCard, type StudyState,
} from '../store.ts';
import type { Grade } from '../store.ts';
import { HttpError, createNote, listNotes, readNote, resolveNotePath, titleOf, writeNote } from './notes.ts';
import { STRAND_LABEL, lessonPath, parseLessonKey, readLesson, topicOf, writeLesson } from './lessons.ts';
import { addDays, dayKey, loadRoadmap, planFor, weekOf, type Week } from './roadmap.ts';

const MAX_NOTE_CHARS = 60_000;

export interface Ctx {
  paths: Paths;
  now: () => Date;
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
}

export interface Reply {
  status: number;
  body: unknown;
}

interface QuizLog {
  ts: string;
  file: string;
  q: string;
  score: number;
}

type Daily = Record<string, string[]>;
type Body = Record<string, unknown>;

const ok = (body: unknown): Reply => ({ status: 200, body });

function loadDaily(file: string): Daily {
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Daily;
  } catch {
    throw new HttpError(500, 'data/daily.json bị hỏng, hãy sửa hoặc xoá file này');
  }
}

function saveDaily(file: string, daily: Daily): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(daily, null, 2) + '\n');
  renameSync(tmp, file);
}

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
  const readQuiz = () => readJsonl<QuizLog>(paths.quizFile);
  const readReviews = () => readJsonl<ReviewEntry>(paths.reviewsFile);

  function syncState(): StudyState {
    const state = loadState(paths.stateFile);
    syncCards(state, scanNotes(paths.notesDir), ctx.now());
    saveState(paths.stateFile, state);
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

  function noteText(rel: unknown): { rel: string; text: string; area: string } {
    const n = readNote(paths.notesDir, rel as string);
    return { rel: n.path, text: n.content.slice(0, MAX_NOTE_CHARS), area: n.area };
  }

  function weekStats(weeks: Week[], now: Date) {
    const key = dayKey(now);
    const week = weekOf(weeks, key);
    const daily = loadDaily(paths.dailyFile);
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
    'GET /api/status': () => {
      const cfg = loadConfig(paths.envFile, ctx.env ?? process.env);
      return ok({ llm: cfg ? { configured: true, model: cfg.model } : { configured: false }, notes: listNoteFiles(paths.notesDir).length });
    },

    'GET /api/today': () => {
      const now = ctx.now();
      const state = syncState();
      const cards = Object.values(state.cards);
      const reviews = readReviews();
      const weeks = loadRoadmap(paths.roadmapFile);
      const key = dayKey(now);
      const { week, doneMin, totalMin } = weekStats(weeks, now);
      const stats = computeStats(cards, reviews, now);
      const queue = buildQueue(cards, now, { maxNew: 10, maxTotal: 40, newDoneToday: countNewDoneToday(reviews, now) });
      const done = new Set(loadDaily(paths.dailyFile)[key] ?? []);
      const plan = planFor(week, key).map((it) => ({ ...it, done: done.has(it.slot) }));
      const first = weeks[0]?.start;
      const phase = !first || key < first ? 'before' : week ? 'active' : 'after';
      return ok({
        date: key,
        week,
        totalWeeks: weeks.length,
        phase,
        plan,
        queueCount: queue.length,
        stats: { streak: stats.streak, retention30: stats.retention30, total: stats.total },
        areas: areaRows(cards, reviews, readQuiz(), now),
        last7: stats.last7,
        weak: cards
          .filter((c) => !c.orphan && c.fsrs.lapses > 0)
          .sort((a, b) => b.fsrs.lapses - a.fsrs.lapses)
          .slice(0, 3)
          .map((c) => ({ id: c.id, q: c.q, area: c.area, file: c.file, lapses: c.fsrs.lapses })),
        weekMinutes: { done: doneMin, total: totalMin },
      });
    },

    'POST /api/daily': (_q, body) => {
      if (!isDayKey(body.date)) throw new HttpError(400, 'Ngày không hợp lệ');
      if (typeof body.slot !== 'string' || typeof body.done !== 'boolean') throw new HttpError(400, 'Thiếu slot hoặc done');
      const week = weekOf(loadRoadmap(paths.roadmapFile), body.date);
      if (!planFor(week, body.date).some((it) => it.slot === body.slot)) throw new HttpError(400, 'Không có mục này trong kế hoạch');
      const daily = loadDaily(paths.dailyFile);
      const set = new Set(daily[body.date] ?? []);
      if (body.done) set.add(body.slot);
      else set.delete(body.slot);
      if (set.size > 0) daily[body.date] = [...set];
      else delete daily[body.date];
      saveDaily(paths.dailyFile, daily);
      return ok({ done: [...set] });
    },

    'GET /api/queue': (q) => {
      const now = ctx.now();
      const state = syncState();
      const area = q.get('area') || undefined;
      const queue = buildQueue(Object.values(state.cards), now, {
        maxNew: 10,
        maxTotal: 40,
        newDoneToday: countNewDoneToday(readReviews(), now),
        area,
      });
      return ok({
        cards: queue.map((c) => ({
          id: c.id, q: c.q, a: c.a, area: c.area, file: c.file, isNew: c.fsrs.state === State.New, intervals: previewIntervals(c, now),
        })),
      });
    },

    'POST /api/review': (_q, body) => {
      const rating = body.rating;
      if (typeof body.id !== 'string' || ![1, 2, 3, 4].includes(rating as number)) throw new HttpError(400, 'Thiếu id hoặc rating 1-4');
      const state = loadState(paths.stateFile);
      const card = state.cards[body.id];
      if (!card || card.orphan) throw new HttpError(404, 'Không tìm thấy thẻ');
      appendJsonl(paths.reviewsFile, applyReview(card, rating as Grade, ctx.now()));
      saveState(paths.stateFile, state);
      return ok({ next: card.fsrs.due.toISOString() });
    },

    'GET /api/lesson': (q) => {
      const { week, strand } = parseLessonKey(q.get('week'), q.get('strand'));
      const w = loadRoadmap(paths.roadmapFile).find((x) => x.n === week);
      if (!w) throw new HttpError(404, 'Không có tuần này trong ROADMAP.md');
      const lesson = readLesson(lessonPath(paths.lessonsDir, week, strand));
      return ok({ week, strand, topic: topicOf(w, strand), exists: lesson !== null, ...(lesson ?? {}) });
    },

    'POST /api/lesson/gen': async (_q, body) => {
      const { week, strand } = parseLessonKey(body.week, body.strand);
      const w = loadRoadmap(paths.roadmapFile).find((x) => x.n === week);
      if (!w) throw new HttpError(404, 'Không có tuần này trong ROADMAP.md');
      const file = lessonPath(paths.lessonsDir, week, strand);
      const existing = readLesson(file);
      if (existing?.source === 'curated') throw new HttpError(409, 'Bài này đã được viết sẵn, không ghi đè.');
      if (existing && body.replace !== true) throw new HttpError(409, 'Bài đã tồn tại');
      const { data, usage } = await callLlm<string>({
        system: LESSON_SYSTEM,
        user: lessonUser(topicOf(w, strand), STRAND_LABEL[strand], week),
        validate: parseLesson,
        maxTokens: 7000,
      });
      const markdown = data.startsWith('<!-- ai-generated -->') ? data : `<!-- ai-generated -->\n${data}`;
      writeLesson(paths.lessonsDir, file, markdown);
      return ok({ usage });
    },

    'GET /api/notes': () => {
      const state = syncState();
      const notes = listNotes(paths.notesDir, state, ctx.now());
      const areas = new Map<string, number>();
      for (const n of notes) areas.set(n.area, (areas.get(n.area) ?? 0) + 1);
      return ok({ notes, areas: [...areas.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => a.area.localeCompare(b.area)) });
    },

    'GET /api/note': (q) => {
      const rel = q.get('path') ?? '';
      const note = readNote(paths.notesDir, rel);
      const state = loadState(paths.stateFile);
      const now = ctx.now();
      const cards = parseCards(note.content, rel, note.area).map((p) => {
        const c = state.cards[p.id];
        return { id: p.id, q: p.q, a: p.a, due: c ? isDue(c, now) : false, isNew: !c || c.fsrs.state === State.New, next: c && c.fsrs.state !== State.New ? c.fsrs.due.toISOString() : null, lapses: c?.fsrs.lapses ?? 0 };
      });
      return ok({ ...note, title: titleOf(note.content, rel), cards });
    },

    'PUT /api/note': (_q, body) => {
      writeNote(paths.notesDir, body.path as string, body.content);
      syncState();
      return ok({ saved: true });
    },

    'POST /api/notes': (_q, body) => {
      const rel = createNote(paths.notesDir, paths.templateFile, body.area, body.title);
      syncState();
      return { status: 201, body: { path: rel } };
    },

    'POST /api/gen': async (_q, body) => {
      const { rel, text, area } = noteText(body.path);
      const existing = parseCards(text, rel, area).map((c) => c.q);
      const { data, usage } = await callLlm<ReturnType<typeof parseGen>>({ system: GEN_SYSTEM, user: genUser(text, existing), validate: parseGen });
      return ok({ proposals: data, usage });
    },

    'POST /api/cards': (_q, body) => {
      const full = resolveNotePath(paths.notesDir, body.path);
      if (!existsSync(full)) throw new HttpError(404, 'Không tìm thấy note');
      const list = Array.isArray(body.cards) ? body.cards : [];
      const cards = list
        .map((c: { q?: unknown; a?: unknown }) => ({ q: typeof c?.q === 'string' ? c.q.trim() : '', a: typeof c?.a === 'string' ? c.a.trim() : '' }))
        .filter((c) => c.q && c.a);
      if (cards.length === 0 || cards.length > 30) throw new HttpError(400, 'Cần 1-30 thẻ có đủ câu hỏi và đáp án');
      appendCards(full, cards);
      syncState();
      return ok({ added: cards.length });
    },

    'POST /api/quiz/start': async (_q, body) => {
      const n = Math.max(1, Math.min(Number(body.n) || 3, 8));
      let rel = typeof body.path === 'string' ? body.path : '';
      if (!rel) {
        const area = typeof body.area === 'string' && /^[a-z0-9_-]+$/i.test(body.area) ? body.area : '';
        const pool = listNoteFiles(paths.notesDir)
          .map((f) => relative(paths.notesDir, f).split(sep).join('/'))
          .filter((r) => (!area || r.startsWith(`${area}/`)) && readNote(paths.notesDir, r).content.length > 300);
        if (pool.length === 0) throw new HttpError(404, 'Chưa có note đủ nội dung để phỏng vấn');
        rel = shuffle(pool)[0];
      }
      const { text } = noteText(rel);
      const { data, usage } = await callLlm<ReturnType<typeof parseQuiz>>({ system: QUIZ_SYSTEM, user: quizUser(text, n), validate: parseQuiz });
      return ok({ path: rel, title: titleOf(text, rel), questions: data.slice(0, n), usage });
    },

    'POST /api/quiz/grade': async (_q, body) => {
      const { text } = noteText(body.path);
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
      appendJsonl(paths.quizFile, { ts: ctx.now().toISOString(), file: `notes/${body.path as string}`, q: question.q, score: data.score, missing: data.missing });
      return ok({ grade: data, usage });
    },

    'GET /api/progress': () => {
      const now = ctx.now();
      const state = syncState();
      const cards = Object.values(state.cards);
      const reviews = readReviews();
      const quiz = readQuiz();
      const weeks = loadRoadmap(paths.roadmapFile);
      const stats = computeStats(cards, reviews, now);
      const { week, doneMin, totalMin } = weekStats(weeks, now);

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
