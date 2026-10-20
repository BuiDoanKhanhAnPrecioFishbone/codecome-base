import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post, type PlanItem, type Strand } from '../api.ts';
import {
  ErrorBox, Eyebrow, Hero, Loading, Pill, fmtDM, fmtDay, fmtMinutes, msg, noteLink, pct, useTitle, useToday, weekdayLong, weekdayShort,
} from '../lib.tsx';

const STRAND: Record<Strand, { label: string; area: string }> = {
  REV: { label: 'ôn tập', area: 'interview' },
  S: { label: 'hệ thống', area: 'network' },
  F: { label: 'frontend', area: 'frontend' },
  A: { label: 'ai', area: 'ai' },
  D: { label: 'dsa', area: 'dsa' },
  T7: { label: 'dự án', area: 'system-design' },
  EN: { label: 'english', area: 'english' },
};

export default function TodayPage() {
  useTitle('Hôm nay');
  const today = useToday();
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  if (!today.data) {
    return (
      <div className="wrap section">
        {today.error ? <ErrorBox error={today.error} status={today.status} onRetry={today.reload} /> : <Loading />}
      </div>
    );
  }
  const t = today.data;
  const plan: PlanItem[] = t.plan.map((p) => ({ ...p, done: override[p.slot] ?? p.done }));
  const doneCount = plan.filter((p) => p.done).length;
  const left = plan.filter((p) => !p.done).reduce((s, p) => s + p.minutes, 0);
  const focus = plan.find((p) => !p.done && p.strand !== 'REV' && p.strand !== 'EN');

  async function toggle(it: PlanItem) {
    const next = !it.done;
    setOverride((o) => ({ ...o, [it.slot]: next }));
    setError('');
    try {
      await post('/api/daily', { date: t.date, slot: it.slot, done: next });
      today.reload();
    } catch (e) {
      setOverride((o) => ({ ...o, [it.slot]: it.done }));
      setError(msg(e));
    }
  }

  const eyebrow =
    t.phase === 'before'
      ? `${weekdayLong(t.date)} · ${fmtDay(t.date)} · LỘ TRÌNH CHƯA BẮT ĐẦU`
      : t.phase === 'after'
        ? `${weekdayLong(t.date)} · ${fmtDay(t.date)} · ĐÃ HẾT LỘ TRÌNH`
        : `${weekdayLong(t.date)} · ${fmtDay(t.date)} · TUẦN ${t.week?.n} / ${t.totalWeeks}`;
  const max = Math.max(1, ...t.last7.map((d) => d.count));
  const week = t.week;

  return (
    <>
      <Hero>
        <div className="hero-grid">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="h1">{t.queueCount > 0 ? `${t.queueCount} thẻ đang chờ bạn.` : t.stats.total === 0 ? 'Chưa có thẻ nào.' : 'Không còn thẻ đến hạn.'}</h1>
            <p className="lead">
              {t.queueCount > 0 ? `Ôn xong khoảng ${Math.max(1, Math.round(t.queueCount * 0.5))} phút` : t.stats.total === 0 ? 'Viết note đầu tiên để sinh thẻ' : 'Bạn đã ôn xong hôm nay'}
              {focus ? `, rồi sang phần học chính: ${focus.title}.` : '.'}
            </p>
            <div className="row gap12 mt28">
              <Link to="/review" className="btn btn-primary btn-lg" aria-disabled={t.queueCount === 0}>
                Bắt đầu ôn thẻ
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link to="/quiz" className="btn btn-secondary btn-lg">
                Phỏng vấn AI · 3 câu
              </Link>
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-k">STREAK</div>
              <div className="stat-v">{t.stats.streak}</div>
              <div className="stat-s">ngày liền</div>
            </div>
            <div className="stat">
              <div className="stat-k">NHỚ 30 NGÀY</div>
              <div className="stat-v">{pct(t.stats.retention30)}</div>
              <div className="stat-s">mục tiêu 90%</div>
            </div>
            <div className="stat">
              <div className="stat-k">TỔNG THẺ</div>
              <div className="stat-v">{t.stats.total}</div>
              <div className="stat-s">{t.areas.length} mảng</div>
            </div>
          </div>
        </div>
      </Hero>

      <div className="wrap section">
        <div className="cols-main">
          <div>
            <div className="sec-head">
              <h2 className="h2">Kế hoạch hôm nay</h2>
              <span className="mono muted">
                {doneCount} / {plan.length} XONG · {fmtMinutes(left)} CÒN LẠI
              </span>
            </div>
            {error && <ErrorBox error={error} />}
            <ul className="list-card" aria-label="Kế hoạch hôm nay">
              {plan.map((it) => {
                const s = STRAND[it.strand];
                return (
                  <li key={it.slot} className={it.slot === focus?.slot ? 'plan-row is-focus' : 'plan-row'}>
                    <button
                      className={it.done ? 'check is-on' : 'check'}
                      role="checkbox"
                      aria-checked={it.done}
                      aria-label={it.title}
                      onClick={() => toggle(it)}
                    >
                      {it.done && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12l5 5 9-10" />
                        </svg>
                      )}
                    </button>
                    <span className="mono strong plan-min">{it.minutes}'</span>
                    <span className={it.done ? 'plan-title is-done' : 'plan-title'}>
                      {it.title}
                      {it.detail && <span className="plan-detail">{it.detail}</span>}
                    </span>
                    <Pill area={s.area} label={s.label} />
                  </li>
                );
              })}
            </ul>
            <p className="note">Kế hoạch lấy từ ROADMAP.md theo ngày trong tuần; tick của bạn lưu vào data/daily.json.</p>
          </div>

          <aside>
            <div className="sec-head">
              <h2 className="h2">{week ? `Tuần ${week.n} · ${fmtDM(week.start)}–${fmtDM(week.end)}` : 'Tuần học'}</h2>
            </div>
            {week ? (
              <div className="list-card pad">
                {(
                  [
                    ['S', week.s],
                    ['F', week.f],
                    ['A', week.a],
                    ['D', week.d],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="week-row">
                    <div className="row gap10">
                      <span className="mono strong">{k}</span>
                      <Pill area={STRAND[k].area} label={STRAND[k].label} />
                    </div>
                    <div className="week-text">{v}</div>
                  </div>
                ))}
                <div className="week-row">
                  <div className="mono strong">T7</div>
                  <div className="week-text">{week.t7}</div>
                </div>
                {(week.checkpoint || week.apply || week.light) && (
                  <div className="week-row flags">
                    {week.checkpoint && <span className="pill pill-ink">Checkpoint</span>}
                    {week.apply && <span className="pill pill-ink">Tuần ứng tuyển</span>}
                    {week.light && <span className="pill pill-ink">Tuần nhẹ (Tết)</span>}
                  </div>
                )}
              </div>
            ) : (
              <p className="muted">Hôm nay nằm ngoài các tuần trong ROADMAP.md.</p>
            )}
          </aside>
        </div>
      </div>

      <div className="wrap section section-tail">
        <div className="cols-2">
          <div>
            <h2 className="h2 mb16">Theo mảng</h2>
            {t.areas.length === 0 ? (
              <p className="notice">
                Chưa có thẻ nào. Viết note có mục <code>## Cards</code> (dòng <code>Q:</code> / <code>A:</code>) hoặc mở một note và bấm “AI đề xuất thẻ”.
              </p>
            ) : (
              <div className="list-card pad">
                {t.areas.map((a) => {
                  const w = a.total ? ((a.total - a.due) / a.total) * 100 : 0;
                  return (
                    <div key={a.area} className="area-row">
                      <Pill area={a.area} />
                      <span className="bar" aria-hidden="true">
                        <span style={{ width: `${w}%` }} />
                      </span>
                      <span className="mono muted area-n">
                        {a.total} thẻ · {a.due} hạn
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="note">Thanh = tỉ lệ thẻ chưa đến hạn ôn.</p>
          </div>
          <div>
            <h2 className="h2 mb16">7 ngày qua</h2>
            <div className="chart" role="img" aria-label={`Số thẻ ôn 7 ngày qua: ${t.last7.map((d) => d.count).join(', ')}`}>
              <div className="chart-bars">
                {t.last7.map((d, i) => {
                  const last = i === t.last7.length - 1;
                  return (
                    <div key={d.day} className="chart-col">
                      <span className={last ? 'mono chart-n is-now' : 'mono chart-n'}>{d.count}</span>
                      <span
                        className={last ? 'chart-bar is-now' : d.count === 0 ? 'chart-bar is-zero' : 'chart-bar'}
                        style={{ height: d.count === 0 ? 3 : Math.max(6, (d.count / max) * 124) }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="chart-lbl">
                {t.last7.map((d, i) => (
                  <span key={d.day} className={i === t.last7.length - 1 ? 'mono is-now' : 'mono'}>
                    {weekdayShort(d.day)}
                  </span>
                ))}
              </div>
            </div>
            <h2 className="h2 mt32 mb16">Nên ôn lại</h2>
            {t.weak.length === 0 ? (
              <p className="notice">Chưa có thẻ nào bị quên. Tốt.</p>
            ) : (
              <div className="stack12">
                {t.weak.map((w) => (
                  <Link key={w.id} to={noteLink(w.file)} className="weak-row">
                    <Pill area={w.area} />
                    <span className="weak-q">{w.q}</span>
                    <span className="mono muted">quên {w.lapses} lần</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
