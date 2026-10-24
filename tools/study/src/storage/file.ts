import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { listNoteFiles } from '../cards.ts';
import type { Paths } from '../paths.ts';
import { appendJsonl, loadState, readJsonl, saveState, type ReviewEntry } from '../store.ts';
import type { Daily, LessonRecord, NoteRecord, QuizLog, Storage } from './types.ts';

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  renameSync(tmp, file);
}

export const LESSON_KEY = /^w\d{2}-[SFADO]$/;

/** The original layout: notes/, lessons/ and data/ under the repo root. */
export function fileStorage(paths: Paths): Storage {
  const notePath = (rel: string) => {
    const base = resolve(paths.notesDir);
    const full = resolve(base, ...rel.split('/'));
    if (!full.startsWith(base + sep)) throw new Error(`Đường dẫn note không hợp lệ: ${rel}`);
    return full;
  };
  const lessonFile = (key: string) => {
    if (!LESSON_KEY.test(key)) throw new Error(`Khoá bài học không hợp lệ: ${key}`);
    return join(paths.lessonsDir, `${key}.md`);
  };
  const record = (full: string, rel: string): NoteRecord => ({
    path: rel,
    content: readFileSync(full, 'utf8'),
    updated: statSync(full).mtime.toISOString(),
  });

  return {
    kind: 'file',
    async listNotes() {
      return listNoteFiles(paths.notesDir).map((f) => record(f, relative(paths.notesDir, f).split(sep).join('/')));
    },
    async getNote(rel) {
      const full = notePath(rel);
      return existsSync(full) && statSync(full).isFile() ? record(full, rel) : null;
    },
    async createNote(rel, content) {
      const full = notePath(rel);
      mkdirSync(dirname(full), { recursive: true });
      try {
        writeFileSync(full, content, { flag: 'wx' });
        return true;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'EEXIST') return false;
        throw e;
      }
    },
    async updateNote(rel, content) {
      const full = notePath(rel);
      if (!existsSync(full)) return false;
      writeFileSync(full, content);
      return true;
    },
    async getLesson(key) {
      const file = lessonFile(key);
      return existsSync(file) ? { content: readFileSync(file, 'utf8'), updated: statSync(file).mtime.toISOString() } : null;
    },
    async putLesson(key, content) {
      mkdirSync(paths.lessonsDir, { recursive: true });
      writeFileSync(lessonFile(key), content);
    },
    async listLessons() {
      if (!existsSync(paths.lessonsDir)) return [];
      const out: (LessonRecord & { key: string })[] = [];
      for (let w = 1; w <= 99; w++) {
        for (const s of ['S', 'F', 'A', 'D', 'O']) {
          const key = `w${String(w).padStart(2, '0')}-${s}`;
          const file = join(paths.lessonsDir, `${key}.md`);
          if (existsSync(file)) out.push({ key, content: readFileSync(file, 'utf8'), updated: statSync(file).mtime.toISOString() });
        }
      }
      return out;
    },
    async loadState() {
      return loadState(paths.stateFile);
    },
    async saveState(state) {
      saveState(paths.stateFile, state);
    },
    async readReviews() {
      return readJsonl<ReviewEntry>(paths.reviewsFile);
    },
    async addReview(entry) {
      appendJsonl(paths.reviewsFile, entry);
    },
    async readQuiz() {
      return readJsonl<QuizLog>(paths.quizFile);
    },
    async addQuiz(entry) {
      appendJsonl(paths.quizFile, entry);
    },
    async loadDaily() {
      if (!existsSync(paths.dailyFile)) return {};
      try {
        return JSON.parse(readFileSync(paths.dailyFile, 'utf8')) as Daily;
      } catch {
        throw new Error('data/daily.json bị hỏng, hãy sửa hoặc xoá file này');
      }
    },
    async saveDaily(daily) {
      writeJson(paths.dailyFile, daily);
    },
    async close() {},
  };
}
