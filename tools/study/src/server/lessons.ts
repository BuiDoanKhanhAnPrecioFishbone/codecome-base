import type { Storage } from '../storage/types.ts';
import { HttpError } from './notes.ts';
import type { Week } from './roadmap.ts';

export const LESSON_STRANDS = ['S', 'F', 'A', 'D'] as const;
export type LessonStrand = (typeof LESSON_STRANDS)[number];

export const STRAND_LABEL: Record<LessonStrand, string> = {
  S: 'Systems (network, Linux, DevOps, architecture, design)',
  F: 'Frontend',
  A: 'AI engineering',
  D: 'Data structures & algorithms',
};

export const AI_MARKER = '<!-- ai-generated -->';
const MAX_LESSON_BYTES = 100_000;

export function parseLessonKey(week: unknown, strand: unknown): { week: number; strand: LessonStrand } {
  const n = Number(week);
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new HttpError(400, 'Tuần không hợp lệ');
  if (typeof strand !== 'string' || !(LESSON_STRANDS as readonly string[]).includes(strand)) throw new HttpError(400, 'Mảng học không hợp lệ');
  return { week: n, strand: strand as LessonStrand };
}

export const lessonKey = (week: number, strand: LessonStrand) => `w${String(week).padStart(2, '0')}-${strand}`;

export function topicOf(week: Week, strand: LessonStrand): string {
  return { S: week.s, F: week.f, A: week.a, D: week.d }[strand];
}

export interface Lesson {
  content: string;
  source: 'curated' | 'ai';
  updated: string;
}

export async function readLesson(storage: Storage, key: string): Promise<Lesson | null> {
  const rec = await storage.getLesson(key);
  if (!rec) return null;
  return { content: rec.content, source: rec.content.trimStart().startsWith(AI_MARKER) ? 'ai' : 'curated', updated: rec.updated };
}

export async function writeLesson(storage: Storage, key: string, markdown: string): Promise<void> {
  if (Buffer.byteLength(markdown) > MAX_LESSON_BYTES) throw new HttpError(413, 'Bài học quá lớn');
  await storage.putLesson(key, markdown.endsWith('\n') ? markdown : `${markdown}\n`);
}
