import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ROOT, pathsFor } from '../paths.ts';
import { openStorage } from '../storage/index.ts';
import { createStudyServer } from './server.ts';

const port = Number(process.env.STUDY_PORT) || 4173;
const webDir = fileURLToPath(new URL('../../web/dist/', import.meta.url));
const root = process.env.STUDY_ROOT ? resolve(process.env.STUDY_ROOT) : ROOT;
const paths = pathsFor(root);
const storage = await openStorage(paths);
const server = createStudyServer({ paths, storage, now: () => new Date() }, webDir);

server.on('error', (e: NodeJS.ErrnoException) => {
  console.error(e.code === 'EADDRINUSE' ? `Cổng ${port} đang bận. Đặt STUDY_PORT khác.` : `Lỗi server: ${e.message}`);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Amberjack Study: http://localhost:${port} (lưu trữ: ${storage.kind})`);
});
