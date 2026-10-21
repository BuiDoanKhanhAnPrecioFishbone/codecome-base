import { areaOfPath } from '../cards.ts';
import { emptyState, reviveState, type ReviewEntry, type StudyState } from '../store.ts';
import type { Daily, QuizLog, Storage } from './types.ts';

type Sql = import('postgres').Sql;

/** Postgres (Supabase) storage. `prepare: false` keeps it compatible with the transaction pooler (port 6543). */
export async function pgStorage(url: string): Promise<Storage> {
  const { default: postgres } = await import('postgres');
  const sql: Sql = postgres(url, { max: 1, ssl: 'require', prepare: false, onnotice: () => {}, connect_timeout: 15, idle_timeout: 20 });

  const getKv = async (key: string): Promise<unknown | null> => {
    const rows = await sql<{ value: unknown }[]>`select value from study.kv where key = ${key}`;
    return rows.length ? rows[0].value : null;
  };
  const putKv = async (key: string, value: unknown) => {
    await sql`
      insert into study.kv (key, value, updated_at) values (${key}, ${sql.json(value as never)}, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()`;
  };
  const iso = (d: Date) => d.toISOString();

  return {
    kind: 'pg',
    async listNotes() {
      const rows = await sql<{ path: string; content: string; updated_at: Date }[]>`
        select path, content, updated_at from study.notes order by path`;
      return rows.map((r) => ({ path: r.path, content: r.content, updated: iso(r.updated_at) }));
    },
    async getNote(path) {
      const rows = await sql<{ content: string; updated_at: Date }[]>`
        select content, updated_at from study.notes where path = ${path}`;
      return rows.length ? { path, content: rows[0].content, updated: iso(rows[0].updated_at) } : null;
    },
    async createNote(path, content) {
      const rows = await sql`
        insert into study.notes (path, area, content) values (${path}, ${areaOfPath(path)}, ${content})
        on conflict (path) do nothing returning path`;
      return rows.length > 0;
    },
    async updateNote(path, content) {
      const rows = await sql`update study.notes set content = ${content}, updated_at = now() where path = ${path} returning path`;
      return rows.length > 0;
    },
    async getLesson(key) {
      const rows = await sql<{ content: string; updated_at: Date }[]>`select content, updated_at from study.lessons where key = ${key}`;
      return rows.length ? { content: rows[0].content, updated: iso(rows[0].updated_at) } : null;
    },
    async putLesson(key, content) {
      await sql`
        insert into study.lessons (key, content, updated_at) values (${key}, ${content}, now())
        on conflict (key) do update set content = excluded.content, updated_at = now()`;
    },
    async listLessons() {
      const rows = await sql<{ key: string; content: string; updated_at: Date }[]>`select key, content, updated_at from study.lessons order by key`;
      return rows.map((r) => ({ key: r.key, content: r.content, updated: iso(r.updated_at) }));
    },
    async loadState() {
      const v = (await getKv('state')) as StudyState | null;
      return v ? reviveState(v) : emptyState();
    },
    async saveState(state) {
      await putKv('state', state);
    },
    async readReviews() {
      const rows = await sql<{ data: ReviewEntry }[]>`select data from study.reviews order by ts, id`;
      return rows.map((r) => r.data);
    },
    async addReview(entry) {
      await sql`insert into study.reviews (ts, data) values (${entry.ts}, ${sql.json(entry as never)})`;
    },
    async readQuiz() {
      const rows = await sql<{ data: QuizLog }[]>`select data from study.quiz order by ts, id`;
      return rows.map((r) => r.data);
    },
    async addQuiz(entry) {
      await sql`insert into study.quiz (ts, data) values (${entry.ts}, ${sql.json(entry as never)})`;
    },
    async loadDaily() {
      return ((await getKv('daily')) as Daily | null) ?? {};
    },
    async saveDaily(daily) {
      await putKv('daily', daily);
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}

/** Copies everything from one storage to another. Notes and lessons are overwritten; logs are only appended if the target has none. */
export async function copyAll(from: Storage, to: Storage): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  let n = 0;
  for (const note of await from.listNotes()) {
    if (!(await to.createNote(note.path, note.content))) await to.updateNote(note.path, note.content);
    n++;
  }
  out.notes = n;
  const lessons = await from.listLessons();
  for (const l of lessons) await to.putLesson(l.key, l.content);
  out.lessons = lessons.length;
  await to.saveState(await from.loadState());
  await to.saveDaily(await from.loadDaily());
  const reviews = await from.readReviews();
  const have = (await to.readReviews()).length;
  if (have === 0) for (const r of reviews) await to.addReview(r);
  out.reviews = have === 0 ? reviews.length : 0;
  const quiz = await from.readQuiz();
  const haveQ = (await to.readQuiz()).length;
  if (haveQ === 0) for (const q of quiz) await to.addQuiz(q);
  out.quiz = haveQ === 0 ? quiz.length : 0;
  return out;
}
