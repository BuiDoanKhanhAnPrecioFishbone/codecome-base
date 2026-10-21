-- Bảng chính cho app học khi dùng Supabase làm nơi lưu dữ liệu (thay cho file).
-- Chạy lặp lại an toàn: `npm run study -- cloud init`.

create schema if not exists study;

create table if not exists study.notes (
  path       text primary key,
  area       text not null,
  content    text not null,
  updated_at timestamptz not null default now()
);

create table if not exists study.lessons (
  key        text primary key check (key ~ '^w[0-9]{2}-[SFAD]$'),
  content    text not null,
  updated_at timestamptz not null default now()
);

-- state (thẻ + lịch FSRS) và daily (checklist từng ngày): mỗi cái là 1 tài liệu JSON.
create table if not exists study.kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists study.reviews (
  id   bigserial primary key,
  ts   timestamptz not null,
  data jsonb not null
);
create index if not exists reviews_ts_idx on study.reviews (ts);

create table if not exists study.quiz (
  id   bigserial primary key,
  ts   timestamptz not null,
  data jsonb not null
);
create index if not exists quiz_ts_idx on study.quiz (ts);

alter table study.notes enable row level security;
alter table study.lessons enable row level security;
alter table study.kv enable row level security;
alter table study.reviews enable row level security;
alter table study.quiz enable row level security;
revoke all on all tables in schema study from anon, authenticated;
revoke all on all sequences in schema study from anon, authenticated;
