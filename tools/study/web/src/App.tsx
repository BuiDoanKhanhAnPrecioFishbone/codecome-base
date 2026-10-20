import { useEffect, useRef } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import type { Today as TodayData } from './api.ts';
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

function Layout() {
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

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
