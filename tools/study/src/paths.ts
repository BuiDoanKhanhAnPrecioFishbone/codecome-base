import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export interface Paths {
  root: string;
  notesDir: string;
  dataDir: string;
  stateFile: string;
  reviewsFile: string;
  quizFile: string;
  dailyFile: string;
  templateFile: string;
  envFile: string;
  roadmapFile: string;
}

export function pathsFor(root: string): Paths {
  const dataDir = join(root, 'data');
  return {
    root,
    notesDir: join(root, 'notes'),
    dataDir,
    stateFile: join(dataDir, 'state.json'),
    reviewsFile: join(dataDir, 'reviews.jsonl'),
    quizFile: join(dataDir, 'quiz.jsonl'),
    dailyFile: join(dataDir, 'daily.json'),
    templateFile: join(root, 'templates', 'note.md'),
    envFile: join(root, '.env'),
    roadmapFile: join(root, 'ROADMAP.md'),
  };
}

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const P = pathsFor(ROOT);
export const NOTES_DIR = P.notesDir;
export const DATA_DIR = P.dataDir;
export const STATE_FILE = P.stateFile;
export const REVIEWS_FILE = P.reviewsFile;
export const QUIZ_FILE = P.quizFile;
export const TEMPLATE_FILE = P.templateFile;
export const ENV_FILE = P.envFile;
