import { build } from 'esbuild';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const here = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = join(here, '..', '..');

execSync('npx vite build', { cwd: here, stdio: 'inherit' });

rmSync(join(here, 'dist-api'), { recursive: true, force: true });
await build({
  entryPoints: [join(here, 'src/server/vercel.ts')],
  outfile: join(here, 'dist-api/handler.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'info',
});

// Read-only inputs the function needs at runtime.
rmSync(join(here, 'bundle'), { recursive: true, force: true });
mkdirSync(join(here, 'bundle'), { recursive: true });
copyFileSync(join(repoRoot, 'ROADMAP.md'), join(here, 'bundle', 'ROADMAP.md'));
copyFileSync(join(repoRoot, 'templates', 'note.md'), join(here, 'bundle', 'note.md'));
console.log('build:vercel xong');
