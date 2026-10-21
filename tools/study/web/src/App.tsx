import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { get, post, type Today as TodayData } from './api.ts';
import { TodayProvider, useApi } from './lib.tsx';
import NoteDetailPage from './pages/NoteDetail.tsx';
import LessonPage from './pages/Lesson.tsx';
import NotesPage from './pages/Notes.tsx';
import ProgressPage from './pages/Progress.tsx';
import QuizPage from './pages/Quiz.tsx';
import ReviewPage from './pages/Review.tsx';
import TodayPage from './pages/Today.tsx';

const NAV = [
  { to: '/', label: 'Hôm nay', end: true },
  { to: '/review', label: 'Ôn tập' },
  { to: '/notes', label: 'Notes' },
  { to: '/quiz', label: 'Phỏng vấn AI' },
  { to: '/progress', label: 'Tiến độ' },
];

function Layout({ onLogout }: { onLogout?: () => void }) {
  const today = useApi<TodayData>('/api/today');
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    today.reload();
    window.scrollTo(0, 0);
  }, [pathname]);

  const due = today.data?.queueCount ?? 0;
  const streak = today.data?.stats.streak ?? 0;

  return (
    <TodayProvider value={{ today }}>
      <a className="skip" href="#main">
        Bỏ qua điều hướng
      </a>
      <header className="top">
        <Link to="/" className="brand" aria-label="amberjack, về trang Hôm nay">
          <span className="brand-mark">aj</span>
          <span className="brand-name">amberjack</span>
        </Link>
        <nav aria-label="Chính" className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <span className="streak">
          <span className="dot" aria-hidden="true" />
          STREAK {streak} NGÀY
        </span>
        <Link to="/review" className="btn btn-primary">
          {due > 0 ? `Ôn ngay · ${due} thẻ` : 'Ôn tập'}
        </Link>
        {onLogout && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onLogout}>
            Đăng xuất
          </button>
        )}
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/learn/:week/:strand" element={<LessonPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/*" element={<NoteDetailPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route
            path="*"
            element={
              <div className="wrap section">
                <h1 className="h1">Không tìm thấy trang</h1>
                <p>
                  <Link to="/">Về trang Hôm nay</Link>
                </p>
              </div>
            }
          />
        </Routes>
      </main>
    </TodayProvider>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await post('/api/login', { password });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main id="main" className="login">
      <form className="login-card" onSubmit={submit}>
        <span className="brand-mark" aria-hidden="true">
          aj
        </span>
        <h1 className="h1-sm">Đăng nhập amberjack</h1>
        <label className="label">
          Mật khẩu
          <input type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy || !password}>
          {busy ? 'Đang kiểm tra…' : 'Vào học'}
        </button>
      </form>
    </main>
  );
}

type Session = { required: boolean; authed: boolean };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [failed, setFailed] = useState('');

  const load = useCallback(() => {
    get<Session>('/api/session')
      .then(setSession)
      .catch((e: Error) => setFailed(e.message));
  }, []);

  useEffect(() => {
    load();
    const onUnauth = () => setSession((s) => (s ? { ...s, authed: false } : s));
    window.addEventListener('study:unauthorized', onUnauth);
    return () => window.removeEventListener('study:unauthorized', onUnauth);
  }, [load]);

  if (failed) {
    return (
      <main id="main" className="login">
        <p className="notice notice-error" role="alert">
          {failed}
        </p>
      </main>
    );
  }
  if (!session) return <main id="main" className="login" aria-busy="true" />;
  if (session.required && !session.authed) return <Login onDone={load} />;

  const logout = session.required
    ? async () => {
        await post('/api/logout', {}).catch(() => {});
        load();
      }
    : undefined;

  return (
    <BrowserRouter>
      <Layout onLogout={logout} />
    </BrowserRouter>
  );
}
