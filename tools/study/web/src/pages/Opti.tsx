import { useEffect, useRef, useState } from 'react';
import { ApiError, post } from '../api.ts';
import { ErrorBox, Eyebrow, Hero, Loading, msg, pct, useApi, useTitle } from '../lib.tsx';

interface DomainRow {
  id: string;
  name: string;
  weight: number;
  bank: number;
  correct: number;
  total: number;
}
interface TrackRow {
  id: string;
  name: string;
  mcq: number;
  minutes: number;
  scenario: boolean;
  blueprint: string;
  bank: number;
  scenarios: number;
  attempts: number;
  lastMock: { at: string; overall: number; passed: boolean } | null;
  bestMock: number | null;
  readiness: number | null;
  domains: DomainRow[];
}
interface Question {
  id: string;
  domain: string;
  q: string;
  options: string[];
}
interface Exam {
  track: string;
  mode: 'mock' | 'practice';
  minutes: number;
  shortfall: number;
  questions: Question[];
  scenario: { id: string; title: string; scenario: string; question: string } | null;
  warning: string;
}
interface Review extends Question {
  answer: number;
  picked: number | null;
  correct: boolean;
  explain: string;
  source: string;
}
interface Result {
  attempt: {
    mode: string;
    total: number;
    correct: number;
    mcqPct: number;
    scenarioPct: number | null;
    overall: number;
    passed: boolean;
    byDomain: Record<string, { correct: number; total: number }>;
    scenarioReview?: {
      title: string;
      grade: { requirements: { text: string; met: boolean; comment: string }[]; rationale: { score: number; comment: string }; feedback: string; modelAnswer: string };
    };
  };
  review: Review[];
}

const L = 'ABCD';
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const docName = (url: string) => url.replace('https://docs.optimizely.com/', '');

