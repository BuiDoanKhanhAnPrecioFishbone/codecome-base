import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

export const lessonPath = (dir: string, week: number, strand: LessonStrand) =>
  join(dir, `w${String(week).padStart(2, '0')}-${strand}.md`);

export function topicOf(week: Week, strand: LessonStrand): string {
  return { S: week.s, F: week.f, A: week.a, D: week.d }[strand];
}

export interface Lesson {
  content: string;
  source: 'curated' | 'ai';
  updated: string;
}

export function readLesson(file: string): Lesson | null {
  if (!existsSync(file)) return null;
  const content = readFileSync(file, 'utf8');
  return { content, source: content.trimStart().startsWith(AI_MARKER) ? 'ai' : 'curated', updated: statSync(file).mtime.toISOString() };
}

export function writeLesson(dir: string, file: string, markdown: string): void {
  if (Buffer.byteLength(markdown) > MAX_LESSON_BYTES) throw new HttpError(413, 'Bài học quá lớn');
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, markdown.endsWith('\n') ? markdown : `${markdown}\n`);
}
