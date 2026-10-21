import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ApiError, post, type Strand } from '../api.ts';
import { ErrorBox, Eyebrow, Hero, Loading, Pill, fmtDay, msg, useApi, useTitle, useToday } from '../lib.tsx';

interface LessonData {
  week: number;
  strand: Strand;
  topic: string;
  exists: boolean;
  content?: string;
  source?: 'curated' | 'ai';
  updated?: string;
}

const AREAS = ['network', 'devops', 'architecture', 'database', 'frontend', 'ai', 'dsa', 'interview'];
const DEFAULT_AREA: Record<string, string> = { S: 'network', F: 'frontend', A: 'ai', D: 'dsa' };
const LABEL: Record<string, string> = { S: 'hệ thống', F: 'frontend', A: 'ai', D: 'dsa' };

export default function LessonPage() {
  const { week = '', strand = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const lesson = useApi<LessonData>(`/api/lesson?week=${encodeURIComponent(week)}&strand=${encodeURIComponent(strand)}`);
  const today = useToday();
  useTitle(lesson.data?.topic ?? 'Bài học');

  const slot = params.get('slot');
  const date = params.get('date');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<number>();
  const [area, setArea] = useState(DEFAULT_AREA[strand] ?? 'network');

  const planItem = today.data?.plan.find((p) => p.slot === slot && date === today.data?.date);
  const missed = today.data?.backlog.find((b) => b.slot === slot && b.date === date);
  const done = planItem ? planItem.done : slot && date ? !missed : false;

  if (lesson.error) {
    return (
      <div className="wrap section">
        <ErrorBox error={lesson.error} status={lesson.status} onRetry={lesson.reload} />
        <p>
          <Link to="/">← Về Hôm nay</Link>
        </p>
      </div>
    );
  }
  if (!lesson.data) {
    return (
      <div className="wrap section">
        <Loading />
      </div>
    );
  }
  const l = lesson.data;

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError('');
    setStatus(undefined);
    try {
      return await fn();
    } catch (e) {
      setError(msg(e));
      setStatus(e instanceof ApiError ? e.status : undefined);
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function generate(replace: boolean) {
    if (replace && !window.confirm('Tạo lại sẽ ghi đè bài AI hiện tại. Tiếp tục?')) return;
    const r = await run(() => post('/api/lesson/gen', { week: l.week, strand: l.strand, replace }));
    if (r) lesson.reload();
  }

  async function markDone() {
    if (!slot || !date) return;
    const r = await run(() => post('/api/daily', { date, slot, done: !done }));
    if (r) today.reload();
  }

  async function makeNote() {
    const r = await run(async () => {
      try {
        return await post<{ path: string }>('/api/notes', { area, title: l.topic });
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) return { path: `${area}/${slugOf(l.topic)}.md` };
        throw e;
      }
    });
    if (r) navigate(`/notes/${r.path}?edit=1`);
  }

  return (
    <>
      <Hero compact>
        <Eyebrow>
          TUẦN {l.week} · {l.strand}
          {l.source ? ` · ${l.source === 'ai' ? 'AI VIẾT (DEEPSEEK)' : 'VIẾT TAY'}` : ''}
        </Eyebrow>
        <h1 className="h1 h1-md">{l.topic}</h1>
        <div className="row gap10 mt14">
          <Pill area={l.strand === 'S' ? 'network' : DEFAULT_AREA[l.strand]} label={LABEL[l.strand]} />
          {l.updated && <span className="mono muted">SỬA {fmtDay(l.updated.slice(0, 10))}</span>}
        </div>
      </Hero>

      <div className="wrap section">
        <div className="cols-detail">
          <article>
            {l.exists && l.content ? (
              <div className="md">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {l.content.replace(/^\s*<!--[\s\S]*?-->\s*/, '').replace(/^\s*#\s[^\n]*\n/, '')}
                </Markdown>
              </div>
            ) : (
              <div className="notice">
                <p className="strong">Chưa có bài cho chủ đề này.</p>
                <p className="muted">
                  DeepSeek sẽ viết một bài ~45 phút đọc theo cấu trúc: tổng quan, khái niệm cốt lõi, câu hỏi phỏng vấn, tự kiểm tra, lab, tài liệu miễn phí. Bài được lưu vào <code>lessons/</code>.
                </p>
                <button className="btn btn-primary mt14" disabled={busy} onClick={() => void generate(false)}>
                  {busy ? 'AI đang viết… (khoảng 30–60 giây)' : 'Tạo bài bằng AI'}
                </button>
              </div>
            )}
            {error && <ErrorBox error={error} status={status} />}
          </article>

          <aside>
            <div className="sticky">
              <div className="ai-panel">
                <div className="ai-head">
                  <span className="strong">Sau khi đọc</span>
                </div>
                <div className="ai-pad stack12">
                  {slot && date && (
                    <button className={done ? 'btn btn-secondary btn-block' : 'btn btn-primary btn-block'} disabled={busy || !planItem} onClick={() => void markDone()}>
                      {done ? 'Đã xong · bỏ đánh dấu' : `Đánh dấu xong (${planItem?.minutes ?? ''}')`}
                    </button>
                  )}
                  <label className="mono muted" htmlFor="area">
                    VIẾT NOTE VÀO MẢNG
                  </label>
                  <select id="area" className="mini" value={area} onChange={(e) => setArea(e.target.value)}>
                    {AREAS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                  <button className="btn btn-secondary btn-block" disabled={busy} onClick={() => void makeNote()}>
                    Tạo note từ bài này
                  </button>
                  <Link to="/quiz" className="btn btn-secondary btn-block">
                    Phỏng vấn AI
                  </Link>
                  {l.exists && l.source === 'ai' && (
                    <button className="link-btn" disabled={busy} onClick={() => void generate(true)}>
                      {busy ? 'Đang viết lại…' : 'Tạo lại bài bằng AI'}
                    </button>
                  )}
                </div>
              </div>
              <p className="note">Đọc xong, tự viết note bằng lời của bạn rồi để AI đề xuất thẻ ôn. Ghi lại bằng lời mình mới nhớ lâu.</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function slugOf(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
