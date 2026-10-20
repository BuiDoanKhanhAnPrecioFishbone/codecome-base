import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { appendCards, listNoteFiles, parseCards, areaOf, scanNotes, createNoteFromTemplate, slugify } from './cards.ts';
import { chatJson, loadConfig, type LlmConfig, type Usage } from './llm.ts';
import { ENV_FILE, NOTES_DIR, QUIZ_FILE, REVIEWS_FILE, ROOT, STATE_FILE, TEMPLATE_FILE, pathsFor } from './paths.ts';
import { MIGRATION_FILE, collectLocal, connect, databaseUrl, planPull, planPush, withSha, writeLocal } from './cloud.ts';
import {
  GEN_SYSTEM, GRADE_SYSTEM, QUIZ_SYSTEM, genUser, gradeUser, parseGen, parseGrade, parseQuiz, quizUser,
} from './prompts.ts';
import { buildQueue, countNewDoneToday, shuffle } from './queue.ts';
import { computeStats } from './stats.ts';
import {
  appendJsonl, applyReview, loadState, readJsonl, saveState, syncCards, Rating,
  type Grade, type ReviewEntry, type StudyState,
} from './store.ts';

const MAX_NOTE_CHARS = 60_000;

const HELP = `study — ôn tập theo FSRS + DeepSeek

  new <area> <chủ-đề>        tạo note từ template (notes/<area>/<chủ-đề>.md)
  sync                       quét notes/, cập nhật thẻ
  review [--area x] [--new 10] [--max 40]
  gen <note>                 AI đề xuất thẻ từ note, bạn duyệt từng thẻ
  quiz [note|area] [--n 3]   AI phỏng vấn, chấm câu trả lời của bạn
  stats                      tổng quan tiến độ
  cloud init|status|push|pull [--force]
                             sao lưu/khôi phục notes + data lên Supabase (schema study)`;

function parseArgs(argv: string[]) {
  const pos: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i] ?? '';
    else pos.push(argv[i]);
  }
  return { pos, flags };
}

function intFlag(flags: Record<string, string>, k: string, def: number): number {
  if (!(k in flags)) return def;
  const n = Number.parseInt(flags[k], 10);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${k} phải là số nguyên không âm`);
  return n;
}

function resolveNote(arg: string): string | null {
  for (const p of [resolve(arg), resolve(ROOT, arg), resolve(NOTES_DIR, arg)]) {
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

function doSync(state: StudyState): void {
  const r = syncCards(state, scanNotes(NOTES_DIR), new Date());
  saveState(STATE_FILE, state);
  console.log(`Sync: +${r.added} mới, ${r.updated} cập nhật, ${r.orphaned} mồ côi, ${r.restored} khôi phục.`);
}

function requireLlm(): LlmConfig {
  const cfg = loadConfig(ENV_FILE);
  if (!cfg) throw new Error('Chưa có DEEPSEEK_API_KEY. Đặt trong .env ở thư mục gốc repo (xem tools/study/README.md).');
  return cfg;
}

function readNote(file: string): string {
  const text = readFileSync(file, 'utf8');
  if (text.length > MAX_NOTE_CHARS) {
    console.log(`(Note dài ${text.length} ký tự, chỉ gửi ${MAX_NOTE_CHARS} ký tự đầu.)`);
    return text.slice(0, MAX_NOTE_CHARS);
  }
  return text;
}

function printUsage(u: Usage): void {
  console.log(`  [tokens: in ${u.prompt_tokens ?? '?'} (cache ${u.prompt_cache_hit_tokens ?? 0}), out ${u.completion_tokens ?? '?'}]`);
}

interface Io {
  ask(prompt: string): Promise<string>;
  close(): void;
}

class InputEnded extends Error {}

/** Line queue instead of rl.question, so piped stdin does not drop buffered lines. */
function makeIo(): Io {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  const lines: string[] = [];
  const waiters: { resolve: (s: string) => void; reject: (e: Error) => void }[] = [];
  let ended = false;
  rl.on('line', (l) => {
    const w = waiters.shift();
    if (w) w.resolve(l);
    else lines.push(l);
  });
  rl.on('close', () => {
    ended = true;
    for (const w of waiters.splice(0)) w.reject(new InputEnded('Hết input'));
  });
  return {
    ask(prompt) {
      process.stdout.write(prompt);
      const buffered = lines.shift();
      if (buffered !== undefined) return Promise.resolve(buffered);
      if (ended) return Promise.reject(new InputEnded('Hết input'));
      return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
    },
    close: () => rl.close(),
  };
}

async function readMultiline(rl: Io, prompt: string): Promise<string> {
  console.log(prompt);
  const lines: string[] = [];
  for (;;) {
    const line = await rl.ask('> ');
    if (line.trim() === '') {
      if (lines.length > 0) break;
      continue;
    }
    lines.push(line);
  }
  return lines.join('\n');
}

async function cmdNew(pos: string[]): Promise<void> {
  const [area, ...rest] = pos;
  if (!area || rest.length === 0) throw new Error('Dùng: study new <area> <chủ-đề>');
  const title = rest.join(' ');
  const slug = slugify(title);
  if (!slug || !/^[a-z0-9_-]+$/i.test(area)) throw new Error('Tên area/chủ-đề không hợp lệ');
  const dir = join(NOTES_DIR, area);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, `${slug}.md`);
  try {
    createNoteFromTemplate(TEMPLATE_FILE, target, title);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Đã tồn tại: ${target}`);
    throw e;
  }
  console.log(`Đã tạo ${target}`);
}

