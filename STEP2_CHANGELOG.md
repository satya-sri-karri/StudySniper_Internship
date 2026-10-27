# Step 2 change log

Scope: security and reliability fixes to the uploaded implementation. The actual stack remains React 19, Express 4, JSON persistence and Gemini. MongoDB/Claude migration and the full agent pipeline remain subsequent work.

## Fix coverage

| Severity | Problem | Resolution |
| --- | --- | --- |
| Critical | Email-only Google impersonation, fallback JWT secret, exposed verification codes | Verified Firebase tokens, required secret, private hashed OTPs and mandatory verification |
| High | Cross-user chat access and session reuse after logout/deletion | Ownership checks, account verification and token-version revocation |
| High | Unvalidated requests, unbounded provider usage and hidden async errors | Runtime schemas, body/rate/concurrency limits, deadlines and centralized errors |
| High | Fabricated uploads/AI output and client-controlled quiz scoring | Actual bounded parsers, validated source evidence, no fake fallback and server grading |
| High | Unsafe persistence and broken password/account flows | Atomic writes, writer lock, fail-closed recovery and real account mutations |
| High | Vulnerable production dependencies | Nodemailer 10.2.1 and transitive gRPC 1.14.6 via compatible override |
| Medium | Blank/loading failures, unsafe printable HTML and heavy initial bundle | Shared states, escaped output and lazy-loaded views/parsers |

## Validation

- TypeScript check, all 21 regression tests, frontend/backend production build and HTTP production smoke checks passed.
- Production smoke covers startup, frontend, CSP headers, health, API 404, source isolation and demo disabled in production.
- Production npm audit result: {"info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0}. This is registry advisory coverage, not a guarantee of absence of vulnerabilities.
- External SMTP, Firebase and Gemini calls were mocked; live credential checks remain required.
- Browser visual/mobile QA could not be completed because the available browser runtime failed to start.

## Deliberate limits

Single-process JSON storage remains; no multi-replica deployment. Basic keyword retrieval and quote validation do not guarantee semantic accuracy. Free-text grading remains normalized exact matching. Adaptive mastery, readiness scores, spaced-repetition due queues, proactive reminders and the multi-agent flow are not delivered in Step 2.

## Changed files

Every path below is the complete workspace source path. Full contents are included in `STEP2_FULL_CHANGED_FILES.md`; the complete dependency lockfile is supplied as `package-lock.json`.

| Full path | Change |
| --- | --- |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/.env.example` | Document all server, mail, AI, Firebase and demo configuration without secrets. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/.gitignore` | Exclude secrets, runtime databases, dependencies and build outputs. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/README.md` | Describe actual stack, secure setup, production operation and remaining feature limitations. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/package-lock.json` | Pin the complete npm dependency tree for reproducible installation. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/package.json` | Add validation and test/build scripts; update Nodemailer and override vulnerable transitive gRPC. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/scripts/seed-demo.ts` | Create isolated synthetic demo records with generated credentials. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/app.ts` | Apply security headers, body limits, request quotas and centralized errors. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/config.ts` | Load environment configuration and reject missing or example JWT secrets. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/db.ts` | Use atomic persistence, writer locking, rollback and safe account serialization. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/http.ts` | Forward synchronous and asynchronous route failures to error middleware. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/middleware/auth.ts` | Verify signed token claims, active verified accounts and session revocation. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/auth.ts` | Enforce verified identities, real password changes and authenticated account deletion. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/chat.ts` | Enforce conversation ownership and truthful streaming error handling. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/coding.ts` | Use the common asynchronous error wrapper. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/dashboard.ts` | Return owner-scoped activity statistics with consistent errors. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/documents.ts` | Validate extracted uploads and return source-grounded answers and citations. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/flashcards.ts` | Require owned source documents and validate generated cards and reviews. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/notes.ts` | Validate note inputs and stop persisting fabricated provider fallback content. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/quiz.ts` | Keep answer keys private until submission and grade answers on the server. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/studyPlan.ts` | Validate exam dates, daily availability and generated plan constraints. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/services/authSecurity.ts` | Protect OTPs with keyed hashes, expiration, attempt limits and resend cooldowns. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/services/demo.ts` | Generate isolated synthetic study fixtures only when demo access is enabled. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/services/firebase.ts` | Validate Google identity against Firebase and the configured project. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/services/gemini.ts` | Bound provider calls, validate JSON with retries and reject fabricated fallbacks. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/services/mailer.ts` | Require configured SMTP with TLS checks and safe delivery errors. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/services/retrieval.ts` | Retrieve relevant chunks from owned source text using keyword matching. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/validation.ts` | Centralize request and AI-output schemas with bounded fields. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server.ts` | Serve separate production frontend/backend builds with explicit startup failures. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/App.tsx` | Lazy-load study views and provide render/loading boundaries. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/auth/AuthModal.tsx` | Use verified authentication flows and remove exposed OTP/demo shortcuts. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/common/ErrorBoundary.tsx` | Display recoverable UI errors instead of a blank screen. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/common/Header.tsx` | Remove simulated reminder notifications. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/common/LoadState.tsx` | Provide reusable loading, empty and error messages. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/common/Sidebar.tsx` | Handle logout failures visibly. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/common/SourceSelect.tsx` | Select an owned uploaded document for grounded generation. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/common/Toast.tsx` | Support consistent visible feedback messages. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/dashboard/DashboardOverview.tsx` | Handle request failures and label study-hour estimates honestly. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/documents/DocumentsView.tsx` | Parse real uploads and show source evidence, progress and errors. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/flashcards/FlashcardsView.tsx` | Require sources and show generation/review loading and failure states. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/landing/LandingPage.tsx` | Align product claims with implemented behavior. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/notes/NotesView.tsx` | Escape printable content and expose generation/loading failures. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/planner/StudyPlannerView.tsx` | Use future exam defaults and visible validation/save errors. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/quiz/QuizGeneratorView.tsx` | Collect typed answers and display server-authoritative grading. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/settings/SettingsView.tsx` | Connect password changes and confirmed account deletion to real APIs. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/tutor/AiTutorView.tsx` | Handle stream failures and reconcile saved message identities. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/context/AuthContext.tsx` | Maintain server-authoritative sessions and handle expiration/revocation. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/lib/firebase.ts` | Read optional Firebase browser configuration from environment variables. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/services/api.ts` | Centralize bounded requests, structured API errors and expired-session handling. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/types/index.ts` | Represent validated authentication, source and quiz result contracts. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/utils/documentParser.ts` | Parse actual text/PDF/Office sources with size and archive-expansion limits. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/vite-env.d.ts` | Declare Vite environment typing. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/tests/parser.test.ts` | Cover real text parsing, unsupported inputs, archive limits and output schemas. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/tests/security.test.ts` | Exercise auth, ownership, persistence, grading, validation and provider boundaries. |

## Release exclusions

- `/workspace/scratch/3acea0dbcacf/study-sniper-audit/bun.lock` — Superseded by the npm lockfile and documented npm workflow.
- `/workspace/scratch/3acea0dbcacf/study-sniper-audit/firebase-applet-config.json` — Unused legacy configuration replaced by environment configuration.
- `/workspace/scratch/3acea0dbcacf/study-sniper-audit/data/db.json` — Original account hashes and study history excluded from distribution; original upload remains unchanged.

Build outputs and dependencies are regenerated with `npm ci` and `npm run build`. No credentials are bundled.