export default function OptiPage() {
  useTitle('Optimizely Exam Lab');
  const overview = useApi<{ tracks: TrackRow[] }>('/api/opti/overview');
  const [trackId, setTrackId] = useState('dev-core');
  const [exam, setExam] = useState<Exam | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<number>();
  const [info, setInfo] = useState('');

  const track = overview.data?.tracks.find((t) => t.id === trackId);

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    setError('');
    setStatus(undefined);
    try {
      return await fn();
    } catch (e) {
      setError(msg(e));
      setStatus(e instanceof ApiError ? e.status : undefined);
      return undefined;
    } finally {
      setBusy('');
    }
  }

  async function generate(domains: DomainRow[], n = 8) {
    for (const [i, d] of domains.entries()) {
      const ok = await run(`Tạo câu hỏi ${d.name} (${i + 1}/${domains.length})…`, async () => {
        const r = await post<{ added: number }>('/api/opti/bank', { track: trackId, domain: d.id, n });
        setInfo(`${d.name}: +${r.added} câu`);
        return true;
      });
      if (!ok) break;
    }
    overview.reload();
  }

  async function start(mode: 'mock' | 'practice', domain?: string) {
    const r = await run('Đang chuẩn bị đề…', () => post<Exam>('/api/opti/exam/start', { track: trackId, mode, domain, n: 10 }));
    if (r) {
      setExam(r);
      setResult(null);
    }
  }

  if (exam && !result) {
    return (
      <ExamView
        exam={exam}
        error={error}
        status={status}
        busy={!!busy}
        onSubmit={async (payload) => {
          const r = await run('AI đang chấm bài…', () => post<Result>('/api/opti/exam/submit', { track: exam.track, mode: exam.mode, domain: payload.domain, ...payload.body }));
          if (r) {
            setResult(r);
            overview.reload();
          }
        }}
        onCancel={() => setExam(null)}
      />
    );
  }

  if (exam && result) {
    return (
      <ResultView
        result={result}
        onDone={() => {
          setExam(null);
          setResult(null);
        }}
      />
    );
  }

  return (
    <>
      <Hero compact>
        <Eyebrow>OPTIMIZELY EXAM LAB · CÂU HỎI TỪ DOCS CHÍNH THỨC · AI CHẤM</Eyebrow>
        <h1 className="h1 h1-md">Luyện thi 4 cert CMS PaaS.</h1>
        <p className="lead">Câu hỏi được AI viết chỉ dựa trên docs.optimizely.com, mỗi câu kèm link nguồn để bạn đối chiếu. Scenario của Developer được chấm theo từng yêu cầu và lý do chọn.</p>
      </Hero>
      <div className="wrap section">
        {overview.error && <ErrorBox error={overview.error} status={overview.status} onRetry={overview.reload} />}
        {!overview.data && !overview.error && <Loading />}
        {overview.data && (
          <>
            <div className="opti-tabs" role="tablist">
              {overview.data.tracks.map((t) => (
                <button key={t.id} role="tab" aria-selected={t.id === trackId} className={t.id === trackId ? 'is-on' : ''} onClick={() => setTrackId(t.id)}>
                  {t.name.replace('CMS PaaS ', '')}
                </button>
              ))}
            </div>
            {track && (
              <div className="opti-panel stack12">
                <div className="row between wrap-row">
                  <div>
                    <b>{track.name}</b>
                    <div className="muted">
                      {track.mcq} câu MCQ{track.scenario ? ' + 1 scenario' : ''} · {track.minutes} phút · đậu ≥ 70% · <a href={track.blueprint} target="_blank" rel="noreferrer">blueprint chính thức</a>
                    </div>
                  </div>
                  <div className="mono">
                    Sẵn sàng: <b>{pct(track.readiness)}</b> · thi thử gần nhất: {track.lastMock ? pct(track.lastMock.overall) : '—'} · tốt nhất: {pct(track.bestMock)}
                  </div>
                </div>
                <table className="opti-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Tỉ trọng</th>
                      <th>Ngân hàng</th>
                      <th>Đúng (10 lần gần nhất)</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {track.domains.map((d) => (
                      <tr key={d.id}>
                        <td>{d.name}</td>
                        <td>{d.weight}%</td>
                        <td>{d.bank} câu</td>
                        <td>
                          <div className="bar">
                            <span className={d.total && d.correct / d.total < 0.65 ? 'is-weak' : ''} style={{ width: `${d.total ? (d.correct / d.total) * 100 : 0}%` }} />
                          </div>
                          <span className="muted">{d.total ? `${d.correct}/${d.total}` : 'chưa làm'}</span>
                        </td>
                        <td className="opti-actions">
                          <button className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => void generate([d])}>
                            +8 câu
                          </button>
                          <button className="btn btn-secondary btn-sm" disabled={!!busy || d.bank === 0} onClick={() => void start('practice', d.id)}>
                            Luyện
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {busy && <p aria-live="polite">{busy}</p>}
                {info && !busy && <p className="muted">{info}</p>}
                {error && <ErrorBox error={error} status={status} />}
                <div className="row gap8 wrap-row">
                  <button className="btn btn-secondary" disabled={!!busy} onClick={() => void generate(track.domains)}>
                    Tạo 8 câu cho mọi domain
                  </button>
                  <button className="btn btn-primary btn-lg" disabled={!!busy || track.bank === 0} onClick={() => void start('mock')}>
                    Thi thử đầy đủ
                  </button>
                </div>
                <p className="note">
                  Ngân hàng hiện có {track.bank} câu{track.scenario ? `, ${track.scenarios} scenario` : ''}. Thi thử lấy câu theo tỉ trọng blueprint, ưu tiên câu chưa làm và câu từng sai; nếu ngân hàng chưa đủ {track.mcq} câu thì đề ngắn hơn. Câu hỏi do AI viết, luôn đối chiếu link nguồn trước khi tin.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ExamView({
  exam,
  error,
  status,
  busy,
  onSubmit,
  onCancel,
}: {
  exam: Exam;
  error: string;
  status?: number;
  busy: boolean;
  onSubmit: (p: { domain?: string; body: Record<string, unknown> }) => Promise<void>;
  onCancel: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [scn, setScn] = useState({ answer: '', rationale: '' });
  const [left, setLeft] = useState(exam.minutes * 60);
  const startedAt = useRef(Date.now());
  const autoSent = useRef(false);
  const onScenario = idx >= exam.questions.length;
  const q = exam.questions[idx];

  const submit = () => {
    const domain = exam.mode === 'practice' ? exam.questions[0]?.domain : undefined;
    void onSubmit({
      domain,
      body: {
        ids: exam.questions.map((x) => x.id),
        answers,
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
        scenarioId: exam.scenario?.id,
        scenarioAnswer: scn.answer,
        rationale: scn.rationale,
      },
    });
  };

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left === 0 && exam.mode === 'mock' && !autoSent.current) {
      autoSent.current = true;
      submit();
    }
  }, [left]);

  const answered = Object.keys(answers).length;
  return (
    <div className="wrap section narrow-l">
      <div className="row between">
        <span className="mono">
          {exam.mode === 'mock' ? 'THI THỬ' : 'LUYỆN TẬP'} · đã làm {answered}/{exam.questions.length}
        </span>
        <span className="mono" aria-live="off">
          ⏱ {clock(left)}
        </span>
      </div>
      {exam.shortfall > 0 && <p className="note">Ngân hàng thiếu {exam.shortfall} câu so với đề thật. Hãy tạo thêm câu hỏi để thi thử sát hơn.</p>}
      {exam.warning && <p className="note">{exam.warning}</p>}
      <div className="opti-chips" aria-label="Chuyển câu">
        {exam.questions.map((x, i) => (
          <button key={x.id} className={`${i === idx ? 'is-on' : ''} ${answers[x.id] !== undefined ? 'is-done' : ''}`} onClick={() => setIdx(i)} aria-label={`Câu ${i + 1}`}>
            {i + 1}
          </button>
        ))}
        {exam.scenario && (
          <button className={`${onScenario ? 'is-on' : ''} ${scn.answer ? 'is-done' : ''}`} onClick={() => setIdx(exam.questions.length)}>
            Scenario
          </button>
        )}
      </div>

      {!onScenario && q && (
        <div className="stack12">
          <p className="opti-q">
            <span className="mono">{idx + 1}.</span> {q.q}
          </p>
          {q.options.map((o, i) => (
            <label key={i} className={`opti-opt ${answers[q.id] === i ? 'is-on' : ''}`}>
              <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => setAnswers({ ...answers, [q.id]: i })} />
              <span>
                <b>{L[i]}.</b> {o}
              </span>
            </label>
          ))}
        </div>
      )}

      {onScenario && exam.scenario && (
        <div className="stack12">
          <h2 className="h2">{exam.scenario.title}</h2>
          <p>{exam.scenario.scenario}</p>
          <p>
            <b>{exam.scenario.question}</b>
          </p>
          <label className="label">
            Phương án bạn chọn (viết tiếng Anh càng tốt, đây cũng là luyện viết)
            <textarea rows={5} value={scn.answer} onChange={(e) => setScn({ ...scn, answer: e.target.value })} />
          </label>
          <label className="label">
            Rationale: vì sao chọn, rủi ro tránh được, vì sao loại phương án khác
            <textarea rows={5} value={scn.rationale} onChange={(e) => setScn({ ...scn, rationale: e.target.value })} />
          </label>
        </div>
      )}

      {error && <ErrorBox error={error} status={status} onRetry={submit} />}
      <div className="row gap8" style={{ marginTop: 16 }}>
        <button className="btn btn-secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
          ← Trước
        </button>
        <button className="btn btn-secondary" disabled={idx >= exam.questions.length - (exam.scenario ? 0 : 1)} onClick={() => setIdx(idx + 1)}>
          Sau →
        </button>
        <span style={{ flex: 1 }} />
        <button className="btn btn-secondary" disabled={busy} onClick={() => confirm('Bỏ bài này?') && onCancel()}>
          Thoát
        </button>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => (answered === exam.questions.length || confirm(`Còn ${exam.questions.length - answered} câu chưa làm. Nộp bài?`)) && submit()}
        >
          {busy ? 'AI đang chấm…' : 'Nộp bài'}
        </button>
      </div>
    </div>
  );
}

function ResultView({ result, onDone }: { result: Result; onDone: () => void }) {
  const a = result.attempt;
  const [wrongOnly, setWrongOnly] = useState(false);
  const rows = result.review.filter((r) => !wrongOnly || !r.correct);
  const g = a.scenarioReview?.grade;
  return (
    <div className="wrap section narrow-l">
      <Eyebrow>KẾT QUẢ · {a.mode === 'mock' ? 'THI THỬ' : 'LUYỆN TẬP'}</Eyebrow>
      <h1 className="h1 h1-md">
        {pct(a.overall)} · {a.passed ? 'Đạt' : 'Chưa đạt'}
      </h1>
      <p className="lead">
        MCQ {a.correct}/{a.total} ({pct(a.mcqPct)})
        {a.scenarioPct !== null && <> · Scenario {pct(a.scenarioPct)}</>}. Ngưỡng ước lượng: tổng ≥ 70%, mỗi phần ≥ 65%.
      </p>
      <div className="opti-panel">
        {Object.entries(a.byDomain).map(([d, v]) => (
          <div key={d} className="row between">
            <span>{d}</span>
            <span className="mono">
              {v.correct}/{v.total}
            </span>
          </div>
        ))}
      </div>

      {g && (
        <div className="opti-panel stack12" style={{ marginTop: 16 }}>
          <b>Scenario: {a.scenarioReview!.title}</b>
          <ul>
            {g.requirements.map((r, i) => (
              <li key={i}>
                {r.met ? '✅' : '❌'} {r.text} <span className="muted">{r.comment}</span>
              </li>
            ))}
          </ul>
          <p>
            Lý do (rationale): <b>{g.rationale.score}/4</b> <span className="muted">{g.rationale.comment}</span>
          </p>
          <p>{g.feedback}</p>
          <p className="muted">Đáp án mẫu: {g.modelAnswer}</p>
        </div>
      )}

      <div className="row between" style={{ margin: '20px 0 8px' }}>
        <h2 className="h2">Xem lại từng câu</h2>
        <label className="row gap8">
          <input type="checkbox" checked={wrongOnly} onChange={(e) => setWrongOnly(e.target.checked)} /> chỉ câu sai
        </label>
      </div>
      {rows.map((r) => (
        <div key={r.id} className={`opti-review ${r.correct ? 'is-ok' : 'is-bad'}`}>
          <p>
            <b>{r.q}</b>
          </p>
          <ul>
            {r.options.map((o, i) => (
              <li key={i} className={i === r.answer ? 'opti-right' : i === r.picked ? 'opti-wrong' : ''}>
                {L[i]}. {o} {i === r.answer ? '← đúng' : i === r.picked ? '← bạn chọn' : ''}
              </li>
            ))}
          </ul>
          <p className="muted">{r.explain}</p>
          <p className="muted">
            Nguồn:{' '}
            <a href={r.source} target="_blank" rel="noreferrer">
              {docName(r.source)}
            </a>
          </p>
        </div>
      ))}
      <button className="btn btn-primary" onClick={onDone}>
        Xong
      </button>
    </div>
  );
}
