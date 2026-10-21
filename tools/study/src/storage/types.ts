import type { ReviewEntry, StudyState } from '../store.ts';

export interface NoteRecord {
  path: string;
  content: string;
  updated: string;
}

export interface LessonRecord {
  content: string;
  updated: string;
}

export interface QuizLog {
  ts: string;
  file: string;
  q: string;
  score: number;
  missing?: string[];
}

export type Daily = Record<string, string[]>;

/** Where the study data lives. The app only talks to this interface: files locally, Postgres (Supabase) when deployed. */
export interface Storage {
  readonly kind: 'file' | 'pg';
  listNotes(): Promise<NoteRecord[]>;
  getNote(path: string): Promise<NoteRecord | null>;
  /** Returns false when the note already exists. */
  createNote(path: string, content: string): Promise<boolean>;
  /** Returns false when the note does not exist. */
  updateNote(path: string, content: string): Promise<boolean>;
  getLesson(key: string): Promise<LessonRecord | null>;
  putLesson(key: string, content: string): Promise<void>;
  listLessons(): Promise<(LessonRecord & { key: string })[]>;
  loadState(): Promise<StudyState>;
  saveState(state: StudyState): Promise<void>;
  readReviews(): Promise<ReviewEntry[]>;
  addReview(entry: ReviewEntry): Promise<void>;
  readQuiz(): Promise<QuizLog[]>;
  addQuiz(entry: QuizLog): Promise<void>;
  loadDaily(): Promise<Daily>;
  saveDaily(daily: Daily): Promise<void>;
  close(): Promise<void>;
}