async function cmdReview(rl: Io, flags: Record<string, string>): Promise<void> {
  const state = loadState(STATE_FILE);
  doSync(state);
  const now = new Date();
  const reviews = readJsonl<ReviewEntry>(REVIEWS_FILE);
  const queue = buildQueue(Object.values(state.cards), now, {
    maxNew: intFlag(flags, 'new', 10),
    maxTotal: intFlag(flags, 'max', 40),
    newDoneToday: countNewDoneToday(reviews, now),
    area: flags.area,
  });
  if (queue.length === 0) {
    console.log('Không có thẻ nào cần ôn hôm nay. 🎉');
    return;
  }
  console.log(`Hôm nay: ${queue.length} thẻ. Enter = hiện đáp án. Chấm: 1 quên, 2 khó, 3 nhớ, 4 dễ, q thoát.\n`);

  const again = [];
  let done = 0;
  for (const card of queue) {
    console.log(`[${card.area}] ${card.q}`);
    await rl.ask('  (Enter để xem đáp án) ');
    console.log(`\n${card.a}\n`);
    let rating: Grade | null = null;
    for (;;) {
      const ans = (await rl.ask('  Chấm 1-4 (q thoát): ')).trim().toLowerCase();
      if (ans === 'q') {
        console.log(`\nĐã ôn ${done} thẻ.`);
        return;
      }
      if (['1', '2', '3', '4'].includes(ans)) {
        rating = Number(ans) as Grade;
        break;
      }
    }
    appendJsonl(REVIEWS_FILE, applyReview(card, rating, new Date()));
    saveState(STATE_FILE, state);
    done++;
    if (rating === Rating.Again) again.push(card);
    console.log();
  }

  if (again.length > 0) {
    console.log(`--- Ôn lại ${again.length} thẻ quên (không tính lịch) ---\n`);
    for (const card of shuffle(again)) {
      console.log(`[${card.area}] ${card.q}`);
      await rl.ask('  (Enter để xem đáp án) ');
      console.log(`\n${card.a}\n`);
    }
  }
  console.log(`Xong ${done} thẻ.`);
}

