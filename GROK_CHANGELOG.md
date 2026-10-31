# Grok migration

All AI generation now uses Grok through the xAI Chat Completions compatibility endpoint. Native fetch replaces the Google SDK; no new production dependency is added. Zod validation, evidence checks, one malformed-output retry, ownership and usage limits remain. Requests have a 25-second timeout combined with the quick-plan cancellation signal. Provider errors are mapped to safe messages; credentials and raw error bodies are not returned. Existing data is unchanged; new chats record the configured model, while historical chat metadata is preserved.

Set XAI_API_KEY and XAI_MODEL in .env and restart the server. The template defaults to grok-4.7; select a model available to your xAI account. Old GEMINI_* entries are ignored. Never put the key in a VITE_* variable. Brevo SMTP configuration is independent and unchanged.

## Verification

All 48 tests, TypeScript validation and production build passed. Six provider-focused tests cover server authentication/request shape, missing credentials, safe HTTP failures, malformed JSON/schema retry, empty/truncated responses and cancellation. Existing pipeline and feedback tests now use Grok-shaped mocked responses. Live Grok credentials, latency and billing have not been tested. Earlier screenshot and browser checks predate this backend migration.

## Jury positioning

The model generates language; the application persists syllabus structure and assessment evidence, deterministically updates study tasks and review dates, and exposes measured progress. Generic assistants may offer memory/files/reminders too. Demonstrate the connected workflow rather than claiming exclusive model capabilities. No original model training or validated exam-score prediction is claimed.

## Changed files

| Full path | One-line explanation |
|---|---|
| `/workspace/scratch/3acea0dbcacf/study-sniper/.env.example` | Replace Gemini settings with server-only XAI_API_KEY and XAI_MODEL. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/README.md` | Describe Grok configuration, provider boundaries and the updated verification count. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/docs/DEMO_SCRIPT.md` | Update the provider setup and tested-count narration. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/docs/JURY_QA.md` | Explain provider-independent value and update the implemented stack. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/package-lock.json` | Lock the dependency graph after Google SDK removal. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/package.json` | Remove the unused Google AI SDK without adding a dependency. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/agents/pipeline.ts` | Use the provider-neutral AI service and xAI configuration. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/config.ts` | Read XAI_MODEL with a documented Grok default. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/routes/chat.ts` | Use the Grok adapter and record the configured model for new chats. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/routes/coding.ts` | Use the provider-neutral AI service and xAI configuration. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/routes/documents.ts` | Use Grok for answers and optional summaries when the xAI key is configured. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/routes/flashcards.ts` | Use the provider-neutral AI service and xAI configuration. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/routes/notes.ts` | Use the provider-neutral AI service and xAI configuration. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/routes/quiz.ts` | Use the provider-neutral AI service and xAI configuration. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/routes/studyPlan.ts` | Use the provider-neutral AI service and xAI configuration. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/services/ai.ts` | Use native fetch for Grok with timeouts, safe errors, Zod validation and bounded retry. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/server/services/gemini.ts` | Remove the Gemini adapter and unused streaming helper. (Deleted) |
| `/workspace/scratch/3acea0dbcacf/study-sniper/tests/agents.test.ts` | Update mocked responses and credentials to the Grok transport contract. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/tests/ai.test.ts` | Add six provider-specific transport, error, validation and cancellation tests. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/tests/progress.test.ts` | Update mocked responses and credentials to the Grok transport contract. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/tests/security.test.ts` | Update mocked responses and credentials to the Grok transport contract. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/GROK_CHANGELOG.md` | Record migration scope and complete changed-file evidence. |
| `/workspace/scratch/3acea0dbcacf/study-sniper/GROK_FULL_CHANGED_FILES.md` | Record migration scope and complete changed-file evidence. |
