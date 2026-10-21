import { databaseUrl } from '../cloud.ts';
import type { Paths } from '../paths.ts';
import { fileStorage } from './file.ts';
import { pgStorage } from './pg.ts';
import type { Storage } from './types.ts';

/**
 * STUDY_STORAGE=file forces local files, STUDY_STORAGE=pg forces Supabase.
 * Unset: Supabase when STUDY_DATABASE_URL is configured, otherwise local files.
 */
export async function openStorage(paths: Paths, env: NodeJS.ProcessEnv = process.env): Promise<Storage> {
  const mode = env.STUDY_STORAGE;
  const url = databaseUrl(paths.envFile, env);
  if (mode === 'file' || (!mode && !url)) return fileStorage(paths);
  if (!url) throw new Error('STUDY_STORAGE=pg nhưng chưa có STUDY_DATABASE_URL');
  return pgStorage(url);
}

export { fileStorage, pgStorage };
export type { Storage };
