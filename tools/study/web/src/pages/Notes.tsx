import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post, type NoteMeta } from '../api.ts';
import { AREA_TINT, ErrorBox, Eyebrow, Hero, Loading, Pill, msg, useApi, useTitle } from '../lib.tsx';

interface NotesRes {
  notes: NoteMeta[];
  areas: { area: string; count: number }[];
}

const PAGE = 9;
const STATUS = [
  { v: 'all', label: 'Tất cả trạng thái' },
  { v: 'due', label: 'Có thẻ đến hạn' },
  { v: 'nocards', label: 'Chưa có thẻ' },
] as const;
const SORT = [
  { v: 'updated', label: 'Mới sửa trước' },
  { v: 'due', label: 'Nhiều thẻ đến hạn' },
  { v: 'title', label: 'Tên A–Z' },
] as const;

const fmt = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

export default function NotesPage() {
  useTitle('Notes');
  const res = useApi<NotesRes>('/api/notes');
  const [q, setQ] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [status, setStatus] = useState<(typeof STATUS)[number]['v']>('all');
  const [sort, setSort] = useState<(typeof SORT)[number]['v']>('updated');
  const [page, setPage] = useState(1);
  const [slide, setSlide] = useState(0);
  const [creating, setCreating] = useState(false);

  const notes = res.data?.notes ?? [];
  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    const list = notes.filter(
      (n) =>
        (areas.length === 0 || areas.includes(n.area)) &&
        (status === 'all' || (status === 'due' ? n.due > 0 : n.cards === 0)) &&
        (!needle || norm(`${n.title} ${n.summary} ${n.path}`).includes(needle)),
    );
    return list.sort((a, b) =>
      sort === 'title' ? a.title.localeCompare(b.title, 'vi') : sort === 'due' ? b.due - a.due || b.updated.localeCompare(a.updated) : b.updated.localeCompare(a.updated),
    );
  }, [notes, q, areas, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = filtered.slice((cur - 1) * PAGE, cur * PAGE);
  const featured = useMemo(() => notes.filter((n) => n.due > 0).sort((a, b) => b.due - a.due).slice(0, 3), [notes]);
  const fi = featured.length ? slide % featured.length : 0;
  const hasFilter = q.trim() !== '' || areas.length > 0 || status !== 'all';

  function reset() {
    setQ('');
    setAreas([]);
    setStatus('all');
    setPage(1);
  }

  return (
    <>
      <Hero compact>
        <div className="row between end wrap-row gap12">
          <div>
            <Eyebrow>THƯ VIỆN · {notes.length} NOTE</Eyebrow>
            <h1 className="h1 h1-md">Notes của bạn</h1>
            <p className="lead">Mọi thẻ ôn tập đều sinh ra từ đây. Viết note trước, rồi để thẻ theo sau.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setCreating(true)}>
            + Note mới
          </button>
        </div>
      </Hero>

      <div className="wrap section">
        {res.error && <ErrorBox error={res.error} status={res.status} onRetry={res.reload} />}
        {!res.data && !res.error && <Loading />}

        {featured.length > 0 && (
          <section aria-label="Nên xem hôm nay" className="featured">
            <div className="sec-head">
              <h2 className="h2">Nên xem hôm nay</h2>
              <div className="row gap8">
                <span className="mono muted">
                  {fi + 1} / {featured.length}
                </span>
                <button className="icon-btn" aria-label="Slide trước" onClick={() => setSlide(fi - 1 + featured.length)}>
                  ‹
                </button>
                <button className="icon-btn" aria-label="Slide sau" onClick={() => setSlide(fi + 1)}>
                  ›
                </button>
              </div>
            </div>
            <Link to={`/notes/${featured[fi].path}`} className="slide" style={{ background: AREA_TINT[featured[fi].area] ?? '#E3E5EE' }}>
              <span className="mono strong">
                {featured[fi].area.toUpperCase()} · {featured[fi].due} THẺ ĐẾN HẠN
              </span>
              <span className="slide-title">{featured[fi].title}</span>
              <span className="slide-sum">{featured[fi].summary}</span>
            </Link>
          </section>
        )}

        {res.data && notes.length === 0 && (
          <div className="notice">
            <p>
              Chưa có note nào trong <code>notes/</code>. Bấm “Note mới” để tạo từ template, hoặc thêm file .md vào <code>notes/&lt;mảng&gt;/</code>.
            </p>
          </div>
        )}

        {notes.length > 0 && (
          <>
            <div className="filters" role="search">
              <label className="field field-grow">
                <span className="sr-only">Tìm note</span>
                <input
                  type="search"
                  placeholder="Tìm theo tên, nội dung tóm tắt…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <AreaFilter
                options={res.data?.areas ?? []}
                value={areas}
                onChange={(v) => {
                  setAreas(v);
                  setPage(1);
                }}
              />
              <label className="field">
                <span className="sr-only">Trạng thái</span>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as typeof status);
                    setPage(1);
                  }}
                >
                  {STATUS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="sr-only">Sắp xếp</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  {SORT.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {hasFilter && (
              <div className="tags">
                {q.trim() && (
                  <Tag onRemove={() => setQ('')}>“{q.trim()}”</Tag>
                )}
                {areas.map((a) => (
                  <Tag key={a} onRemove={() => setAreas(areas.filter((x) => x !== a))}>
                    {a}
                  </Tag>
                ))}
                {status !== 'all' && <Tag onRemove={() => setStatus('all')}>{STATUS.find((s) => s.v === status)?.label}</Tag>}
                <button className="link-btn" onClick={reset}>
                  Xoá bộ lọc
                </button>
              </div>
            )}

            <p className="mono muted mt20" aria-live="polite">
              {filtered.length} NOTE
            </p>

            {filtered.length === 0 ? (
              <p className="notice">Không có note nào khớp bộ lọc.</p>
            ) : (
              <ul className="grid-3">
                {shown.map((n) => (
                  <li key={n.path}>
                    <Link to={`/notes/${n.path}`} className="note-card">
                      <span className="thumb" style={{ background: AREA_TINT[n.area] ?? '#E3E5EE' }} aria-hidden="true">
                        <i />
                        <i />
                      </span>
                      <span className="note-body">
                        <span className="row gap8">
                          <Pill area={n.area} />
                          {n.due > 0 && <span className="mono accent strong">{n.due} ĐẾN HẠN</span>}
                        </span>
                        <span className="note-title">{n.title}</span>
                        <span className="note-sum">{n.summary || 'Chưa có tóm tắt.'}</span>
                        <span className="mono muted">
                          {n.cards} THẺ · SỬA {fmt(n.updated)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {pages > 1 && (
              <nav className="pager" aria-label="Phân trang">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={p === cur ? 'pg is-on' : 'pg'} aria-current={p === cur ? 'page' : undefined} onClick={() => setPage(p)}>
                    {p}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </div>

      {creating && <NewNote areas={res.data?.areas.map((a) => a.area) ?? []} onClose={() => setCreating(false)} />}
    </>
  );
}

function Tag({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="tag">
      {children}
      <button onClick={onRemove} aria-label="Bỏ bộ lọc">
        ×
      </button>
    </span>
  );
}

function AreaFilter({ options, value, onChange }: { options: { area: string; count: number }[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div className="dropdown" ref={ref}>
      <button className="select-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        Mảng{value.length ? ` · ${value.length}` : ''}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="panel">
          {options.map((o) => (
            <label key={o.area} className="check-row">
              <input
                type="checkbox"
                checked={value.includes(o.area)}
                onChange={() => onChange(value.includes(o.area) ? value.filter((x) => x !== o.area) : [...value, o.area])}
              />
              <span>{o.area}</span>
              <span className="mono muted">{o.count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function NewNote({ areas, onClose }: { areas: string[]; onClose: () => void }) {
  const navigate = useNavigate();
  const known = [...new Set([...areas, 'network', 'devops', 'database', 'system-design', 'ai', 'dsa', 'frontend', 'architecture', 'interview', 'optimizely'])];
  const [area, setArea] = useState(known[0]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await post<{ path: string }>('/api/notes', { area, title });
      navigate(`/notes/${r.path}?edit=1`);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="nn-t" onSubmit={submit}>
        <h2 id="nn-t" className="h2">
          Note mới
        </h2>
        <label className="label">
          Mảng
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {known.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="label">
          Tiêu đề
          <input ref={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: TCP vs UDP" required maxLength={120} />
        </label>
        {error && <ErrorBox error={error} />}
        <div className="row gap12 mt20">
          <button className="btn btn-primary" disabled={busy || !title.trim()}>
            Tạo note
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}
