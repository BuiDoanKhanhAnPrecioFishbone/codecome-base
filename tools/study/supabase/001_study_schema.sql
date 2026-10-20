-- Schema riêng cho app học (study). Tách khỏi `public` của các project khác dùng chung Supabase.
-- Chạy lặp lại an toàn: `npm run study -- cloud init`.

create schema if not exists study;

create table if not exists study.files (
  path       text primary key,
  kind       text not null check (kind in ('note', 'state', 'log')),
  content    text not null,
  sha256     text not null,
  updated_at timestamptz not null default now()
);

-- Chỉ kết nối Postgres trực tiếp (role postgres) mới đọc/ghi được.
-- Không cấp quyền cho anon/authenticated và không bật policy nào, nên API công khai không chạm tới.
alter table study.files enable row level security;
revoke all on schema study from anon, authenticated;
revoke all on all tables in schema study from anon, authenticated;
