# study — thẻ ôn FSRS + DeepSeek (web app + CLI)

App học cá nhân để ôn lại kiến thức thay vì học lại từ đầu. **Note Markdown là nguồn sự thật**; app chỉ lưu lịch ôn. Có hai cách dùng chung một bộ dữ liệu: **web app** (khuyên dùng hằng ngày) và **CLI** `study`.

## Cài đặt

Yêu cầu Node ≥ 24 (chạy thẳng file `.ts`).

```powershell
cd tools\study
npm install
npm test            # 38 test
npm run typecheck
```

## Web app

```powershell
npm run build       # build giao diện vào web/dist (chạy lại khi sửa code web)
npm run serve       # mở http://localhost:4173
```

Sửa giao diện: `npm run dev` (Vite, http://localhost:5173, tự proxy `/api`) cùng lúc với `npm run serve` ở terminal khác.

| Màn hình | Việc làm |
|---|---|
| Hôm nay | Thẻ đang chờ, kế hoạch trong ngày lấy từ `ROADMAP.md` theo thứ (tick lưu vào `data/daily.json`), theo mảng, 7 ngày qua |
| Bài học (`/learn/<tuần>/<S\|F\|A\|D>`) | Đọc bài của slot ngay trong app (nút "Đọc bài" ở kế hoạch). Chưa có bài thì DeepSeek viết (~20–60 giây, ~4K token) và lưu vào `lessons/`; bài viết tay không bị ghi đè. Có nút đánh dấu xong slot và tạo note từ bài |
| Ôn tập | Lật thẻ bằng `Space`/`Enter`, chấm `1–4` (quên/khó/nhớ/dễ), thẻ chấm "Quên" được hỏi lại một lần cuối buổi |
| Notes | Xem/tìm/lọc note, tạo note mới từ template, soạn Markdown (`Ctrl+S`), AI đề xuất thẻ để bạn nhận/sửa/bỏ rồi lưu vào `## Cards` |
| Phỏng vấn AI | AI hỏi theo note hoặc mảng, chấm 0–4, chỉ ra ý thiếu/sai, lưu câu sai thành thẻ |
| Tiến độ | Tuần hiện tại trong 23 tuần, % nhớ, mảng yếu, thẻ khó nhất, heatmap 12 tuần |

Biến môi trường: `STUDY_PORT` (mặc định 4173), `STUDY_ROOT` (thư mục chứa `notes/`, `data/`, `ROADMAP.md`; mặc định là gốc repo, hữu ích để thử với dữ liệu mẫu).

Server chỉ nghe `127.0.0.1`, từ chối Host/Origin lạ, chỉ nhận JSON ≤ 1MB, có CSP chặt (font tự host, không gọi CDN) và chỉ đọc/ghi file `.md` trong `notes/`. Chưa có `DEEPSEEK_API_KEY` thì các màn AI báo rõ, phần còn lại vẫn chạy.

## CLI

Lệnh ngắn `study` (thêm vào `$PROFILE`, sửa đường dẫn cho đúng):

```powershell
function study { node C:\Users\abdk\orca\workspaces\code-come\amberjack\tools\study\src\cli.ts @args }
```

Hoặc không cần alias: `npm run study -- review` (trong `tools\study`).

## DeepSeek (chỉ cần cho tính năng AI: đề xuất thẻ, phỏng vấn)

Tạo file `.env` ở **thư mục gốc repo** (đã nằm trong `.gitignore`, không commit):

```
DEEPSEEK_API_KEY=sk-...
# tuỳ chọn
# DEEPSEEK_MODEL=deepseek-flash
# DEEPSEEK_BASE_URL=https://api.deepseek.com
```

Lấy key và nạp tiền tại <https://platform.deepseek.com>. App tắt thinking mode mặc định để rẻ và nhanh. Mỗi lần `gen`/`quiz` in số token đã dùng; với model flash, một note vài nghìn token tốn khoảng một phần trăm USD, nên một tháng dùng hằng ngày chỉ cỡ vài chục cent (kiểm tra bảng giá hiện hành trên trang DeepSeek).

## Lệnh

| Lệnh | Việc làm |
|---|---|
| `study new <area> <chủ-đề>` | Tạo `notes/<area>/<chủ-đề>.md` từ `templates/note.md` |
| `study sync` | Quét `notes/**/*.md`, nạp thẻ mới. Thẻ bị xoá khỏi note thành "mồ côi" (giữ lịch sử, không mất) |
| `study review [--area x] [--new 10] [--max 40]` | Ôn thẻ đến hạn trộn các mảng, rồi tới thẻ mới. Chấm 1 quên / 2 khó / 3 nhớ / 4 dễ, `q` để thoát. Thẻ chấm 1 được hỏi lại một lần cuối buổi (không đổi lịch) |
| `study gen <note>` | AI đề xuất 5–10 thẻ, bạn `y` nhận / `n` bỏ / `e` sửa; thẻ nhận được ghi vào `## Cards` của note |
| `study quiz [note\|area] [--n 3]` | AI hỏi phỏng vấn dựa trên note, bạn trả lời nhiều dòng (dòng trống để nộp), AI chấm 0–4 và chỉ ra chỗ thiếu/sai. Điểm ≤ 2 có thể lưu thành thẻ |
| `study stats` | Thẻ đến hạn, theo mảng, tỉ lệ nhớ 30 ngày, streak, 7 ngày qua, thẻ hay quên |

## Định dạng thẻ trong note

```
## Cards

Q: Vì sao UDP nhanh hơn TCP?
A: Không handshake và không retransmit, đổi lại không đảm bảo thứ tự.

Q: ...
A: ...
```

- Đáp án kết thúc ở dòng trống (trong code fence thì không), heading, `Q:` kế tiếp hoặc dòng chú thích `<!-- -->`.
- ID thẻ = hash của câu hỏi. **Sửa câu hỏi sẽ tạo thẻ mới** (thẻ cũ thành mồ côi); sửa đáp án thì giữ nguyên lịch ôn.
- Mảng (area) = thư mục con đầu tiên dưới `notes/`.

## Supabase là nguồn chính + deploy Vercel

Khi có `STUDY_DATABASE_URL` (trong `.env` hoặc biến môi trường), web app lưu notes, bài học, thẻ FSRS, log ôn/phỏng vấn và checklist vào các bảng `study.notes|lessons|kv|reviews|quiz` (RLS bật, không cấp quyền cho `anon`/`authenticated`). `STUDY_STORAGE=file` ép về file local, `STUDY_STORAGE=pg` ép dùng Supabase. `/api/status` trả `storage` cho biết đang dùng gì.

- `npm run study -- cloud init`: tạo/cập nhật schema (chạy mọi `supabase/*.sql` theo thứ tự).
- `cloud migrate [--force]`: chuyển notes/lessons/data từ file lên bảng (từ chối nếu bảng đã có dữ liệu, trừ khi `--force`).
- `cloud export`: kéo dữ liệu từ bảng về file để CLI (`review`, `gen`, `quiz`) dùng. CLI vẫn đọc/ghi file nên **không tự đồng bộ** với web app.

Deploy Vercel (root directory `tools/study`, build `npm run build:vercel`, xem `vercel.json`): đặt env `STUDY_STORAGE=pg`, `STUDY_DATABASE_URL` (transaction pooler, cổng 6543), `DEEPSEEK_API_KEY`, `STUDY_PASSWORD`, `STUDY_SESSION_SECRET`. Có `STUDY_PASSWORD` thì mọi `/api/*` cần đăng nhập (cookie HttpOnly, hạn 30 ngày); bản Vercel từ chối chạy nếu thiếu biến này. Vercel chặn commit có email tác giả không thuộc tài khoản, hãy đặt `git config user.email` đúng email Vercel. Bản thuần local (không đặt mật khẩu) chỉ nhận host loopback.

## Sao lưu file lên Supabase (tuỳ chọn, `study.files`)

Notes và `data/` có thể sao lưu/khôi phục qua schema riêng `study` (bảng `study.files`, bật RLS, không cấp quyền cho `anon`/`authenticated`, chỉ kết nối Postgres trực tiếp mới chạm được). App vẫn chạy hoàn toàn bằng file local; cloud chỉ để backup và đổi máy.

1. Thêm vào `.env` ở gốc repo: `STUDY_DATABASE_URL=postgresql://...` (chuỗi kết nối session pooler, cổng 5432, lấy ở Supabase → Project Settings → Database).
2. `npm run study -- cloud init` tạo schema + bảng (chạy lại an toàn, file SQL ở `supabase/001_study_schema.sql`).
3. Hằng ngày/tuần: `cloud push` (lên) và `cloud pull` (về máy mới). `cloud status` xem cái gì chưa đẩy.

Quy tắc đồng bộ: chỉ `notes/**/*.md` và 4 file trong `data/`. `reviews.jsonl`/`quiz.jsonl` được gộp theo dòng (không mất bản nào). Note, `state.json`, `daily.json`: bản mới hơn thắng; nếu bản bên kia mới hơn thì báo xung đột và bỏ qua, thêm `--force` (đặt cuối lệnh) để ghi đè.

## Dữ liệu

| File | Nội dung |
|---|---|
| `data/state.json` | Trạng thái FSRS từng thẻ (không commit vì repo công khai; backup bằng `cloud push`) |
| `data/reviews.jsonl` | Mỗi lượt chấm 1 dòng |
| `data/quiz.jsonl` | Câu hỏi, điểm, phần thiếu của mỗi lần phỏng vấn (CLI và web) |
| `data/daily.json` | Mục kế hoạch hôm nay bạn đã tick trong web app |

Lịch dùng FSRS (ts-fsrs): độ nhớ mục tiêu 90%, khoảng cách tối đa 365 ngày.

## An toàn

- Câu trả lời của bạn gửi cho AI được coi là dữ liệu không tin cậy (prompt chặn làm theo chỉ dẫn trong đó).
- Note gửi lên DeepSeek: đừng ghi bí mật/dữ liệu khách hàng vào note.
- Chỉ gửi tối đa 60.000 ký tự đầu của note.
