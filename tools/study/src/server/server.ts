import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { createApp, type Ctx } from './app.ts';

const MAX_BODY = 1_000_000;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy':
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

export function hostOk(host: string | undefined): boolean {
  if (!host) return false;
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0];
  return LOCAL_HOSTS.has(name.toLowerCase());
}

/** Requests must come from a loopback Host (blocks DNS rebinding) and, when an Origin is sent, from that same host. */
export function originOk(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SECURITY_HEADERS });
  res.end(data);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw Object.assign(new Error('Body quá lớn'), { status: 413 });
    chunks.push(chunk as Buffer);
  }
  if (size === 0) return {};
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // falls through to the 400 below
  }
  throw Object.assign(new Error('JSON không hợp lệ'), { status: 400 });
}

function serveStatic(webDir: string, pathname: string, res: ServerResponse): void {
  const root = resolve(webDir);
  let file = resolve(root, `.${decodeURIComponent(pathname)}`);
  if (file !== root && !file.startsWith(root + sep)) {
    send(res, 400, { error: 'Đường dẫn không hợp lệ' });
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    // Note routes end in ".md" and must still reach the SPA on reload.
    if (extname(pathname) && !pathname.startsWith('/notes/')) {
      send(res, 404, { error: 'Không tìm thấy' });
      return;
    }
    file = join(root, 'index.html');
  }
  if (!existsSync(file)) {
    send(res, 404, { error: 'Chưa build giao diện. Chạy `npm run build` trong tools/study (hoặc `npm run dev`).' });
    return;
  }
  const immutable = file.includes(`${sep}assets${sep}`);
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...SECURITY_HEADERS,
  });
  res.end(readFileSync(file));
}

export function createStudyServer(ctx: Ctx, webDir: string): Server {
  const app = createApp(ctx);
  return createHttpServer(async (req, res) => {
    try {
      if (!hostOk(req.headers.host)) return send(res, 403, { error: 'Host không được phép' });
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';
      if (url.pathname.startsWith('/api/')) {
        if (!originOk(req.headers.origin, req.headers.host)) return send(res, 403, { error: 'Origin không được phép' });
        let body: Record<string, unknown> = {};
        if (method !== 'GET') {
          if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) return send(res, 415, { error: 'Cần Content-Type: application/json' });
          body = await readJson(req);
        }
        const reply = await app(method, url.pathname, url.searchParams, body);
        return send(res, reply.status, reply.body);
      }
      if (method !== 'GET' && method !== 'HEAD') return send(res, 405, { error: 'Method không hỗ trợ' });
      serveStatic(webDir, url.pathname, res);
    } catch (e) {
      const status = (e as { status?: number }).status ?? 500;
      if (status === 500) console.error(e);
      send(res, status, { error: status === 500 ? 'Lỗi server' : (e as Error).message });
    }
  });
}
