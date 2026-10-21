import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { bundledPaths } from '../paths.ts';
import { openStorage } from '../storage/index.ts';
import { createRequestHandler } from './server.ts';

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
let cached: Promise<Handler> | undefined;

function init(): Promise<Handler> {
  const bundle = fileURLToPath(new URL('../bundle/', import.meta.url));
  const paths = bundledPaths(bundle);
  const env = { ...process.env, STUDY_STORAGE: 'pg' };
  return openStorage(paths, env).then((storage) => createRequestHandler({ paths, storage, env, now: () => new Date() }, { requirePassword: true }));
}

/** Vercel entry: built into dist-api/handler.mjs by `npm run build:vercel`. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  cached ??= init().catch((e) => {
    cached = undefined;
    throw e;
  });
  return (await cached)(req, res);
}
