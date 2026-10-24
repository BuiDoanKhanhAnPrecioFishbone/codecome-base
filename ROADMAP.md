# Roadmap 26/10/2026 → 07/04/2027 (23 tuần + 3 ngày, 100% miễn phí, học xen kẽ, kèm chứng chỉ Optimizely)

**Mục tiêu:** nền tảng network/devops/k8s/system design chắc; frontend sâu; hiểu các kiến trúc phổ biến (modular monolith, microservices, micro-frontend, SaaS, multi-tenant); DSA đủ qua vòng phỏng vấn; hiểu cách build và kiểm soát AI; có 1 project nhỏ nhưng thật để show. **Đậu Optimizely CMS PaaS Developer Certification trước 31/12/2026.** Hợp đồng hết tháng 5 nên **bắt đầu nộp đơn từ tuần 21 (15/3)**, tuyển dụng thường mất 1–2 tháng.

**Nhịp học:** 2h tech/ngày × 6 ngày (~12h/tuần) + **1h Optimizely/ngày (T2–T7; CN 30')** + 1h tiếng Anh/ngày. Sau kỳ thi (tuần 10 trở đi) giờ Optimizely được trả lại cho project/mảng yếu. Chủ nhật: review + nghỉ. Tuần 15 (Tết, 1–7/2) chạy nhẹ.

**Chi phí:** 0đ. LLM chạy local bằng [Ollama](https://ollama.com) hoặc API free tier; K8s chạy local bằng kind/k3s; cloud dùng free tier hoặc tự host + Cloudflare Tunnel. Phí thi IELTS thật chỉ trả khi cần. Chứng chỉ CKA có phí nên không đưa vào.

## Nguyên tắc: học xen kẽ, không học theo cục

4 mảng chạy **song song mỗi tuần**: **S** (hạ tầng, system design, kiến trúc), **F** (frontend sâu), **A** (AI), **D** (DSA), cộng **O** (Optimizely, chỉ trong giai đoạn luyện thi, xem phần riêng bên dưới). Mỗi mảng đi từ dễ đến khó và quay lại ôn, nên không phải chờ mảng này xong mới tới mảng kia.

| Ngày | Nội dung | Giờ |
|---|---|---|
| T2 | 45' D + 75' S (đọc/xem) + 60' O | 3 |
| T3 | F: 45' lý thuyết + 75' lab + 60' O | 3 |
| T4 | 45' D + 75' S (lab hoặc viết note/vẽ thiết kế) + 60' O | 3 |
| T5 | A: 45' lý thuyết + 75' lab + 60' O | 3 |
| T6 | 45' D (bài mới hoặc bài sai từ 2 tuần trước) + 75' F + 60' O | 3 |
| T7 | Project hoặc Lab (xen kẽ, xem cột T7) + 60' O | 3 |
| CN | 30' Anki + review tuần (CN đầu tháng: 30' Radar xu hướng, xem bên dưới) + 30' O (ôn + quiz tuần); còn lại nghỉ | 1 |

Tổng/tuần: S ≈ 2.5h (+ T7 khi là lab), F ≈ 3.25h, A ≈ 2h, D ≈ 2.25h, T7 2h, O 6.5h (tuần 1–10). Mỗi chủ đề ra **1 note + 5–10 thẻ Anki + 1 thứ chạy được**. Các tuần 4, 8, 13, 18, 22: T7 dành cho **checkpoint**: tự hỏi đáp 30 câu trộn cả 4 mảng, ghi âm bằng tiếng Anh.

## Luồng xu hướng 2026: nền tảng + cái mới, không học đồ cũ

Phỏng vấn 2026 (Thoughtworks Radar Vol 34 tháng 4/2026, Stack Overflow Survey 2025, các bài tổng hợp về phỏng vấn) cho thấy: **nền tảng vẫn là ngưỡng đầu vào** (network, DB, system design, debug), nhưng người ta chấm thêm **cách bạn dùng AI và kiểm chứng kết quả của nó**. 84% dev dùng AI nhưng chỉ 33% tin kết quả; nỗi đau lớn nhất là code AI "gần đúng nhưng sai" (66%). Nên kế hoạch có thêm 5 thứ:

1. **Kỹ năng kiểm chứng AI:** mỗi tuần 1 bài D làm kiểu "AI-allowed": nhờ AI giải, bạn tìm bug, chứng minh độ phức tạp, viết test phản biện. Tuần 10, 18, 20 có buổi mock đọc/debug code lạ và review diff do AI sinh.
2. **AI strand cập nhật:** context engineering (thay cho "prompt cơ bản"), structured output, eval + tracing (Langfuse), tính bền của agent (retry/resume/idempotent), guardrails + sandbox + prompt injection, small language models chạy local. MCP học đúng chỗ của nó: Radar xếp "MCP by default" vào *Caution*, nên phải biết khi nào gọi API thẳng tốt hơn.
3. **Frontend hiện đại:** React 19 (Compiler, Actions, `useOptimistic`, `use`), RSC, INP, passkeys/WebAuthn, component test chạy trong trình duyệt thật.
4. **Vận hành hiện đại:** OpenTelemetry là mặc định, DORA metrics, supply chain (SBOM, pin version, Dependabot), zero trust cơ bản (mTLS, NetworkPolicy, RBAC), .NET 10 LTS + Aspire + `Microsoft.Extensions.AI`.
5. **Radar hằng tháng (CN đầu tháng, 30' thay cho Anki):** đọc 1 nguồn (Thoughtworks Radar, Stack Overflow Survey, blog React/.NET/Anthropic), ghi `notes/trends/YYYY-MM.md` theo mẫu: *thứ gì mới → vấn đề nó giải → có đáng học không → 1 thẻ Anki*. Nếu đáng học thì đổi chỗ với 1 chủ đề cũ trong bảng, không thêm vào.

Tiêu chí lọc xu hướng: có trong ≥2 nguồn độc lập, giải 1 vấn đề thật mà dự án của bạn đang gặp, và bạn **chạy thử được trong 1 buổi**. Chưa thỏa thì chỉ ghi vào note.

## Quy tắc để project không phình to

1. **Project nhỏ, có người dùng thật:** 1 sản phẩm giải quyết nhu cầu thật (từ khách hàng/bạn bè).
2. **Thêm gì cũng theo vòng: Vấn đề → Số liệu → Quyết định → ADR.** Chưa có số liệu cho thấy cần cache, queue, k8s hay tách microservice thì **không thêm** vào project; ghi ADR "đã cân nhắc nhưng chưa cần" cũng là kiến thức tốt cho phỏng vấn.
3. **Thực hành công nghệ trong `labs/` riêng** (repo nhỏ, vứt đi được): Redis, replica, RabbitMQ, k8s, microservices, micro-frontend, Raft… Lab không làm rối project.
4. **Project lớn lên qua 3 mốc:** v1 MVP cho 3–5 người dùng thật (tuần 8) → v2 vận hành và cấu trúc lại thành modular monolith (tuần 9) → v3 chỉ sửa chỗ nghẽn đã đo được.
5. **Multi-tenant/SaaS:** nếu sản phẩm thật sự phục vụ nhiều khách hàng thì áp dụng vào project (tuần 13); nếu không, làm trong `labs/`.
6. **AI trong project:** đúng 1 tính năng AI mà người dùng thật cần, có eval.

## Lộ trình theo tuần

S = hạ tầng + system design + kiến trúc · F = frontend sâu · A = AI · D = DSA (4 bài/tuần: 2 mới, 1 bấm giờ, 1 ôn lại bài sai) · O = Optimizely (luyện thi).

| Tuần | Ngày | O (Optimizely) | S | F | A | D | T7 (project/lab/checkpoint) |
|---|---|---|---|---|---|---|---|
| 1 | 26/10–1/11 | Setup CMS 12 local (Alloy, license dev) + đọc blueprint Foundations |  Network: TCP/IP, DNS, HTTP, TLS | Browser internals: rendering pipeline, critical rendering path | C# gọi LLM (Ollama): token, tham số | Arrays & Hashing | Chọn sản phẩm, viết 1 trang vấn đề + người dùng; thi thử IELTS |
| 2 | 2–8/11 | Foundations 7 domain (Platform, Content, Experimentation, Commerce, Data, Product, AI); content model + repository; **thi Foundations T7 7/11** | Linux/shell + Docker | JavaScript sâu: closure, prototype, async, event loop | Structured output (JSON schema), validate + retry | Two Pointers | Skeleton .NET API + React/Next, 1 chức năng cốt lõi |
| 3 | 9–15/11 | Content types + property types, rendering (Razor/ViewComponent), versions + publishing, content events | Docker compose + CI/CD (GitHub Actions), supply chain cơ bản (pin version, Dependabot, SBOM) | TypeScript sâu: generics, narrowing, utility types | Context engineering (không chỉ prompt); Karpathy "Intro to LLMs" | Stack | Chức năng cốt lõi + auth |
| 4 | 16–22/11 | Initialization modules (`IInitializableModule`), DI, scheduled jobs, plugin, custom editor/property, on-page editing | Deploy miễn phí (Cloudflare Tunnel/Oracle Free), Nginx, HTTPS; DB: index, execution plan | React internals: render/commit, reconciliation, vì sao re-render; React 19 Actions + `useOptimistic` | Tool calling cơ bản | Binary Search | **Checkpoint 1**; app chạy bằng `docker compose` |
| 5 | 23–29/11 | Content Delivery API + Optimizely Graph (GraphQL): indexing, query, pagination, webhooks, auth | DB: transaction, isolation, N+1 (EF Core); log/metric/trace (OpenTelemetry + Aspire dashboard) | React performance: React Compiler vs memo thủ công, Profiler, virtualization, code splitting | Eval mini: 20 case cho 1 tác vụ; tracing LLM bằng Langfuse (self-host) | Sliding Window | Thêm CI + deploy lần đầu |
| 6 | 30/11–6/12 | Permissions/ACL, visitor groups + personalization, SSO/OIDC, roles, Opti ID | k6 load test, ước lượng tải, SLO + DORA metrics; khung system design | State & data fetching: server state vs client state (TanStack Query), cache, optimistic update, `use` + Suspense | Embeddings + vector search (pgvector) | Linked List | Hoàn thiện tính năng cho người dùng thử |
| 7 | 7–13/12 | DXP: environments, deployment/CI-CD, config, CDN, caching, scaling; DAM, migration/export, AI (Opal) | SD: cache, CDN, load balancer, replication, sharding | Web performance: Core Web Vitals (LCP, INP, CLS), bundle, ảnh/font, caching | RAG: chunking, hybrid search + rerank | Trees | Lab Redis trong `labs/` |
| 8 | 14–20/12 | Mock exam theo trọng số domain, vá điểm yếu; **thi Core Developer T7 19/12** | SD: queue, pub/sub, outbox, idempotency | Next.js rendering: SSR/SSG/ISR/streaming/RSC + Server Actions; so với Nuxt | RAG: phân tích lỗi + eval retrieval | Trees (BST/BFS) | **v1:** 3–5 người dùng thật; **Checkpoint 2** rút gọn 15 câu (19/12 là ngày thi Optimizely, ưu tiên nghỉ ngơi) |
| 9 | 21–27/12 | Dự phòng: retake nếu cần (chờ 2 ngày), ôn domain yếu | Kiến trúc: modular monolith vs microservices, DDD bounded context, Clean Architecture | Web security: XSS, CSRF, CSP, CORS, OAuth2/OIDC, passkeys/WebAuthn | Agent loop (Anthropic + HF Agents unit 1–2) | Heap | Chuyển project sang modular monolith + ADR; đo điểm nghẽn thật |
| 10 | 28/12–3/1 | Dự phòng cuối đến 30/12 (nếu đã đậu: dùng giờ này cho project/mảng yếu) | K8s 1: Pod, Deployment, Service (kind) | Testing: Vitest (browser mode), Testing Library, Playwright; mock đọc/debug code lạ | Agent có 2 tool, giới hạn số bước, log từng bước, retry/resume idempotent (tính bền) | Backtracking | Lab: image của project chạy trên kind |
| 11 | 4–10/1 | — | Microservices thực hành: tách service, API gateway, saga, contract test; Polly (timeout/retry/circuit breaker) | Accessibility + design system + CSS architecture | Eval agent: phân loại lỗi, LLM-as-judge | Graphs BFS/DFS | Lab: 2 service + gateway trong `labs/microservices` |
| 12 | 11–17/1 | — | K8s 2: ConfigMap, Secret, probes, Ingress, TLS | Micro-frontend: các cách tiếp cận, Module Federation, Web Components, khi nào *không* nên dùng | Guardrails: prompt injection, "lethal trifecta", quyền của tool, sandbox (OWASP GenAI) | Graphs 2 (grid, Union-Find) | Lab: 2 app React ghép bằng Module Federation trong `labs/microfrontend` |
| 13 | 18–24/1 | — | SaaS + multi-tenancy: mô hình tenant (DB riêng/schema/row-level), isolation, quota, auth theo tenant | Multi-tenant frontend: theming/white-label, feature flag, subdomain routing | Zero to Hero: micrograd, makemore | Tries + Intervals | Project: `tenant_id` + EF Core global query filter nếu cần; **Checkpoint 3** |
| 14 | 25–31/1 | — | K8s 3: Helm, HPA, debug (CrashLoopBackOff, OOMKilled); zero trust cơ bản (RBAC, NetworkPolicy, mTLS) | Frontend architecture: monorepo, feature-sliced, error handling, observability (Sentry, RUM) | Zero to Hero: build GPT; HF LLM Course; small language models chạy local (quantization) | DP 1D | Lab k8s: Helm chart + HPA, ghi 5 lỗi đã gặp |
| 15 | 1–7/2 | — | *Nghỉ Tết nhẹ:* ôn Anki, đọc nhẹ | Ôn nhẹ | Xem video | Ôn bài sai | Không build mới |
| 16 | 8–14/2 | — | SD case 1: URL shortener, rate limiter, news feed | Frontend system design: feed, typeahead, infinite scroll, server-driven UI | MCP (viết 1 server nhỏ; khi nào gọi API thẳng tốt hơn), cost/latency, cache | DP 2D | Chọn **1 tính năng AI** cho project dựa trên phản hồi người dùng |
| 17 | 15–21/2 | — | Event-driven, CQRS, durable execution (workflow, saga); tổng quan Raft/leader election | Real-time (WebSocket/SSE), offline/PWA | Xây tính năng AI trong project, có trace Langfuse | Greedy | Tiếp tục tính năng AI |
| 18 | 22–28/2 | — | SD case 2: chat, notification, payment, flash sale; thiết kế hệ thống có LLM/RAG (gateway, cache, cost) | FE Q&A: JS/React/TS + FE system design (mock); review diff do AI sinh | Eval so sánh 2 phiên bản prompt/model, eval trong CI, feedback flywheel | Dijkstra, Topological Sort | **Checkpoint 4**; README + sơ đồ + demo GIF |
| 19 | 1–7/3 | — | Học bù/đào sâu mảng còn yếu (k8s, microservices, multi-tenant, network); SD case thêm: ticketing, file storage | Học bù/đào sâu (micro-frontend, performance, security) | Hoàn thiện tính năng AI + eval | Medium trộn, bấm giờ | Hoàn thiện project: README + sơ đồ + demo GIF |
| 20 | 8–14/3 | — | Mock system design (kể cả SaaS multi-tenant); ôn k8s/network/DB | Mock FE + FE system design | Mock AI + mock "AI-allowed" (tiếng Anh): điều khiển AI, kiểm chứng, giải thích quyết định | Medium trộn, bấm giờ | CV tiếng Anh, LinkedIn, GitHub; 6 câu chuyện STAR bằng tiếng Anh |
| 21 | 15–21/3 | — | Mock + ôn mảng yếu | Mock + ôn | Ôn | 2 bài/45' | **Bắt đầu nộp đơn (10/tuần)**; 2 mock/tuần |
| 22 | 22–28/3 | — | Ôn theo phỏng vấn thật | Ôn theo phỏng vấn thật | Ôn | 2 bài/45' | **Checkpoint 5**; phỏng vấn thật, ghi câu bị hỏi vào `notes/interview/` |
| 23 | 29/3–4/4 | — | Ôn điểm yếu | Ôn điểm yếu | Ôn | 2 bài/45' | Nộp thêm đơn, phỏng vấn tiếp, đàm phán lương |
| — | 5–7/4 | | Retrospective | | | | Chốt offer hoặc kế hoạch tiếp (freelance, remote part-time) |

Tuần nào quá tải: giữ S + D + O, giảm F hoặc A, đừng bỏ cả 4 mảng. Tuần 19–20 để đào sâu và mock, từ tuần 21 các mảng chuyển sang chế độ ôn + phỏng vấn thật.

## Chứng chỉ Optimizely CMS PaaS Developer (hạn 31/12/2026)

Theo blueprint chính thức (certification.optimizely.com, track CMS PaaS · Core · Developer). **Hãy mở trang đó kiểm tra lại phí thi, số lần thi và điều kiện trước khi đặt lịch**, vì thông tin có thể đổi.

| | Foundations (điều kiện trước) | Core Developer |
|---|---|---|
| Đề | 20 câu trắc nghiệm, 30', đạt 70% | 30 câu trắc nghiệm + 1 tình huống + 1 giải thích, 75', đạt ≥70% (trắc nghiệm ≥65%, tình huống ≥65%) |
| Lịch của mình | T7 7/11 (cuối tuần 2) | T7 19/12 (cuối tuần 8) |
| Dự phòng | thi lại sau 2 ngày | tuần 9 + 28–30/12; tối đa 3 lần/quý |

**Trọng số Core Developer** (dồn thời gian theo đây): Developer Experience & Extensibility **45%** (on-page editing, custom editor, plugin, initialization module, content events, DAM, migration/export, AI) · Content Delivery & APIs **20%** (GraphQL/Optimizely Graph, headless, indexing, search, webhooks, auth) · User Management Security **15%** (permissions, visitor groups, personalization) · Cloud Infrastructure & Deployment **10%** (CI/CD, môi trường, CDN, caching) · Access Control & User Management **10%** (role, SSO, provisioning).

**Foundations** gồm 7 domain: Platform Services 20%, Content Management & Delivery 15%, Experimentation & Personalization 15%, Commerce & B2B 15%, Data Platform & Analytics 15%, Product Fundamentals 10%, AI/Automation/Agent 10%. Chỉ cần hiểu khái niệm, không cần code sâu.

**Cách học mảng O (1h/ngày):** T2–T5 đọc docs + làm lab trên CMS 12 (Alloy sample) rồi viết note `notes/optimizely/`; T6 làm 10 câu trắc nghiệm tự đặt (nhờ AI sinh, đối chiếu docs); T7 lab tổng hợp hoặc thi; CN 30' quiz tuần + thẻ Anki. Từ tuần 6 mỗi tuần 1 mock 30 câu bấm giờ. Mỗi chủ đề phải có 1 thứ chạy được trong site Alloy của bạn, vì câu tình huống hỏi cách xử lý chứ không hỏi thuộc lòng.

Tuần 10 trở đi nếu đã đậu: cột O là "—" và 1h/ngày dồn lại cho project/mảng yếu.

## Tài liệu chính (đều miễn phí)

| Mảng | Tài liệu |
|---|---|
| Optimizely | [Certification blueprint](https://certification.optimizely.com), [Optimizely Academy](https://academy.optimizely.com), [Developer docs](https://docs.developers.optimizely.com), [Alloy sample](https://github.com/episerver/alloy-mvc-template) |
| Network | [High Performance Browser Networking](https://hpbn.co) |
| Linux/shell/git | [MIT Missing Semester](https://missing.csail.mit.edu) |
| Docker, CI/CD | [Docker Get Started](https://docs.docker.com/get-started/), [GitHub Actions](https://docs.github.com/en/actions), [12-Factor](https://12factor.net), [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) |
| Database | [Use The Index, Luke](https://use-the-index-luke.com) |
| Observability | [OpenTelemetry .NET](https://opentelemetry.io/docs/languages/dotnet/), [.NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/aspire-overview), [k6](https://grafana.com/docs/k6/latest/), [DORA metrics](https://dora.dev/guides/dora-metrics/), [SLSA (supply chain)](https://slsa.dev) |
| System design | [Hello Interview](https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction), [System Design Primer](https://github.com/donnemartin/system-design-primer), [System Design 101](https://github.com/ByteByteGoHq/system-design-101), [Azure Architecture Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/), [AWS Builders' Library](https://aws.amazon.com/builders-library/), [Google SRE Book](https://sre.google/sre-book/table-of-contents/), [Distributed Systems for Fun and Profit](https://book.mixu.net/distsys/), [High Scalability](https://highscalability.com), [Raft visualization](https://raft.github.io) |
| Kiến trúc | [Monolith First – Fowler](https://martinfowler.com/bliki/MonolithFirst.html), [microservices.io](https://microservices.io), [Azure Microservices guide](https://learn.microsoft.com/en-us/azure/architecture/microservices/), [.NET: Architecting modern web apps](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/), [Azure Multitenant guide](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/overview), [EF Core multi-tenancy](https://learn.microsoft.com/en-us/ef/core/miscellaneous/multitenancy) |
| Kubernetes | [K8s Overview](https://kubernetes.io/docs/concepts/overview/), [Tutorials](https://kubernetes.io/docs/tutorials/), [Killercoda labs](https://killercoda.com), [kind](https://kind.sigs.k8s.io), [Helm](https://helm.sh/docs/) |
| Frontend | [javascript.info](https://javascript.info), [MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development), [web.dev Learn](https://web.dev/learn), [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html), [react.dev](https://react.dev/learn), [React 19](https://react.dev/blog/2024/12/05/react-19), [React Compiler](https://react.dev/learn/react-compiler), [INP](https://web.dev/articles/inp), [WebAuthn guide](https://webauthn.guide), [patterns.dev](https://www.patterns.dev), [TanStack Query](https://tanstack.com/query/latest), [Next.js Learn](https://nextjs.org/learn), [Nuxt rendering](https://nuxt.com/docs/guide/concepts/rendering), [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org), [Vitest](https://vitest.dev), [Playwright](https://playwright.dev), [Micro Frontends – Fowler](https://martinfowler.com/articles/micro-frontends.html), [Module Federation](https://module-federation.io) |
| DSA | [NeetCode roadmap](https://neetcode.io/roadmap), [MIT 6.006](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/), [Tech Interview Handbook](https://www.techinterviewhandbook.org) |
| Xu hướng (Radar hằng tháng) | [Thoughtworks Technology Radar](https://www.thoughtworks.com/radar), [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/) |
| AI | [Karpathy Zero to Hero](https://karpathy.ai/zero-to-hero.html), [HF LLM Course](https://huggingface.co/learn/llm-course), [HF Agents Course](https://huggingface.co/learn/agents-course), [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [.NET AI docs](https://learn.microsoft.com/en-us/dotnet/ai/), [DeepLearning.AI short courses](https://www.deeplearning.ai/short-courses/), [Hamel: Evals](https://hamel.dev/blog/posts/evals/) + [FAQ](https://hamel.dev/blog/posts/evals-faq/) + [Field guide](https://hamel.dev/blog/posts/field-guide/), [Anthropic: Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Langfuse](https://langfuse.com/docs), [Microsoft.Extensions.AI](https://learn.microsoft.com/en-us/dotnet/ai/microsoft-extensions-ai), [Lethal trifecta – Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/), [Durable execution – Temporal](https://temporal.io/blog/what-is-durable-execution), [OWASP GenAI](https://genai.owasp.org), [MCP](https://modelcontextprotocol.io), [pgvector](https://github.com/pgvector/pgvector), [Google Colab](https://colab.research.google.com) |

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
