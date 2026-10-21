import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface ParsedCard {
  id: string;
  q: string;
  a: string;
  file: string;
  area: string;
}

export function normalizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function cardId(q: string): string {
  return createHash('sha1').update(normalizeQuestion(q)).digest('hex').slice(0, 10);
}

const FENCE = /^\s*(```|~~~)/;

/** Cards are `Q:` / `A:` blocks; an answer ends at a blank line (outside code fences), heading or next `Q:`. */
export function parseCards(markdown: string, file: string, area: string): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const seen = new Set<string>();
  let state: 'none' | 'q' | 'a' = 'none';
  let q: string[] = [];
  let a: string[] = [];
  let inFence = false;

  const flush = () => {
    if (state === 'a') {
      const qText = q.join('\n').trim();
      const aText = a.join('\n').trim();
      if (qText && aText) {
        const id = cardId(qText);
        if (!seen.has(id)) {
          seen.add(id);
          cards.push({ id, q: qText, a: aText, file, area });
        }
      }
    }
    state = 'none';
    q = [];
    a = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    const fenceLine = FENCE.test(line);
    if (!inFence) {
      const qm = /^Q:\s?(.*)$/.exec(line);
      if (qm) {
        flush();
        state = 'q';
        q = [qm[1]];
        continue;
      }
      if (state === 'q') {
        const am = /^A:\s?(.*)$/.exec(line);
        if (am) {
          state = 'a';
          a = [am[1]];
          continue;
        }
        if (line.trim() === '' || /^#/.test(line)) {
          state = 'none';
          q = [];
        } else {
          q.push(line);
        }
        if (fenceLine) inFence = !inFence;
        continue;
      }
      if (state === 'a' && (line.trim() === '' || /^#/.test(line) || /^\s*<!--.*-->\s*$/.test(line))) {
        flush();
        continue;
      }
    }
    if (fenceLine) inFence = !inFence;
    if (state === 'a') a.push(line);
  }
  flush();
  return cards;
}

export function areaOf(notesDir: string, file: string): string {
  const parts = relative(notesDir, file).split(sep);
  return parts.length > 1 ? parts[0] : 'misc';
}

export function listNoteFiles(notesDir: string): string[] {
  if (!existsSync(notesDir)) return [];
  return (readdirSync(notesDir, { recursive: true }) as string[])
    .filter((p) => p.endsWith('.md'))
    .map((p) => join(notesDir, p))
    .sort();
}

/** Area is the first folder of a note path (`network/tcp.md` → `network`). */
export function areaOfPath(rel: string): string {
  const i = rel.indexOf('/');
  return i > 0 ? rel.slice(0, i) : 'misc';
}

export function scanNoteTexts(notes: { path: string; content: string }[]): ParsedCard[] {
  const all: ParsedCard[] = [];
  const seen = new Set<string>();
  for (const n of [...notes].sort((a, b) => a.path.localeCompare(b.path))) {
    for (const c of parseCards(n.content, n.path, areaOfPath(n.path))) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        all.push(c);
      }
    }
  }
  return all;
}

export function scanNotes(notesDir: string): ParsedCard[] {
  return scanNoteTexts(
    listNoteFiles(notesDir).map((file) => ({
      path: relative(notesDir, file).split(sep).join('/'),
      content: readFileSync(file, 'utf8'),
    })),
  );
}

export function formatCard(c: { q: string; a: string }): string {
  const oneBlock = (s: string) => s.trim().replace(/\n{2,}/g, '\n');
  return `Q: ${oneBlock(c.q)}\nA: ${oneBlock(c.a)}\n`;
}

/** Returns the text to append to a note so that it ends with the given cards. */
export function cardsSuffix(current: string, cards: { q: string; a: string }[]): string {
  if (cards.length === 0) return '';
  let prefix = current.endsWith('\n') ? '' : '\n';
  if (!/^##\s+Cards\s*$/m.test(current)) prefix += '\n## Cards\n';
  return `${prefix}\n${cards.map(formatCard).join('\n')}`;
}

export function appendCards(file: string, cards: { q: string; a: string }[]): void {
  if (cards.length === 0) return;
  appendFileSync(file, cardsSuffix(readFileSync(file, 'utf8'), cards));
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function noteFromTemplate(templateFile: string, title: string): string {
  const tpl = existsSync(templateFile) ? readFileSync(templateFile, 'utf8') : '# Chủ đề\n\n## Cards\n';
  return tpl.replace(/^# .*$/m, `# ${title}`);
}

export function createNoteFromTemplate(templateFile: string, target: string, title: string): void {
  writeFileSync(target, noteFromTemplate(templateFile, title), { flag: 'wx' });
}
