import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { listNoteFiles } from './cards.ts';
import { parseEnvFile } from './llm.ts';
import type { Paths } from './paths.ts';

export type Kind = 'note' | 'state' | 'log';

export interface LocalFile {
  path: string;
  kind: Kind;
  content: string;
  sha256: string;
  mtime: number;
}

export interface RemoteFile {
  path: string;
  kind: Kind;
  content: string;
  sha256: string;
  updatedAt: number;
}

export interface Remote {
  list(): Promise<RemoteFile[]>;
  upsert(files: { path: string; kind: Kind; content: string; sha256: string }[]): Promise<void>;
  close(): Promise<void>;
}

export interface Action {
  path: string;
  kind: Kind;
  content: string;
  why: 'new' | 'changed' | 'merged';
}

export interface Plan {
  actions: Action[];
  conflicts: string[];
  same: number;
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

const DATA_FILES: Record<string, Kind> = {
  'data/state.json': 'state',
  'data/daily.json': 'state',
  'data/reviews.jsonl': 'log',
  'data/quiz.jsonl': 'log',
};

/** Only these paths ever leave or enter the machine. */
export function isSyncPath(p: string): boolean {
  if (p in DATA_FILES) return true;
  return /^notes\/[^\\]+\.md$/.test(p) && !p.split('/').includes('..');
}

export function kindOf(p: string): Kind {
  return DATA_FILES[p] ?? 'note';
}

/** Union of lines: `base` order first, then lines only `extra` has. Safe for append-only logs. */
export function mergeLines(base: string, extra: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of [...base.split(/\r?\n/), ...extra.split(/\r?\n/)]) {
    if (!line.trim() || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.length ? `${out.join('\n')}\n` : '';
}

export function collectLocal(paths: Paths): LocalFile[] {
  const rels = [
    ...listNoteFiles(paths.notesDir).map((f) => relative(paths.root, f).split(sep).join('/')),
    ...Object.keys(DATA_FILES),
  ];
  const out: LocalFile[] = [];
  for (const rel of rels) {
    const abs = resolve(paths.root, rel);
    if (!isSyncPath(rel) || !existsSync(abs)) continue;
    const content = readFileSync(abs, 'utf8');
    out.push({ path: rel, kind: kindOf(rel), content, sha256: sha(content), mtime: statSync(abs).mtimeMs });
  }
  return out;
}

/** Push: local wins unless the remote copy is newer (then it is a conflict, `force` overrides). Logs are merged. */
export function planPush(local: LocalFile[], remote: RemoteFile[], force = false): Plan {
  const byPath = new Map(remote.map((r) => [r.path, r]));
  const plan: Plan = { actions: [], conflicts: [], same: 0 };
  for (const l of local) {
    const r = byPath.get(l.path);
    if (!r) {
      plan.actions.push({ path: l.path, kind: l.kind, content: l.content, why: 'new' });
    } else if (r.sha256 === l.sha256) {
      plan.same++;
    } else if (l.kind === 'log') {
      const merged = mergeLines(r.content, l.content);
      if (sha(merged) === r.sha256) plan.same++;
      else plan.actions.push({ path: l.path, kind: l.kind, content: merged, why: 'merged' });
    } else if (!force && r.updatedAt > l.mtime) {
      plan.conflicts.push(l.path);
    } else {
      plan.actions.push({ path: l.path, kind: l.kind, content: l.content, why: 'changed' });
    }
  }
  return plan;
}

/** Pull: remote wins unless the local copy is newer (then it is a conflict, `force` overrides). Logs are merged. */
export function planPull(local: LocalFile[], remote: RemoteFile[], force = false): Plan {
  const byPath = new Map(local.map((l) => [l.path, l]));
  const plan: Plan = { actions: [], conflicts: [], same: 0 };
  for (const r of remote) {
    if (!isSyncPath(r.path)) continue;
    const l = byPath.get(r.path);
    if (!l) {
      plan.actions.push({ path: r.path, kind: r.kind, content: r.content, why: 'new' });
    } else if (l.sha256 === r.sha256) {
      plan.same++;
    } else if (r.kind === 'log') {
      const merged = mergeLines(l.content, r.content);
      if (sha(merged) === l.sha256) plan.same++;
      else plan.actions.push({ path: r.path, kind: r.kind, content: merged, why: 'merged' });
    } else if (!force && l.mtime > r.updatedAt) {
      plan.conflicts.push(r.path);
    } else {
      plan.actions.push({ path: r.path, kind: r.kind, content: r.content, why: 'changed' });
    }
  }
  return plan;
}

export function writeLocal(paths: Paths, actions: Action[]): void {
  for (const a of actions) {
    const abs = resolve(paths.root, a.path);
    if (!abs.startsWith(paths.root + sep) || !isSyncPath(a.path)) throw new Error(`Đường dẫn không hợp lệ: ${a.path}`);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, a.content);
    const now = new Date();
    utimesSync(abs, now, now);
  }
}

export function databaseUrl(envFile: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const fileEnv = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, 'utf8')) : {};
  return env.STUDY_DATABASE_URL || fileEnv.STUDY_DATABASE_URL || null;
}

export async function connect(url: string): Promise<Remote & { sql: import('postgres').Sql }> {
  const { default: postgres } = await import('postgres');
  const sql = postgres(url, { max: 1, ssl: 'require', onnotice: () => {}, connect_timeout: 15 });
  return {
    sql,
    async list() {
      const rows = await sql<{ path: string; kind: Kind; content: string; sha256: string; updated_at: Date }[]>`
        select path, kind, content, sha256, updated_at from study.files order by path`;
      return rows.map((r) => ({ path: r.path, kind: r.kind, content: r.content, sha256: r.sha256, updatedAt: r.updated_at.getTime() }));
    },
    async upsert(files) {
      if (!files.length) return;
      await sql.begin(async (tx) => {
        for (const f of files) {
          await tx`
            insert into study.files (path, kind, content, sha256, updated_at)
            values (${f.path}, ${f.kind}, ${f.content}, ${f.sha256}, now())
            on conflict (path) do update
              set kind = excluded.kind, content = excluded.content, sha256 = excluded.sha256, updated_at = now()`;
        }
      });
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}

export const withSha = (a: Action) => ({ path: a.path, kind: a.kind, content: a.content, sha256: sha(a.content) });
export const MIGRATIONS_DIR = new URL('../supabase/', import.meta.url);