async function cmdGen(rl: Io, pos: string[]): Promise<void> {
  if (!pos[0]) throw new Error('Dùng: study gen <note>');
  const file = resolveNote(pos[0]);
  if (!file) throw new Error(`Không tìm thấy note: ${pos[0]}`);
  const cfg = requireLlm();
  const text = readNote(file);
  const existing = parseCards(text, file, areaOf(NOTES_DIR, file)).map((c) => c.q);
  console.log('Đang nhờ DeepSeek đề xuất thẻ...');
  const { data, usage } = await chatJson(cfg, {
    system: GEN_SYSTEM,
    user: genUser(text, existing),
    validate: parseGen,
  });
  printUsage(usage);

  const accepted: { q: string; a: string }[] = [];
  for (const [i, c] of data.entries()) {
    console.log(`\n(${i + 1}/${data.length})\nQ: ${c.q}\nA: ${c.a}`);
    for (;;) {
      const ans = (await rl.ask('  [y] nhận / [n] bỏ / [e] sửa: ')).trim().toLowerCase();
      if (ans === 'y') {
        accepted.push(c);
        break;
      }
      if (ans === 'n') break;
      if (ans === 'e') {
        const q = (await rl.ask('  Q mới (Enter giữ nguyên): ')).trim() || c.q;
        const a = (await rl.ask('  A mới (Enter giữ nguyên): ')).trim() || c.a;
        accepted.push({ q, a });
        break;
      }
    }
  }
  appendCards(file, accepted);
  console.log(`\nĐã thêm ${accepted.length} thẻ vào ${basename(file)}.`);
  doSync(loadState(STATE_FILE));
}

function pickNote(arg: string | undefined): string {
  if (arg) {
    const f = resolveNote(arg);
    if (f) return f;
  }
  const areaDir = arg ? join(NOTES_DIR, arg) : NOTES_DIR;
  if (arg && !existsSync(areaDir)) throw new Error(`Không tìm thấy note hay area: ${arg}`);
  const candidates = listNoteFiles(areaDir).filter((f) => readFileSync(f, 'utf8').length > 300);
  if (candidates.length === 0) throw new Error('Chưa có note đủ nội dung để phỏng vấn.');
  return shuffle(candidates)[0];
}

async function cmdQuiz(rl: Io, pos: string[], flags: Record<string, string>): Promise<void> {
  const cfg = requireLlm();
  const file = pickNote(pos[0]);
  const text = readNote(file);
  const n = Math.max(1, Math.min(intFlag(flags, 'n', 3), 8));
  console.log(`Note: ${file}\nĐang tạo ${n} câu hỏi...`);
  const { data: questions, usage } = await chatJson(cfg, {
    system: QUIZ_SYSTEM,
    user: quizUser(text, n),
    validate: parseQuiz,
  });
  printUsage(usage);

  const state = loadState(STATE_FILE);
  let saved = 0;
  for (const [i, q] of questions.slice(0, n).entries()) {
    console.log(`\n=== Câu ${i + 1}/${Math.min(n, questions.length)} ===\n${q.q}\n`);
    const answer = await readMultiline(rl, '(Trả lời nhiều dòng, dòng trống để nộp)');
    console.log('Đang chấm...');
    const { data: g, usage: u } = await chatJson(cfg, {
      system: GRADE_SYSTEM,
      user: gradeUser(text, q, answer),
      validate: parseGrade,
    });
    printUsage(u);
    console.log(`\nĐiểm: ${g.score}/4`);
    if (g.covered.length) console.log(`✔ Đủ: ${g.covered.join('; ')}`);
    if (g.missing.length) console.log(`✘ Thiếu: ${g.missing.join('; ')}`);
    if (g.wrong.length) console.log(`⚠ Sai: ${g.wrong.join('; ')}`);
    console.log(`\n${g.feedback}\n\nĐáp án mẫu: ${g.modelAnswer}`);
    appendJsonl(QUIZ_FILE, { ts: new Date().toISOString(), file: file.replace(ROOT, ''), q: q.q, score: g.score, missing: g.missing });

    if (g.score <= 2 && g.modelAnswer) {
      const ans = (await rl.ask('\nLưu thành thẻ ôn tập? [y/N] ')).trim().toLowerCase();
      if (ans === 'y') {
        appendCards(file, [{ q: q.q, a: g.modelAnswer }]);
        saved++;
      }
    }
  }
  if (saved > 0) doSync(state);
}

