import { Link } from 'react-router-dom';
import type { AreaRow } from '../api.ts';
import { ErrorBox, Eyebrow, Hero, Loading, Pill, fmtDay, noteLink, parseDay, pct, useApi, useTitle } from '../lib.tsx';
import type { Progress } from '../api.ts';

const level = (n: number) => (n === 0 ? '#ECEDF3' : n < 5 ? '#CECDF2' : n < 15 ? '#8F8DDB' : '#5956C2');
const DAY = 86_400_000;

export default function ProgressPage() {
  useTitle('Tiến độ');
  const res = useApi<Progress>('/api/progress');
  if (res.error) {
    return (
      <div className="wrap section">
        <ErrorBox error={res.error} status={res.status} onRetry={res.reload} />
      </div>
    );
  }
  if (!res.data) {
    return (
      <div className="wrap section">
        <Loading />
      </div>
    );
  }
  const p = res.data;
  const first = p.weeks[0]?.start;
  const last = p.weeks[p.weeks.length - 1]?.end;
  const total = first && last ? Math.round((parseDay(last).getTime() - parseDay(first).getTime()) / DAY) + 1 : 0;
  const dayNo = first ? Math.round((parseDay(p.date).getTime() - parseDay(first).getTime()) / DAY) + 1 : 0;
  const eyebrow = first && last ? `${fmtDay(first)} → ${fmtDay(last)}${dayNo >= 1 && dayNo <= total ? ` · NGÀY ${dayNo} / ${total}` : dayNo < 1 ? ' · CHƯA BẮT ĐẦU' : ' · ĐÃ KẾT THÚC'}` : 'TIẾN ĐỘ';

  const pad = p.heatmap.length ? (parseDay(p.heatmap[0].day).getDay() + 6) % 7 : 0;
  const hours = p.weekMinutes.done / 60;
  const goal = p.weekMinutes.total / 60;

  return (
    <>
      <Hero compact>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="h1">Tiến độ</h1>
      </Hero>

      <div className="wrap section">
        <div className="stats stats-4">
          <div className="stat stat-lg">
            <div className="stat-k">NHỚ (THẺ TRƯỞNG THÀNH)</div>
            <div className="stat-v">{pct(p.stats.retention30)}</div>
            <div className="stat-s">mục tiêu 90% · {p.stats.reviews30} lượt ôn / 30 ngày</div>
          </div>
          <div className="stat stat-lg">
            <div className="stat-k">STREAK</div>
            <div className="stat-v">{p.stats.streak}</div>
            <div className="stat-s">ngày liên tiếp có ôn thẻ</div>
          </div>
          <div className="stat stat-lg">
            <div className="stat-k">ĐIỂM PHỎNG VẤN TB</div>
            <div className="stat-v">
              {p.quiz.avg30 === null ? '—' : p.quiz.avg30.toFixed(1)}
              {p.quiz.avg30 !== null && <small>/4</small>}
            </div>
            <div className="stat-s">{p.quiz.count30} câu trong 30 ngày</div>
          </div>
          <div className="stat stat-lg">
            <div className="stat-k">GIỜ HỌC TUẦN NÀY</div>
            <div className="stat-v">
              {hours.toFixed(1)}
              <small>h</small>
            </div>
            <div className="stat-s">{goal > 0 ? `kế hoạch ${goal.toFixed(0)}h, tính theo mục đã tick` : 'chưa có kế hoạch tuần này'}</div>
          </div>
        </div>

        <h2 className="h2 mt48 mb16">Lộ trình {p.weeks.length} tuần</h2>
        <div className="list-card pad24">
          <div className="weeks">
            {p.weeks.map((w) => {
              const cls = ['wk'];
              if (p.currentWeek !== null && w.n < p.currentWeek) cls.push('is-past');
              if (w.n === p.currentWeek) cls.push('is-cur');
              if (w.checkpoint) cls.push('is-check');
              if (w.apply) cls.push('is-apply');
              if (w.light) cls.push('is-light');
              return (
                <span key={w.n} className={cls.join(' ')} title={`Tuần ${w.n}: ${fmtDay(w.start)} – ${fmtDay(w.end)}`}>
                  {w.n}
                </span>
              );
            })}
          </div>
          <p className="legend mono">
            <span><i className="lg is-cur" /> HIỆN TẠI</span>
            <span><i className="lg is-check" /> CHECKPOINT</span>
            <span><i className="lg is-apply" /> ỨNG TUYỂN</span>
            <span><i className="lg is-light" /> TUẦN NHẸ (TẾT)</span>
          </p>
        </div>

        <div className="cols-2 mt48">
          <div>
            <h2 className="h2 mb16">Mảng cần chú ý</h2>
            {p.areas.length === 0 ? (
              <p className="notice">Chưa có dữ liệu. Hãy viết note và ôn vài thẻ trước.</p>
            ) : (
              <div className="list-card pad">
                {[...p.areas].sort(byWeak).map((a) => (
                  <AreaLine key={a.area} a={a} />
                ))}
              </div>
            )}
            <p className="note">Thanh = % nhớ ở thẻ trưởng thành (30 ngày, cần ít nhất 5 lượt ôn). Màu nâu = dưới 80%.</p>
          </div>
          <div>
            <h2 className="h2 mb16">Thẻ khó nhất</h2>
            {p.hardest.length === 0 ? (
              <p className="notice">Chưa có thẻ nào bị quên. Tốt.</p>
            ) : (
              <div className="stack12">
                {p.hardest.map((c) => (
                  <Link key={c.id} to={noteLink(c.file)} className="weak-row">
                    <Pill area={c.area} />
                    <span className="weak-q">{c.q}</span>
                    <span className="mono muted">quên {c.lapses} lần</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 className="h2 mt48 mb16">12 tuần gần nhất</h2>
        <div className="list-card pad24">
          <div className="heat" role="img" aria-label="Số thẻ ôn mỗi ngày trong 12 tuần gần nhất">
            {Array.from({ length: pad }, (_, i) => (
              <span key={`p${i}`} className="hd is-pad" />
            ))}
            {p.heatmap.map((d) => (
              <span key={d.day} className="hd" style={{ background: level(d.count) }} title={`${fmtDay(d.day)}: ${d.count} thẻ`} />
            ))}
          </div>
          <p className="legend mono">
            <span>ÍT</span>
            {[0, 1, 5, 15].map((n) => (
              <i key={n} className="lg" style={{ background: level(n) }} />
            ))}
            <span>NHIỀU</span>
          </p>
        </div>
      </div>
    </>
  );
}

const byWeak = (a: AreaRow, b: AreaRow) => (a.retention ?? 2) - (b.retention ?? 2) || a.area.localeCompare(b.area);

function AreaLine({ a }: { a: AreaRow }) {
  const weak = a.retention !== null && a.retention < 0.8;
  return (
    <div className="area-row">
      <Pill area={a.area} />
      <span className="bar" aria-hidden="true">
        <span className={weak ? 'is-weak' : ''} style={{ width: `${(a.retention ?? 0) * 100}%` }} />
      </span>
      <span className={weak ? 'mono area-n warn' : 'mono muted area-n'}>
        {a.retention === null ? 'chưa đủ dữ liệu' : pct(a.retention)}
        {a.quizAvg !== null && ` · PV ${a.quizAvg.toFixed(1)}`}
      </span>
    </div>
  );
}
