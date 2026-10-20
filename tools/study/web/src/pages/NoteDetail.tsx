import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ApiError, post, put, type NoteDetail, type Proposal } from '../api.ts';
import { ErrorBox, Loading, Pill, fmtDay, msg, useApi, useTitle } from '../lib.tsx';

interface Draft extends Proposal {
  state: 'pending' | 'accepted' | 'rejected';
  editing: boolean;
}

interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

const CARDS_SHOWN = 4;

export default function NoteDetailPage() {
  const path = useParams()['*'] ?? '';
  const [params, setParams] = useSearchParams();
  const note = useApi<NoteDetail>(`/api/note?path=${encodeURIComponent(path)}`);
  useTitle(note.data?.title ?? 'Note');
  const editing = params.get('edit') === '1';

  if (note.error) {
    return (
      <div className="wrap section">
        <ErrorBox error={note.error} status={note.status} onRetry={note.reload} />
        <p>
          <Link to="/notes">← Về Notes</Link>
        </p>
      </div>
    );
  }
  if (!note.data) {
    return (
      <div className="wrap section">
        <Loading />
      </div>
    );
  }
  const n = note.data;
  const parts = n.path.split('/');

  function setEdit(on: boolean) {
    const next = new URLSearchParams(params);
    if (on) next.set('edit', '1');
    else next.delete('edit');
    setParams(next, { replace: true });
  }

  return (
    <div className="wrap section">
      <div className="cols-detail">
        <article>
          <p className="mono muted crumbs">
            <Link to="/notes">NOTES</Link>
            {parts.map((p, i) => (
              <span key={p}>
                {' / '}
                {i === parts.length - 1 ? <b className="ink">{p.toUpperCase()}</b> : p.toUpperCase()}
              </span>
            ))}
          </p>
          <div className="row between start wrap-row gap12 mt16">
            <div>
              <div className="row gap10">
                <Pill area={n.area} />
                <span className="mono muted">
                  SỬA {fmtDay(n.updated.slice(0, 10))} · {n.cards.length} THẺ
                </span>
              </div>
              <h1 className="h1 h1-md mt14">{n.title}</h1>
            </div>
            <div className="row gap8">
              {!editing && (
                <button className="btn btn-secondary" onClick={() => setEdit(true)}>
                  Sửa
                </button>
              )}
              <Link to={`/quiz?path=${encodeURIComponent(n.path)}`} className="btn btn-secondary">
                Phỏng vấn từ note
              </Link>
            </div>
          </div>

          {editing ? (
            <Editor note={n} onClose={() => setEdit(false)} onSaved={note.reload} />
          ) : (
            <div className="md mt32">
              <Markdown remarkPlugins={[remarkGfm]}>{n.content}</Markdown>
            </div>
          )}
        </article>

        <aside>
          <div className="sticky">
            <CardList note={n} />
            <Proposals path={n.path} onSaved={note.reload} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Editor({ note, onClose, onSaved }: { note: NoteDetail; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState(note.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const dirty = text !== note.content;

  async function save() {
    setBusy(true);
    setError('');
    try {
      await put('/api/note', { path: note.path, content: text });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt32">
      <label className="sr-only" htmlFor="editor">
        Nội dung markdown
      </label>
      <textarea
        id="editor"
        className="editor"
        value={text}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            void save();
          }
        }}
      />
      {error && <ErrorBox error={error} />}
      <div className="row gap12 mt14">
        <button className="btn btn-primary" onClick={() => void save()} disabled={busy || !dirty}>
          {busy ? 'Đang lưu…' : 'Lưu · Ctrl+S'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (!dirty || saved || window.confirm('Bỏ các thay đổi chưa lưu?')) onClose();
          }}
        >
          {saved && !dirty ? 'Xong' : 'Đóng'}
        </button>
        {saved && <span className="mono muted">ĐÃ LƯU</span>}
      </div>
      <p className="note">Thẻ ôn tập là các dòng Q: / A: trong mục ## Cards. Sửa câu hỏi sẽ tạo thẻ mới; thẻ cũ thành thẻ mồ côi.</p>
    </div>
  );
}

function CardList({ note }: { note: NoteDetail }) {
  const [all, setAll] = useState(false);
  const due = note.cards.filter((c) => c.due).length;
  const list = all ? note.cards : note.cards.slice(0, CARDS_SHOWN);
  return (
    <>
      <div className="sec-head">
        <h2 className="h3">Thẻ trong note</h2>
        <span className="mono muted">
          {note.cards.length} THẺ · {due} ĐẾN HẠN
        </span>
      </div>
      <div className="list-card">
        {note.cards.length === 0 && <p className="card-row muted">Note này chưa có thẻ. Thêm dòng Q:/A: hoặc nhờ AI đề xuất bên dưới.</p>}
        {list.map((c) => (
          <div key={c.id} className="card-row">
            <div className="card-q">{c.q}</div>
            <div className="card-meta mono">
              {c.isNew ? <span className="muted">MỚI</span> : c.due ? <span className="accent strong">ĐẾN HẠN</span> : <span className="muted">ôn lại {c.next ? fmtDay(c.next.slice(0, 10)) : ''}</span>}
              {c.lapses > 0 && <span className="muted">quên {c.lapses} lần</span>}
            </div>
          </div>
        ))}
        {note.cards.length > CARDS_SHOWN && (
          <div className="card-row">
            <button className="link-btn" onClick={() => setAll(!all)}>
              {all ? 'Thu gọn' : `Xem cả ${note.cards.length} thẻ`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Proposals({ path, onSaved }: { path: string; onSaved: () => void }) {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [usage, setUsage] = useState<Usage>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<number>();
  const [doneMsg, setDoneMsg] = useState('');

  useEffect(() => {
    setDrafts(null);
    setError('');
    setDoneMsg('');
  }, [path]);

  async function generate() {
    setBusy(true);
    setError('');
    setDoneMsg('');
    try {
      const r = await post<{ proposals: Proposal[]; usage: Usage }>('/api/gen', { path });
      setDrafts(r.proposals.map((p) => ({ ...p, state: 'pending', editing: false })));
      setUsage(r.usage);
    } catch (e) {
      setError(msg(e));
      setStatus(e instanceof ApiError ? e.status : undefined);
    } finally {
      setBusy(false);
    }
  }

  const patch = (i: number, p: Partial<Draft>) => setDrafts((d) => d && d.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const accepted = drafts?.filter((d) => d.state === 'accepted') ?? [];

  async function save() {
    setBusy(true);
    setError('');
    try {
      const r = await post<{ added: number }>('/api/cards', { path, cards: accepted.map(({ q, a }) => ({ q, a })) });
      setDrafts(null);
      setDoneMsg(`Đã lưu ${r.added} thẻ vào mục Cards của note.`);
      onSaved();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  const tokens = (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);

  return (
    <>
      <div className="ai-panel">
        <div className="ai-head">
          <span className="strong">AI đề xuất thẻ</span>
          <span className="mono muted">DEEPSEEK{tokens ? ` · ${(tokens / 1000).toFixed(1)}K TOKEN` : ''}</span>
        </div>
        {!drafts && (
          <div className="ai-pad">
            <button className="btn btn-primary btn-block" disabled={busy} onClick={() => void generate()}>
              {busy ? 'Đang nghĩ…' : 'Đề xuất thẻ từ note này'}
            </button>
          </div>
        )}
        {error && (
          <div className="ai-pad">
            <ErrorBox error={error} status={status} onRetry={generate} />
          </div>
        )}
        {doneMsg && <p className="ai-pad strong">{doneMsg}</p>}
        {drafts?.length === 0 && <p className="ai-pad muted">AI không đề xuất thêm thẻ nào mới.</p>}
        {drafts?.map((d, i) =>
          d.state === 'rejected' ? null : (
            <div key={i} className={d.state === 'accepted' ? 'ai-item is-accepted' : 'ai-item'}>
              {d.editing ? (
                <>
                  <label className="sr-only" htmlFor={`dq${i}`}>
                    Câu hỏi
                  </label>
                  <textarea id={`dq${i}`} className="mini" rows={2} value={d.q} onChange={(e) => patch(i, { q: e.target.value })} />
                  <label className="sr-only" htmlFor={`da${i}`}>
                    Đáp án
                  </label>
                  <textarea id={`da${i}`} className="mini" rows={3} value={d.a} onChange={(e) => patch(i, { a: e.target.value })} />
                </>
              ) : (
                <>
                  <div className="card-q">{d.q}</div>
                  <div className="ai-a">{d.a}</div>
                </>
              )}
              <div className="row gap8 mt10">
                {d.state === 'accepted' ? (
                  <>
                    <span className="mono strong">ĐÃ NHẬN</span>
                    <button className="chip" onClick={() => patch(i, { state: 'pending' })}>
                      Hoàn tác
                    </button>
                  </>
                ) : (
                  <>
                    <button className="chip chip-ink" disabled={!d.q.trim() || !d.a.trim()} onClick={() => patch(i, { state: 'accepted', editing: false })}>
                      Nhận
                    </button>
                    <button className="chip" onClick={() => patch(i, { editing: !d.editing })}>
                      {d.editing ? 'Xong' : 'Sửa'}
                    </button>
                    <button className="chip chip-quiet" onClick={() => patch(i, { state: 'rejected', editing: false })}>
                      Bỏ
                    </button>
                  </>
                )}
              </div>
            </div>
          ),
        )}
        {drafts && drafts.length > 0 && (
          <div className="ai-pad row gap8">
            <button className="btn btn-primary grow" disabled={busy || accepted.length === 0} onClick={() => void save()}>
              Lưu {accepted.length} thẻ vào note
            </button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => void generate()}>
              Tạo lại
            </button>
          </div>
        )}
      </div>
      <p className="note">AI chỉ dùng nội dung trong note này. Bạn duyệt từng thẻ trước khi lưu.</p>
    </>
  );
}
