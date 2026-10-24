# Amberjack – kho học tập cá nhân

Mỗi ngày: 2h tech + 1h Optimizely (luyện chứng chỉ, đến 30/12/2026) + 1h tiếng Anh. Mọi thứ đều nằm trong repo này để theo dõi và ôn lại.

## Cấu trúc

| Thư mục | Dùng để |
|---|---|
| `ROADMAP.md` | Kế hoạch 23 tuần (26/10/2026–4/4/2027), gồm lộ trình chứng chỉ Optimizely, tick checkpoint |
| `daily/` | Log mỗi ngày (`YYYY-MM-DD.md`, copy từ `templates/daily.md`) |
| `notes/<chủ đề>/` | Note dài hạn, viết bằng lời của mình (ưu tiên tiếng Anh) |
| `lessons/` | Bài đọc theo tuần và mảng (`w01-F.md` = tuần 1, Frontend), đọc ngay trong app qua nút "Đọc bài". Bài tuần 1 viết tay, các bài khác DeepSeek tạo khi bạn bấm "Tạo bài bằng AI" |
| `weekly/` | Review tuần |
| `projects/` | Project A (sản phẩm nhỏ có người dùng thật) + tính năng AI |
| `labs/` | Repo thực hành vứt đi được (Redis, replica, RabbitMQ, k8s, Raft…), không lẫn vào project |
| `english/` | Bài IELTS, ghi âm, lỗi hay gặp |
| `anki/` | (tuỳ chọn) Thẻ cho phần không nằm trong note, ví dụ từ vựng IELTS |
| `templates/` | Mẫu daily, note, weekly review |
| `docs/HOW-TO-LEARN.md` | Cách học tối ưu cho từng mảng, cách dùng AI |
| `tools/study/` | App học `study` (web + CLI): thẻ ôn FSRS, phỏng vấn AI DeepSeek, theo dõi tiến độ. Chạy: `cd tools\study; npm run build; npm run serve` rồi mở http://localhost:4173 (xem README trong đó) |
| `data/` | Trạng thái ôn tập do `study` tạo (`state.json`, `reviews.jsonl`, `quiz.jsonl`, `daily.json`), không commit (repo công khai); dữ liệu chính của web app nằm ở schema `study` trên Supabase (`study cloud migrate/export` để chuyển qua lại với file) |

## Cách học (làm theo thứ tự)

1. **Học xen kẽ:** mỗi tuần chạy đủ 4 mảng (hạ tầng/system design/kiến trúc, frontend sâu, AI, DSA), cộng mảng O (Optimizely) đến hết tuần 10. Xem lịch ngày trong `ROADMAP.md`.
2. **Học chủ động:** đọc 45', rồi gập tài liệu lại và tự giải thích ra giấy.
3. **Làm ngay:** mỗi chủ đề có 1 lab chạy được. Không có lab thì chưa tính là học xong.
4. **Viết note bằng lời mình:** 1 trang, có sơ đồ, có phần "khi nào dùng / khi nào không".
5. **Thẻ ôn:** 5–10 thẻ mỗi chủ đề ngay trong mục `## Cards` của note (nút "Đề xuất thẻ" trong app hoặc `study gen <note>` để AI đề xuất, bạn duyệt). Dạng "giải thích X", "so sánh X vs Y", "lỗi này do đâu".
6. **Ôn cách quãng:** 15' mở màn "Ôn tập" mỗi ngày (hoặc `study review`; FSRS tự xếp lịch, trộn các mảng); DSA ôn lại bài sai sau 2 tuần. Chi tiết: [docs/HOW-TO-LEARN.md](docs/HOW-TO-LEARN.md).
7. **Checkpoint (tuần 4, 8, 13, 18, 22):** tự hỏi đáp 30 câu trộn cả 4 mảng, ghi âm bằng tiếng Anh.
8. **Commit mỗi ngày:** dù chỉ 1 note hoặc 1 bài, giữ chuỗi liên tục.

## Quy tắc chống bỏ cuộc

- Ngày bận: tối thiểu 30' + ôn thẻ (`study review` hoặc màn "Ôn tập"). Không bỏ trắng ngày.
- Lỡ 1 ngày thì tiếp tục, không bù dồn.
- Cuối mỗi tuần chỉ hỏi 3 câu: học được gì, chưa hiểu gì, tuần sau sửa gì.

## Project: nhỏ, thật, không phình to

- **Project A:** 1 sản phẩm nhỏ giải quyết nhu cầu thật (booking, hóa đơn, quản lý đơn...) bằng .NET + React/Next, có 3–5 người dùng thật vào tuần 8.
- **Project B:** đúng 1 tính năng AI trong Project A mà người dùng cần, có trace và bộ eval.
- **Quy tắc:** chỉ thêm cache/queue/k8s khi có số liệu cho thấy cần (Vấn đề → Số liệu → Quyết định → ADR). Thực hành công nghệ trong `labs/` riêng, không nhét vào project. Ghi ADR "đã cân nhắc nhưng chưa cần" cũng là điểm cộng khi phỏng vấn.
