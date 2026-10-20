import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { post, type QueueCard } from '../api.ts';
import { ErrorBox, Loading, Pill, fmtInterval, msg, noteLink, useApi, useTitle, useToday } from '../lib.tsx';

const RATINGS = [
  { v: 1, label: 'Quên' },
  { v: 2, label: 'Khó' },
  { v: 3, label: 'Nhớ' },
  { v: 4, label: 'Dễ' },
] as const;

export default function ReviewPage() {
  useTitle('Ôn tập');
  const [params] = useSearchParams();
  const area = params.get('area');
  const queue = useApi<{ cards: QueueCard[] }>(`/api/queue${area ? `?area=${encodeURIComponent(area)}` : ''}`);
  const today = useToday();
  if (queue.error) {
    return (
      <div className="wrap section">
        <ErrorBox error={queue.error} status={queue.status} onRetry={queue.reload} />
      </div>
    );
  }
  if (!queue.data) {
    return (
      <div className="wrap section">
        <Loading />
      </div>
    );
  }
  return <Session cards={queue.data.cards} onDone={today.reload} />;
}

function Session({ cards, onDone }: { cards: QueueCard[]; onDone: () => void }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState<number[]>([]);
  const [retry, setRetry] = useState<QueueCard[] | null>(null);
  const [finished, setFinished] = useState(false);
  const busyRef = useRef(false);

  const forgot = cards.filter((_, i) => ratings[i] === 1);
  const inRetry = retry !== null && !finished;
  const list = inRetry ? retry : cards;
  const card = list[idx];

  const next = useCallback(
    (latest: number[] = ratings) => {
      setShown(false);
      if (idx + 1 < list.length) {
        setIdx(idx + 1);
        return;
      }
      const again = cards.filter((_, i) => latest[i] === 1);
      if (!inRetry && again.length > 0) {
        setRetry(again);
        setIdx(0);
        return;
      }
      setFinished(true);
      onDone();
    },
    [idx, list.length, inRetry, ratings, cards, onDone],
  );

  const rate = useCallback(
    async (v: number) => {
      if (!card || busyRef.current) return;
      if (inRetry) {
        next();
        return;
      }
      busyRef.current = true;
      setBusy(true);
      setError('');
      try {
        await post('/api/review', { id: card.id, rating: v });
        const copy = [...ratings];
        copy[idx] = v;
        setRatings(copy);
        next(copy);
      } catch (e) {
        setError(msg(e));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [card, idx, inRetry, next, ratings],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return;
      if (finished || !card) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        void rate(Number(e.key));
      } else if (shown && inRetry && e.key === 'Enter') {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, card, finished, inRetry, rate, next]);

  if (cards.length === 0) {
    return (
      <div className="wrap section narrow">
        <h1 className="h1 h1-sm">Hết thẻ cho hôm nay.</h1>
        <p className="lead">Không có thẻ đến hạn. Viết thêm note, hoặc để AI đề xuất thẻ từ một note có sẵn.</p>
        <div className="row gap12 mt28">
          <Link to="/notes" className="btn btn-primary">
            Mở Notes
          </Link>
          <Link to="/" className="btn btn-secondary">
            Về Hôm nay
          </Link>
        </div>
      </div>
    );
  }

  if (finished) {
    const rated = ratings.filter((r) => r > 0);
    const remembered = rated.filter((r) => r >= 2).length;
    return (
      <div className="wrap section narrow">
        <p className="eyebrow">XONG PHIÊN ÔN</p>
        <h1 className="h1 h1-sm">{rated.length} thẻ đã ôn.</h1>
        <div className="stats stats-3 mt28">
          <div className="stat">
            <div className="stat-k">NHỚ</div>
            <div className="stat-v">{rated.length ? Math.round((remembered / rated.length) * 100) : 0}%</div>
            <div className="stat-s">chấm Khó trở lên</div>
          </div>
          <div className="stat">
            <div className="stat-k">QUÊN</div>
            <div className="stat-v">{forgot.length}</div>
            <div className="stat-s">hỏi lại ngày mai</div>
          </div>
          <div className="stat">
            <div className="stat-k">DỄ</div>
            <div className="stat-v">{rated.filter((r) => r === 4).length}</div>
            <div className="stat-s">giãn lịch xa hơn</div>
          </div>
        </div>
        <div className="row gap12 mt28">
          <Link to="/" className="btn btn-primary">
            Về Hôm nay
          </Link>
          <Link to="/quiz" className="btn btn-secondary">
            Phỏng vấn AI
          </Link>
        </div>
      </div>
    );
  }

  const remaining = list.length - idx;
  const progress = (idx / list.length) * 100;

  return (
    <div className="review">
      {inRetry && <p className="notice notice-info">Ôn lại các thẻ vừa chấm “Quên”. Lần này không đổi lịch.</p>}
      <div className="review-top">
        <span className="mono strong">
          {idx + 1} / {list.length}
        </span>
        <span
          className="bar bar-lg"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={list.length}
          aria-valuenow={idx}
          aria-label="Tiến độ phiên ôn"
        >
          <span style={{ width: `${progress}%` }} />
        </span>
        <span className="mono muted review-eta">~{Math.max(1, Math.ceil(remaining * 0.4))} PHÚT CÒN LẠI</span>
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Thoát phiên ôn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="flash">
        <div className="flash-q">
          <div className="row gap10 wrap-row">
            <span className="mono strong">CÂU HỎI</span>
            <Pill area={card.area} />
            <span className="mono muted">
              {card.file.replace(/^notes[\\/]/, '')}
              {card.isNew ? ' · thẻ mới' : ''}
            </span>
          </div>
          <h1 className="flash-title">{card.q}</h1>
        </div>
        {shown ? (
          <div className="flash-a">
            <span className="mono strong accent">ĐÁP ÁN</span>
            <p className="flash-text">{card.a}</p>
            <div className="from-note">
              <span>
                Từ note của bạn: <b>{card.file}</b>
              </span>
              <Link to={noteLink(card.file)}>Mở note</Link>
            </div>
          </div>
        ) : (
          <div className="flash-a flash-hide">
            <button className="btn btn-primary" onClick={() => setShown(true)}>
              Hiện đáp án · Space
            </button>
          </div>
        )}
      </div>

      {error && <ErrorBox error={error} />}

      {shown &&
        (inRetry ? (
          <div className="mt20">
            <button className="btn btn-primary btn-block" onClick={() => next()}>
              Tiếp tục · Enter
            </button>
          </div>
        ) : (
          <div className="rate-grid" role="group" aria-label="Chấm mức nhớ">
            {RATINGS.map((r) => (
              <button
                key={r.v}
                className={r.v === 3 ? 'rate is-main' : 'rate'}
                disabled={busy}
                onClick={() => void rate(r.v)}
              >
                <span className="rate-l">{r.label}</span>
                <span className="rate-s mono">
                  {r.v} · {r.v === 1 ? 'lại sau ' : ''}
                  {fmtInterval(card.intervals[r.v])}
                </span>
              </button>
            ))}
          </div>
        ))}
      <p className="keys mono">PHÍM TẮT: SPACE = HIỆN ĐÁP ÁN · 1–4 = CHẤM</p>
    </div>
  );
}
