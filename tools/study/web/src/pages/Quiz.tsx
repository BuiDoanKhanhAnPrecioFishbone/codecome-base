import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, post, type Grade, type QuizQuestion } from '../api.ts';
import { AREA_TINT, ErrorBox, Eyebrow, Hero, msg, useTitle, useToday } from '../lib.tsx';

interface Session {
  path: string;
  title: string;
  questions: QuizQuestion[];
}

interface Turn {
  answer: string;
  grade: Grade | null;
  saved: boolean;
}

const AREAS = Object.keys(AREA_TINT).filter((a) => a !== 'english');
const verdict = (s: number) =>
  s >= 4 ? 'Đủ ý, trả lời tốt' : s === 3 ? 'Khá tốt, còn một vài ý nhỏ' : s === 2 ? 'Đúng hướng, còn thiếu ý chính' : s === 1 ? 'Còn xa, cần học lại phần này' : 'Chưa trả lời được ý nào';

export default function QuizPage() {
  useTitle('Phỏng vấn AI');
  const [params] = useSearchParams();
  const pathParam = params.get('path') ?? '';
  const today = useToday();
  const [session, setSession] = useState<Session | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [idx, setIdx] = useState(0);
  const [area, setArea] = useState('');
  const [n, setN] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<number>();
  const [finished, setFinished] = useState(false);

  function fail(e: unknown) {
    setError(msg(e));
    setStatus(e instanceof ApiError ? e.status : undefined);
  }

  async function start() {
    setBusy(true);
    setError('');
    try {
      const body = pathParam ? { path: pathParam, n } : { area: area || undefined, n };
      const r = await post<Session>('/api/quiz/start', body);
      setSession(r);
      setTurns(r.questions.map(() => ({ answer: '', grade: null, saved: false })));
      setIdx(0);
      setFinished(false);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <>
        <Hero compact>
          <Eyebrow>PHỎNG VẤN THỬ · AI CHẤM THEO NOTE CỦA BẠN</Eyebrow>
          <h1 className="h1 h1-md">Trả lời như đang phỏng vấn.</h1>
          <p className="lead">AI hỏi dựa trên nội dung note, rồi chấm câu trả lời của bạn theo đúng các ý chính trong note đó.</p>
        </Hero>
        <div className="wrap section narrow-l">
          <div className="setup">
            {pathParam ? (
              <p>
                Từ note: <b className="mono">{pathParam}</b> · <Link to="/quiz">chọn nguồn khác</Link>
              </p>
            ) : (
              <label className="label">
                Mảng
                <select value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">Ngẫu nhiên mọi mảng</option>
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="label">
              Số câu
              <select value={n} onChange={(e) => setN(Number(e.target.value))}>
                {[3, 5, 8].map((v) => (
                  <option key={v} value={v}>
                    {v} câu
                  </option>
                ))}
              </select>
            </label>
            {error && <ErrorBox error={error} status={status} onRetry={() => void start()} />}
            <div>
              <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => void start()}>
                {busy ? 'Đang chuẩn bị câu hỏi…' : 'Bắt đầu phỏng vấn'}
              </button>
            </div>
          </div>
          <p className="note">Chọn ngẫu nhiên một note đủ dài (hơn 300 ký tự). Mỗi câu chấm xong được ghi vào data/quiz.jsonl để tính điểm trung bình.</p>
        </div>
      </>
    );
  }

  const q = session.questions[idx];
  const turn = turns[idx];
  const patch = (p: Partial<Turn>) => setTurns((t) => t.map((x, i) => (i === idx ? { ...x, ...p } : x)));
  const scores = turns.map((t) => t.grade?.score ?? null);

  async function grade() {
    if (!turn.answer.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await post<{ grade: Grade }>('/api/quiz/grade', {
        path: session!.path,
        question: q,
        answer: turn.answer,
      });
      patch({ grade: r.grade });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function saveCard() {
    if (!turn.grade) return;
    setBusy(true);
    setError('');
    try {
      await post('/api/cards', { path: session!.path, cards: [{ q: q.q, a: turn.grade.modelAnswer }] });
      patch({ saved: true });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  function advance() {
    setError('');
    if (idx + 1 < session!.questions.length) setIdx(idx + 1);
    else {
      setFinished(true);
      today.reload();
    }
  }

  if (finished) {
    const graded = scores.filter((s): s is number => s !== null);
    const avg = graded.length ? graded.reduce((a, b) => a + b, 0) / graded.length : 0;
    return (
      <div className="wrap section narrow">
        <p className="eyebrow">XONG PHIÊN PHỎNG VẤN · {session.title.toUpperCase()}</p>
        <h1 className="h1 h1-sm">
          {avg.toFixed(1)}
          <span className="h1-unit"> / 4 trung bình</span>
        </h1>
        <ul className="list-card mt28">
          {session.questions.map((qq, i) => (
            <li key={i} className="card-row row gap12">
              <span className="score-sq is-done">{scores[i] ?? '–'}</span>
              <span className="grow">{qq.q}</span>
            </li>
          ))}
        </ul>
        <div className="row gap12 mt28">
          <button
            className="btn btn-primary"
            onClick={() => {
              setSession(null);
              setError('');
            }}
          >
            Phiên mới
          </button>
          <Link to={`/notes/${session.path}`} className="btn btn-secondary">
            Mở note để ôn lại
          </Link>
        </div>
      </div>
    );
  }

  const g = turn.grade;
  return (
    <>
      <Hero compact>
        <div className="row between end wrap-row gap12">
          <div>
            <Eyebrow>PHỎNG VẤN THỬ · TỪ NOTE: {session.path.toUpperCase()}</Eyebrow>
            <h1 className="h1 h1-md">
              Câu {idx + 1} / {session.questions.length}
            </h1>
          </div>
          <div className="row gap8" aria-label="Điểm từng câu">
            {scores.map((s, i) => (
              <span key={i} className={s !== null ? 'score-sq is-done' : i === idx ? 'score-sq is-cur' : 'score-sq'}>
                {s !== null ? s : i === idx ? i + 1 : '?'}
              </span>
            ))}
          </div>
        </div>
      </Hero>

      <div className="wrap section">
        <div className="cols-2 cols-quiz">
          <div>
            <span className="mono strong">CÂU HỎI</span>
            <h2 className="quiz-q">{q.q}</h2>
            <label className="sr-only" htmlFor="answer">
              Câu trả lời của bạn
            </label>
            <textarea
              id="answer"
              className="answer"
              placeholder="Câu trả lời của bạn…"
              value={turn.answer}
              disabled={!!g || busy}
              maxLength={8000}
              onChange={(e) => patch({ answer: e.target.value })}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void grade();
                }
              }}
            />
            {!g && (
              <div className="row gap12 mt14">
                <button className="btn btn-primary" disabled={busy || !turn.answer.trim()} onClick={() => void grade()}>
                  {busy ? 'Đang chấm…' : 'Nộp để chấm'}
                </button>
                <span className="mono muted">CTRL + ENTER · ĐÃ NHẬP {turn.answer.length} KÝ TỰ</span>
              </div>
            )}
            {error && <ErrorBox error={error} status={status} />}
            <p className="tip">Cách tập: nói to câu trả lời bằng tiếng Anh trước, rồi viết lại bằng ngôn ngữ bạn thấy rõ ý nhất.</p>
          </div>

          <div className="result" aria-live="polite">
            {g ? (
              <>
                <div className="result-head">
                  <span className="result-score">
                    {g.score}
                    <span>/4</span>
                  </span>
                  <div>
                    <div className="strong result-v">{verdict(g.score)}</div>
                    <div className="mono muted">CHẤM THEO NOTE CỦA BẠN</div>
                  </div>
                </div>
                <div className="result-sec">
                  {g.covered.length > 0 && (
                    <>
                      <div className="mono strong">ĐÃ ĐỦ</div>
                      {g.covered.map((c) => (
                        <div key={c} className="pt">
                          <i /> {c}
                        </div>
                      ))}
                    </>
                  )}
                  {g.missing.length > 0 && (
                    <>
                      <div className="mono strong warn mt16">CÒN THIẾU</div>
                      {g.missing.map((c) => (
                        <div key={c} className="pt is-warn">
                          <i /> {c}
                        </div>
                      ))}
                    </>
                  )}
                  {g.wrong.length > 0 && (
                    <>
                      <div className="mono strong warn mt16">CHƯA CHÍNH XÁC</div>
                      {g.wrong.map((c) => (
                        <div key={c} className="pt is-warn">
                          <i /> {c}
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="result-sec">
                  <div className="mono strong">NHẬN XÉT</div>
                  <p>{g.feedback}</p>
                </div>
                <div className="result-sec">
                  <div className="mono strong accent">ĐÁP ÁN MẪU</div>
                  <p>{g.modelAnswer}</p>
                </div>
                <div className="result-foot row gap8">
                  <button className="btn btn-secondary" disabled={busy || turn.saved} onClick={() => void saveCard()}>
                    {turn.saved ? 'Đã lưu thành thẻ' : 'Lưu thành thẻ ôn tập'}
                  </button>
                  <button className="btn btn-primary grow" onClick={advance}>
                    {idx + 1 < session.questions.length ? 'Câu tiếp theo' : 'Xem kết quả'}
                  </button>
                </div>
              </>
            ) : (
              <p className="muted result-empty">Nộp câu trả lời để xem điểm, các ý còn thiếu và đáp án mẫu.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
