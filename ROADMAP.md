# Roadmap 19/10/2026 → 31/03/2027 (23 tuần + 3 ngày, 100% miễn phí, học xen kẽ)

**Mục tiêu:** nền tảng network/devops/k8s/system design chắc; frontend sâu; hiểu các kiến trúc phổ biến (modular monolith, microservices, micro-frontend, SaaS, multi-tenant); DSA đủ qua vòng phỏng vấn; hiểu cách build và kiểm soát AI; có 1 project nhỏ nhưng thật để show. Hợp đồng hết tháng 5 nên **bắt đầu nộp đơn từ tuần 21 (8/3)**, tuyển dụng thường mất 1–2 tháng.

**Nhịp học:** 2h tech/ngày × 6 ngày (~12h/tuần) + 1h tiếng Anh/ngày. Chủ nhật: review + nghỉ. Tuần 16 (Tết, 1–7/2) chạy nhẹ.

**Chi phí:** 0đ. LLM chạy local bằng [Ollama](https://ollama.com) hoặc API free tier; K8s chạy local bằng kind/k3s; cloud dùng free tier hoặc tự host + Cloudflare Tunnel. Phí thi IELTS thật chỉ trả khi cần. Chứng chỉ CKA có phí nên không đưa vào.

## Nguyên tắc: học xen kẽ, không học theo cục

4 mảng chạy **song song mỗi tuần**: **S** (hạ tầng, system design, kiến trúc), **F** (frontend sâu), **A** (AI), **D** (DSA). Mỗi mảng đi từ dễ đến khó và quay lại ôn, nên không phải chờ mảng này xong mới tới mảng kia.

| Ngày | Nội dung | Giờ |
|---|---|---|
| T2 | 45' D + 75' S (đọc/xem) | 2 |
| T3 | F: 45' lý thuyết + 75' lab | 2 |
| T4 | 45' D + 75' S (lab hoặc viết note/vẽ thiết kế) | 2 |
| T5 | A: 45' lý thuyết + 75' lab | 2 |
| T6 | 45' D (bài mới hoặc bài sai từ 2 tuần trước) + 75' F | 2 |
| T7 | Project hoặc Lab (xen kẽ, xem cột T7) | 2 |
| CN | 30' Anki + review tuần; còn lại nghỉ | 0.5 |

Tổng/tuần: S ≈ 2.5h (+ T7 khi là lab), F ≈ 3.25h, A ≈ 2h, D ≈ 2.25h, T7 2h. Mỗi chủ đề ra **1 note + 5–10 thẻ Anki + 1 thứ chạy được**. Các tuần 4, 8, 13, 18, 22: T7 dành cho **checkpoint**: tự hỏi đáp 30 câu trộn cả 4 mảng, ghi âm bằng tiếng Anh.

## Quy tắc để project không phình to

1. **Project nhỏ, có người dùng thật:** 1 sản phẩm giải quyết nhu cầu thật (từ khách hàng/bạn bè).
2. **Thêm gì cũng theo vòng: Vấn đề → Số liệu → Quyết định → ADR.** Chưa có số liệu cho thấy cần cache, queue, k8s hay tách microservice thì **không thêm** vào project; ghi ADR "đã cân nhắc nhưng chưa cần" cũng là kiến thức tốt cho phỏng vấn.
3. **Thực hành công nghệ trong `labs/` riêng** (repo nhỏ, vứt đi được): Redis, replica, RabbitMQ, k8s, microservices, micro-frontend, Raft… Lab không làm rối project.
4. **Project lớn lên qua 3 mốc:** v1 MVP cho 3–5 người dùng thật (tuần 8) → v2 vận hành và cấu trúc lại thành modular monolith (tuần 9) → v3 chỉ sửa chỗ nghẽn đã đo được.
5. **Multi-tenant/SaaS:** nếu sản phẩm thật sự phục vụ nhiều khách hàng thì áp dụng vào project (tuần 13); nếu không, làm trong `labs/`.
6. **AI trong project:** đúng 1 tính năng AI mà người dùng thật cần, có eval.

## Lộ trình theo tuần

S = hạ tầng + system design + kiến trúc · F = frontend sâu · A = AI · D = DSA (4 bài/tuần: 2 mới, 1 bấm giờ, 1 ôn lại bài sai).

| Tuần | Ngày | S | F | A | D | T7 (project/lab/checkpoint) |
|---|---|---|---|---|---|---|
| 1 | 19–25/10 | Network: TCP/IP, DNS, HTTP, TLS | Browser internals: rendering pipeline, critical rendering path | C# gọi LLM (Ollama): token, tham số | Arrays & Hashing | Chọn sản phẩm, viết 1 trang vấn đề + người dùng; thi thử IELTS |
| 2 | 26/10–1/11 | Linux/shell + Docker | JavaScript sâu: closure, prototype, async, event loop | Structured output (JSON schema), validate + retry | Two Pointers | Skeleton .NET API + React/Next, 1 chức năng cốt lõi |
| 3 | 2–8/11 | Docker compose + CI/CD (GitHub Actions) | TypeScript sâu: generics, narrowing, utility types | Prompt/context cơ bản; Karpathy "Intro to LLMs" | Stack | Chức năng cốt lõi + auth |
| 4 | 9–15/11 | Deploy miễn phí (Cloudflare Tunnel/Oracle Free), Nginx, HTTPS; DB: index, execution plan | React internals: render/commit, reconciliation, vì sao re-render | Tool calling cơ bản | Binary Search | **Checkpoint 1**; app chạy bằng `docker compose` |
| 5 | 16–22/11 | DB: transaction, isolation, N+1 (EF Core); log/metric/trace (OpenTelemetry) | React performance: memo, Profiler, virtualization, code splitting | Eval mini: 20 case cho 1 tác vụ | Sliding Window | Thêm CI + deploy lần đầu |
| 6 | 23–29/11 | k6 load test, ước lượng tải, SLO; khung system design | State & data fetching: server state vs client state (TanStack Query), cache, optimistic update | Embeddings + vector search (pgvector) | Linked List | Hoàn thiện tính năng cho người dùng thử |
| 7 | 30/11–6/12 | SD: cache, CDN, load balancer, replication, sharding | Web performance: Core Web Vitals, bundle, ảnh/font, caching | RAG: chunking, retrieval | Trees | Lab Redis trong `labs/` |
| 8 | 7–13/12 | SD: queue, pub/sub, outbox, idempotency | Next.js rendering: SSR/SSG/ISR/streaming/RSC; so với Nuxt | RAG: phân tích lỗi + eval retrieval | Trees (BST/BFS) | **v1:** 3–5 người dùng thật; **Checkpoint 2** |
| 9 | 14–20/12 | Kiến trúc: modular monolith vs microservices, DDD bounded context, Clean Architecture | Web security: XSS, CSRF, CSP, CORS, OAuth2/OIDC | Agent loop (Anthropic + HF Agents unit 1–2) | Heap | Chuyển project sang modular monolith + ADR; đo điểm nghẽn thật |
| 10 | 21–27/12 | K8s 1: Pod, Deployment, Service (kind) | Testing: Vitest, Testing Library, Playwright | Agent có 2 tool, giới hạn số bước, log từng bước | Backtracking | Lab: image của project chạy trên kind |
| 11 | 28/12–3/1 | Microservices thực hành: tách service, API gateway, saga, contract test; Polly (timeout/retry/circuit breaker) | Accessibility + design system + CSS architecture | Eval agent: phân loại lỗi, LLM-as-judge | Graphs BFS/DFS | Lab: 2 service + gateway trong `labs/microservices` |
| 12 | 4–10/1 | K8s 2: ConfigMap, Secret, probes, Ingress, TLS | Micro-frontend: các cách tiếp cận, Module Federation, Web Components, khi nào *không* nên dùng | Guardrails: prompt injection, quyền của tool (OWASP GenAI) | Graphs 2 (grid, Union-Find) | Lab: 2 app React ghép bằng Module Federation trong `labs/microfrontend` |
| 13 | 11–17/1 | SaaS + multi-tenancy: mô hình tenant (DB riêng/schema/row-level), isolation, quota, auth theo tenant | Multi-tenant frontend: theming/white-label, feature flag, subdomain routing | Zero to Hero: micrograd, makemore | Tries + Intervals | Project: `tenant_id` + EF Core global query filter nếu cần; **Checkpoint 3** |
| 14 | 18–24/1 | K8s 3: Helm, HPA, debug (CrashLoopBackOff, OOMKilled) | Frontend architecture: monorepo, feature-sliced, error handling, observability | Zero to Hero: build GPT; HF LLM Course (fine-tune khái niệm) | DP 1D | Lab k8s: Helm chart + HPA, ghi 5 lỗi đã gặp |
| 15 | 25–31/1 | SD case 1: URL shortener, rate limiter, news feed | Frontend system design: feed, typeahead, infinite scroll | MCP, cost/latency, cache | DP 2D | Chọn **1 tính năng AI** cho project dựa trên phản hồi người dùng |
| 16 | 1–7/2 | *Nghỉ Tết nhẹ:* ôn Anki, đọc nhẹ | Ôn nhẹ | Xem video | Ôn bài sai | Không build mới |
| 17 | 8–14/2 | Event-driven, CQRS; tổng quan Raft/leader election | Real-time (WebSocket/SSE), offline/PWA | Xây tính năng AI trong project | Greedy | Tiếp tục tính năng AI |
| 18 | 15–21/2 | SD case 2: chat, notification, payment, flash sale | FE Q&A: JS/React/TS + FE system design (mock) | Eval so sánh 2 phiên bản prompt/model, eval trong CI | Dijkstra, Topological Sort | **Checkpoint 4**; README + sơ đồ + demo GIF |
| 19 | 22–28/2 | Học bù/đào sâu mảng còn yếu (k8s, microservices, multi-tenant, network); SD case thêm: ticketing, file storage | Học bù/đào sâu (micro-frontend, performance, security) | Hoàn thiện tính năng AI + eval | Medium trộn, bấm giờ | Hoàn thiện project: README + sơ đồ + demo GIF |
| 20 | 1–7/3 | Mock system design (kể cả SaaS multi-tenant); ôn k8s/network/DB | Mock FE + FE system design | Mock AI (tiếng Anh) | Medium trộn, bấm giờ | CV tiếng Anh, LinkedIn, GitHub; 6 câu chuyện STAR bằng tiếng Anh |
| 21 | 8–14/3 | Mock + ôn mảng yếu | Mock + ôn | Ôn | 2 bài/45' | **Bắt đầu nộp đơn (10/tuần)**; 2 mock/tuần |
| 22 | 15–21/3 | Ôn theo phỏng vấn thật | Ôn theo phỏng vấn thật | Ôn | 2 bài/45' | **Checkpoint 5**; phỏng vấn thật, ghi câu bị hỏi vào `notes/interview/` |
| 23 | 22–28/3 | Ôn điểm yếu | Ôn điểm yếu | Ôn | 2 bài/45' | Nộp thêm đơn, phỏng vấn tiếp, đàm phán lương |
| — | 29–31/3 | Retrospective | | | | Chốt offer hoặc kế hoạch tiếp (freelance, remote part-time) |

Tuần nào quá tải: giữ S + D, giảm F hoặc A, đừng bỏ cả 4 mảng. Tuần 19–20 để đào sâu và mock, từ tuần 21 các mảng chuyển sang chế độ ôn + phỏng vấn thật.

## Tài liệu chính (đều miễn phí)

| Mảng | Tài liệu |
|---|---|
| Network | [High Performance Browser Networking](https://hpbn.co) |
| Linux/shell/git | [MIT Missing Semester](https://missing.csail.mit.edu) |
| Docker, CI/CD | [Docker Get Started](https://docs.docker.com/get-started/), [GitHub Actions](https://docs.github.com/en/actions), [12-Factor](https://12factor.net), [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) |
| Database | [Use The Index, Luke](https://use-the-index-luke.com) |
| Observability | [OpenTelemetry .NET](https://opentelemetry.io/docs/languages/dotnet/), [k6](https://grafana.com/docs/k6/latest/) |
| System design | [Hello Interview](https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction), [System Design Primer](https://github.com/donnemartin/system-design-primer), [System Design 101](https://github.com/ByteByteGoHq/system-design-101), [Azure Architecture Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/), [AWS Builders' Library](https://aws.amazon.com/builders-library/), [Google SRE Book](https://sre.google/sre-book/table-of-contents/), [Distributed Systems for Fun and Profit](https://book.mixu.net/distsys/), [High Scalability](https://highscalability.com), [Raft visualization](https://raft.github.io) |
| Kiến trúc | [Monolith First – Fowler](https://martinfowler.com/bliki/MonolithFirst.html), [microservices.io](https://microservices.io), [Azure Microservices guide](https://learn.microsoft.com/en-us/azure/architecture/microservices/), [.NET: Architecting modern web apps](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/), [Azure Multitenant guide](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/overview), [EF Core multi-tenancy](https://learn.microsoft.com/en-us/ef/core/miscellaneous/multitenancy) |
| Kubernetes | [K8s Overview](https://kubernetes.io/docs/concepts/overview/), [Tutorials](https://kubernetes.io/docs/tutorials/), [Killercoda labs](https://killercoda.com), [kind](https://kind.sigs.k8s.io), [Helm](https://helm.sh/docs/) |
| Frontend | [javascript.info](https://javascript.info), [MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development), [web.dev Learn](https://web.dev/learn), [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html), [react.dev](https://react.dev/learn), [patterns.dev](https://www.patterns.dev), [TanStack Query](https://tanstack.com/query/latest), [Next.js Learn](https://nextjs.org/learn), [Nuxt rendering](https://nuxt.com/docs/guide/concepts/rendering), [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org), [Vitest](https://vitest.dev), [Playwright](https://playwright.dev), [Micro Frontends – Fowler](https://martinfowler.com/articles/micro-frontends.html), [Module Federation](https://module-federation.io) |
| DSA | [NeetCode roadmap](https://neetcode.io/roadmap), [MIT 6.006](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/), [Tech Interview Handbook](https://www.techinterviewhandbook.org) |
| AI | [Karpathy Zero to Hero](https://karpathy.ai/zero-to-hero.html), [HF LLM Course](https://huggingface.co/learn/llm-course), [HF Agents Course](https://huggingface.co/learn/agents-course), [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [.NET AI docs](https://learn.microsoft.com/en-us/dotnet/ai/), [DeepLearning.AI short courses](https://www.deeplearning.ai/short-courses/), [Hamel: Evals](https://hamel.dev/blog/posts/evals/) + [FAQ](https://hamel.dev/blog/posts/evals-faq/), [OWASP GenAI](https://genai.owasp.org), [MCP](https://modelcontextprotocol.io), [pgvector](https://github.com/pgvector/pgvector), [Google Colab](https://colab.research.google.com) |

---

## Tiếng Anh + IELTS (1h/ngày, miễn phí)

Bạn đang B2 VSTEP (thường tương đương IELTS khoảng 5.5–6.0, chỉ tham khảo). Làm bài thi thử để biết band thật.

| Khung 1h | Nội dung |
|---|---|
| 20' | Nghe: BBC Learning English (6 Minute English), YouTube kỹ thuật có phụ đề; shadowing 5' |
| 20' | Nói: trả lời 1 câu hỏi phỏng vấn tech 2 phút bằng tiếng Anh, ghi âm, nghe lại; hoặc nói với AI free |
| 20' | Đọc/viết: đọc 1 bài kỹ thuật, viết note của ngày đó bằng tiếng Anh |

| Mốc | Việc |
|---|---|
| Tuần 1 | Thi thử IELTS miễn phí (British Council có practice test free, [IELTS Liz](https://ieltsliz.com)) để lấy baseline |
| Hằng tuần | 1 bài writing hoặc 1 bộ listening/reading, ghi lỗi lặp lại; 1–2 buổi nói với AI hoặc bạn học |
| Cuối tháng 12, tuần 18 | Thi thử lại, theo dõi band |
| Tuần 21 trở đi | Quyết định có cần thi IELTS thật không (phần lớn job remote cần giao tiếp hơn chứng chỉ; có thể nộp kèm VSTEP B2 và bài viết/video tiếng Anh) |

## Kiếm thêm + quỹ dự phòng

- Mở quỹ dự phòng 3–6 tháng chi phí; tự động chuyển một khoản cố định mỗi tháng.
- Đề xuất ở công ty những việc thật: CI/CD, logging/monitoring, load test, tài liệu kiến trúc.
- Project nhỏ có người dùng thật là nền để sau này bán hoặc nhận làm thêm.
- Từ tuần 21: nhận task nhỏ trên nền tảng freelance nếu còn thời gian.
