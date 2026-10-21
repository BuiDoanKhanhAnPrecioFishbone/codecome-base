# Cách học (theo từng mảng) + cách dùng AI

Nguồn gốc nguyên tắc: tổng quan của Dunlosky et al. về các kỹ thuật học hiệu quả ([bản gốc](https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html)) và nghiên cứu về spaced repetition (FSRS: [open-spaced-repetition](https://github.com/open-spaced-repetition)). Phần áp dụng cho từng mảng là cách làm đề xuất, không phải kết luận của nghiên cứu.

## 1. Bốn nguyên tắc cho mọi mảng

| Nguyên tắc | Nghĩa là | Tránh |
|---|---|---|
| Retrieval practice | Tự nhớ lại/tự làm khi **không nhìn tài liệu** | Đọc lại, highlight, xem video lần 2 |
| Spaced repetition | Quay lại đúng lúc sắp quên (app tính giúp, FSRS) | Ôn dồn, ôn "khi nào nhớ ra" |
| Interleaving | Trộn nhiều chủ đề trong 1 buổi ôn | Ôn 1 chủ đề cho tới khi "thuộc" |
| Self-explanation | Tự giải thích "vì sao", "đánh đổi gì", "khi nào không dùng" | Chép lại định nghĩa |

Thứ tự mỗi chủ đề: **học (≤45') → đóng tài liệu, viết note bằng lời mình → làm 1 thứ chạy được → sinh thẻ → ôn theo lịch**. Chưa qua bước note + lab thì không sinh thẻ.

## 2. Vòng đời một chủ đề (để không phải học lại từ đầu)

| Giai đoạn | Việc | Lưu ở đâu |
|---|---|---|
| Ngày 0 | Học, viết note (≤1 trang), làm lab | `notes/<mảng>/<chủ-đề>.md` |
| Ngày 0 | Viết 5–10 thẻ (hoặc `study gen` rồi **tự duyệt**) | mục `## Cards` trong chính note |
| Ngày 1, 3, 7, 14… | App xếp lịch, ôn 10–20' mỗi ngày | `data/state.json` |
| Cuối tuần | Review tuần: thẻ nào hay sai → đọc lại note, sửa note | `weekly/` |
| Các tuần checkpoint | Tự hỏi đáp trộn mảng bằng `study quiz` | `data/quiz.jsonl` |
| Trước phỏng vấn | Chỉ đọc **note** (1 trang/chủ đề) + ôn thẻ sai nhiều | không đọc lại tài liệu gốc |

Note là thứ bạn đọc lại nhanh; thẻ là thứ giữ ký ức; lab/commit là bằng chứng. Mỗi thứ có chỗ riêng.

## 3. Cách học theo từng mảng

| Mảng | Học bằng | Thẻ nên là | Bằng chứng/đầu ra |
|---|---|---|---|
| **Network, Linux** | Dự đoán trước, rồi quan sát: "lệnh này sẽ in gì?" rồi chạy `curl -v`, `dig`, Wireshark. Làm hỏng có chủ đích (sai DNS, chặn port) rồi sửa | "Điều gì xảy ra khi…", "Triệu chứng X thường do tầng nào?" | Nhật ký sự cố nhỏ: triệu chứng → cách tìm → nguyên nhân |
| **Docker, CI/CD, k8s** | Lab trên repo thật. Mỗi lỗi gặp phải ghi lại. Viết YAML tay trước khi copy | Lỗi → nguyên nhân (CrashLoopBackOff, OOMKilled…), "khác nhau giữa X và Y" | Pipeline chạy, ghi 5 lỗi đã gặp |
| **Database** | Đoán execution plan **trước** khi chạy `EXPLAIN`, rồi đối chiếu | Anomaly của isolation level, khi nào index không được dùng | Before/after có số liệu |
| **System design, kiến trúc** | Thiết kế trên giấy 30', nói thành tiếng. **Làm lại cùng đề sau 1 tuần và 1 tháng** từ trang trắng. Luôn ghi "khi nào không dùng". Viết ADR | Trade-off, con số ước lượng (QPS, dung lượng), "vì sao chọn X thay vì Y" | ADR; sơ đồ vẽ tay |
| **Frontend sâu** | Dự đoán hành vi (re-render, event loop) rồi kiểm chứng bằng Profiler/DevTools. Viết lại snippet từ trí nhớ | "Vì sao component này re-render?", output của snippet async | Repo mini cho mỗi chủ đề, đo trước/sau |
| **AI engineering** | Eval trước, tính năng sau. Giữ nhật ký thí nghiệm (đổi gì → số liệu đổi ra sao). Phân loại lỗi (retrieval/prompt/tool/control flow) | Khái niệm (token, context, embedding), "lỗi này thuộc loại nào" | Bộ eval + bảng lỗi; trace đọc được |
| **DSA** | Tự giải ≥25' trước khi xem lời giải. Sau đó ghi **pattern + insight** (không ghi code). **Giải lại không nhìn sau 3 ngày, 2 tuần** | 1 thẻ/bài: "dấu hiệu nhận ra pattern + ý chính" | Log bài: ngày, thời gian, loại lỗi |
| **Tiếng Anh** | Output là chính: nói/viết về **chính nội dung bạn đang học**. Ghi âm, nghe lại, ghi lỗi lặp | Từ/cụm lấy từ chính bài viết của bạn, lỗi hay mắc | Ghi âm hằng tuần, bài writing có chấm |

## 4. Dùng AI để học mà không phụ thuộc

Nguyên tắc: **AI hỏi và chấm, bạn trả lời.** AI giải thay là cảm giác hiểu giả.

| Dùng AI cho | Cách | Không dùng AI để |
|---|---|---|
| Làm người phỏng vấn | `study quiz`: AI hỏi, bạn viết câu trả lời, AI chấm theo note của bạn và chỉ ra chỗ thiếu | Viết note thay bạn |
| Đề xuất thẻ | `study gen`: AI đề xuất, **bạn duyệt từng thẻ** | Tự thêm thẻ không đọc |
| Phản biện thiết kế | Bạn trình bày thiết kế, AI hỏi "điều gì xảy ra khi X sập?" | Cho đáp án trước khi bạn thử |
| Debug | Quy tắc **thử 20' trước**, ghi giả thuyết, rồi mới hỏi AI. Hỏi "gợi ý hướng", không "sửa giúp" | Chấp nhận fix mà không giải thích được vì sao nó hoạt động |

Kiểm chứng: chọn ngẫu nhiên 1 thẻ/tuần do AI tạo, đối chiếu với tài liệu gốc. AI có thể sai; note do bạn viết từ tài liệu gốc mới là chuẩn.

**Luyện kiểu "AI-allowed" (phỏng vấn 2026 chấm cả cách điều khiển + kiểm chứng AI):** mỗi tuần 1 bài D cho AI giải, bạn phải (1) tìm bug hoặc case làm nó sai, (2) nói được độ phức tạp và vì sao đúng, (3) viết test phản biện. Ghi lại kiểu lỗi AI hay mắc vào `notes/interview/`.

**Radar xu hướng (CN đầu tháng, 30'):** đọc Thoughtworks Radar / Stack Overflow Survey / blog React-.NET-Anthropic, ghi `notes/trends/YYYY-MM.md`: *mới gì → giải vấn đề gì → có đáng học không → 1 thẻ Anki*. Chỉ đưa vào roadmap khi có ≥2 nguồn, giải vấn đề thật của bạn, và chạy thử được trong 1 buổi; đổi chỗ chứ không thêm chồng.

## 5. App `study` (trong `tools/study/`)

Chi tiết cài đặt và cách dùng: [tools/study/README.md](../tools/study/README.md).

**Web app** (dùng hằng ngày): `cd tools\study; npm run build; npm run serve`, mở http://localhost:4173. Sáu màn: Hôm nay (kế hoạch lấy từ `ROADMAP.md`, mỗi slot có nút "Đọc bài" mở bài đọc ngay trong app), Ôn tập, Notes (viết note, AI đề xuất thẻ), Phỏng vấn AI, Tiến độ. Dữ liệu nằm ở Supabase (schema `study`) khi có `STUDY_DATABASE_URL`, nếu không thì ghi file trong `notes/` và `data/`. Bản deploy: https://amberjack-study.vercel.app (đăng nhập bằng `STUDY_PASSWORD` trong `.env`).

**CLI** (cùng dữ liệu, tiện khi đang ở terminal):

| Lệnh | Việc |
|---|---|
| `study new <mảng> <chủ-đề>` | Tạo note từ template |
| `study sync` | Quét `notes/`, thêm thẻ mới (định dạng `Q:` / `A:`) |
| `study review` | Ôn thẻ đến hạn (FSRS, trộn mảng, giới hạn thẻ mới/ngày) |
| `study gen <note>` | DeepSeek đề xuất thẻ từ note, bạn duyệt |
| `study quiz <note>` | AI phỏng vấn + chấm theo note |
| `study stats` | Số thẻ đến hạn, tỉ lệ nhớ, chuỗi ngày, thẻ hay sai |
| `study cloud push\|pull` | Sao lưu/khôi phục notes + `data/` qua Supabase (schema `study`) |
| `study cloud migrate\|export` | File → bảng Supabase (nguồn chính của web app) / bảng → file (để CLI dùng) |

Chi phí DeepSeek ([giá chính thức](https://api-docs.deepseek.com/quick_start/pricing/)): `deepseek-flash` khoảng $0.15 / 1M token input (cache miss, giờ thấp điểm; giờ cao điểm gấp đôi) và $0.60 / 1M token output. Mỗi lần `gen`/`quiz` chỉ dùng vài nghìn token, nên chi phí thường rất nhỏ. Không có API key thì phần ôn thẻ vẫn dùng đầy đủ, chỉ thiếu tính năng AI (đề xuất thẻ, phỏng vấn).
