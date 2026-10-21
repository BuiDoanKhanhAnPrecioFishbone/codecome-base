import { resolve, sep } from 'node:path';
import { areaOfPath, noteFromTemplate, parseCards, slugify } from '../cards.ts';
import type { NoteRecord, Storage } from '../storage/types.ts';
import type { StudyState } from '../store.ts';
import { isDue } from '../queue.ts';

export const MAX_NOTE_BYTES = 200_000;

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface NoteMeta {
  path: string;
  area: string;
  title: string;
  summary: string;
  updated: string;
  cards: number;
  due: number;
}

/** Accepts only `.md` paths made of safe segments, given as a relative path with forward slashes. */
export function checkNotePath(rel: unknown): string {
  if (typeof rel !== 'string' || rel === '' || rel.length > 200) throw new HttpError(400, 'Đường dẫn note không hợp lệ');
  const parts = rel.split('/');
  const bad = parts.some((p) => p === '' || p === '.' || p === '..' || !/^[\w.-]+$/.test(p));
  if (bad || !rel.endsWith('.md')) throw new HttpError(400, 'Đường dẫn note không hợp lệ');
  return rel;
}

/** Same check, resolved under a notes folder on disk. */
export function resolveNotePath(notesDir: string, rel: unknown): string {
  const parts = checkNotePath(rel).split('/');
  const base = resolve(notesDir);
  const full = resolve(base, ...parts);
  if (!full.startsWith(base + sep)) throw new HttpError(400, 'Đường dẫn note không hợp lệ');
  return full;
}

function stripInline(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .trim();
}

export function titleOf(markdown: string, fallback: string): string {
  const m = /^#\s+(.+)$/m.exec(markdown);
  return m ? stripInline(m[1]) || fallback : fallback;
}

/** First prose line that is not a heading, metadata bullet, comment, card or code. */
export function summaryOf(markdown: string): string {
  let inFence = false;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !line || /^#/.test(line) || /^<!--/.test(line) || /^[QA]:/.test(line) || /^\|/.test(line)) continue;
    if (/^[-*]\s+[^:]{1,25}:/.test(line)) continue;
    const text = stripInline(line.replace(/^([-*]|\d+\.)\s+/, ''));
    if (text.length < 8) continue;
    return text.length > 180 ? `${text.slice(0, 177)}...` : text;
  }
  return '';
}

export function listNotes(notes: NoteRecord[], state: StudyState, now: Date): NoteMeta[] {
  const byFile = new Map<string, { due: number }>();
  for (const c of Object.values(state.cards)) {
    if (c.orphan) continue;
    const e = byFile.get(c.file) ?? { due: 0 };
    if (isDue(c, now)) e.due++;
    byFile.set(c.file, e);
  }
  return notes.map((n) => {
    const area = areaOfPath(n.path);
    return {
      path: n.path,
      area,
      title: titleOf(n.content, n.path.replace(/\.md$/, '')),
      summary: summaryOf(n.content),
      updated: n.updated,
      cards: parseCards(n.content, n.path, area).length,
      due: byFile.get(n.path)?.due ?? 0,
    };
  });
}

export async function readNote(storage: Storage, rel: unknown): Promise<{ path: string; area: string; content: string; updated: string }> {
  const path = checkNotePath(rel);
  const note = await storage.getNote(path);
  if (!note) throw new HttpError(404, 'Không tìm thấy note');
  return { path, area: areaOfPath(path), content: note.content, updated: note.updated };
}

export async function writeNote(storage: Storage, rel: unknown, content: unknown): Promise<void> {
  if (typeof content !== 'string') throw new HttpError(400, 'Thiếu nội dung note');
  if (Buffer.byteLength(content) > MAX_NOTE_BYTES) throw new HttpError(413, 'Note quá lớn');
  if (!(await storage.updateNote(checkNotePath(rel), content))) throw new HttpError(404, 'Không tìm thấy note');
}

export async function createNote(storage: Storage, templateFile: string, area: unknown, title: unknown): Promise<string> {
  if (typeof area !== 'string' || !/^[a-z0-9_-]+$/i.test(area)) throw new HttpError(400, 'Mảng không hợp lệ');
  if (typeof title !== 'string' || title.trim() === '' || title.length > 120) throw new HttpError(400, 'Tiêu đề không hợp lệ');
  const slug = slugify(title);
  if (!slug) throw new HttpError(400, 'Tiêu đề không hợp lệ');
  const rel = checkNotePath(`${area}/${slug}.md`);
  if (!(await storage.createNote(rel, noteFromTemplate(templateFile, title.trim())))) throw new HttpError(409, 'Note đã tồn tại');
  return rel;
}