function cmdStats(): void {
  const state = loadState(STATE_FILE);
  doSync(state);
  const s = computeStats(Object.values(state.cards), readJsonl<ReviewEntry>(REVIEWS_FILE), new Date());
  console.log(`\nThẻ: ${s.total} (mới ${s.newCards}, mồ côi ${s.orphans}) — cần ôn hôm nay: ${s.dueToday}`);
  console.log(`Streak: ${s.streak} ngày | 30 ngày: ${s.reviews30} lượt ôn | Nhớ (thẻ trưởng thành): ${s.retention30 === null ? 'chưa đủ dữ liệu' : `${Math.round(s.retention30 * 100)}%`}`);
  console.log('\nTheo mảng:');
  for (const a of s.byArea) console.log(`  ${a.area.padEnd(14)} ${String(a.total).padStart(4)} thẻ, ${a.due} cần ôn`);
  console.log('\n7 ngày qua:');
  for (const d of s.last7) console.log(`  ${d.day} ${'█'.repeat(Math.min(d.count, 40))} ${d.count}`);
  if (s.hardest.length) {
    console.log('\nThẻ hay quên nhất:');
    for (const h of s.hardest) console.log(`  (${h.lapses}x) [${h.area}] ${h.q}`);
  }
}

async function cmdCloud(pos: string[], flags: Record<string, string>): Promise<void> {
  const sub = pos[0];
  if (!['init', 'status', 'push', 'pull'].includes(sub ?? '')) {
    throw new Error('Dùng: cloud init | status | push [--force] | pull [--force]');
  }
  const url = databaseUrl(ENV_FILE);
  if (!url) throw new Error('Chưa có STUDY_DATABASE_URL trong .env ở thư mục gốc repo (chuỗi kết nối Postgres của Supabase).');
  const force = 'force' in flags;
  const paths = pathsFor(ROOT);
  const remote = await connect(url);
  try {
    if (sub === 'init') {
      await remote.sql.unsafe(readFileSync(MIGRATION_FILE, 'utf8'));
      console.log('Đã tạo (hoặc xác nhận có sẵn) schema `study` với bảng `study.files`.');
      return;
    }
    const [local, theirs] = [collectLocal(paths), await remote.list()];
    const plan = sub === 'pull' ? planPull(local, theirs, force) : planPush(local, theirs, force);
    const verb = sub === 'pull' ? 'ghi về máy' : 'đẩy lên';
    for (const a of plan.actions) console.log(`  ${a.why === 'new' ? '+' : '~'} ${a.path} (${a.why})`);
    for (const c of plan.conflicts) console.log(`  ! ${c}: bản ${sub === 'pull' ? 'trên máy' : 'trên cloud'} mới hơn, bỏ qua (dùng --force để ghi đè)`);
    if (sub === 'status') {
      console.log(`Cần đẩy lên: ${plan.actions.length} file, xung đột: ${plan.conflicts.length}, đã giống nhau: ${plan.same}.`);
      return;
    }
    if (sub === 'push') await remote.upsert(plan.actions.map(withSha));
    else writeLocal(paths, plan.actions);
    console.log(`Đã ${verb} ${plan.actions.length} file, ${plan.same} file giống nhau, ${plan.conflicts.length} xung đột.`);
  } finally {
    await remote.close();
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, flags } = parseArgs(rest);
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(HELP);
    return;
  }
  const interactive = ['review', 'gen', 'quiz'].includes(cmd);
  const rl = interactive ? makeIo() : null;
  try {
    switch (cmd) {
      case 'new': return await cmdNew(pos);
      case 'sync': return doSync(loadState(STATE_FILE));
      case 'stats': return cmdStats();
      case 'cloud': return await cmdCloud(pos, flags);
      case 'review': return await cmdReview(rl!, flags);
      case 'gen': return await cmdGen(rl!, pos);
      case 'quiz': return await cmdQuiz(rl!, pos, flags);
      default:
        console.log(`Lệnh không có: ${cmd}\n\n${HELP}`);
        process.exitCode = 1;
    }
  } finally {
    rl?.close();
  }
}

main().catch((e) => {
  if (e instanceof InputEnded) return;
  console.error(`Lỗi: ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
});
