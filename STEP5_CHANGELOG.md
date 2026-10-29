# Step 5 — UX and demo

Implemented one-click syllabus upload → validated parser → analyzer → planner → saved timetable. The quick path skips optional source summarization and keeps completed stages on failure. The UI uses a 55-second deadline; server AI work has a maximum 50-second budget. Actual completion depends on the provider, file parsing and network; no live sub-minute guarantee is claimed.

The isolated, clearly labeled demo includes six weighted networking topics, three historical mocks, weak and unassessed topics, a missed task, completed work, six revision cards, notes and a saved quiz that updates mastery without an API key. New AI generation still needs a key. Run with ENABLE_DEMO=true in development; the existing seed CLI also creates a random-password account. Stop the single-process server before running the seed.

Planner surfaces now support light/dark styling, keyboard focus and reduced-motion preferences. The quick flow is primary; advanced controls remain available. No dependencies were added.

## Verification

- All 42 tests passed, including malformed-output retries, ownership, quick planning, preserved progress after a deadline, demo quiz feedback and skipped upload summarization.
- TypeScript validation, production build and production HTTP smoke passed.
- Chromium: dashboard, prebuilt demo plan, one-click text upload and generated timetable, and saved quiz navigation passed. At 390px viewport there was no page overflow; no JavaScript page errors occurred.
- Mocked provider browser flow completed in 129ms. This measures orchestration only, not live AI performance.
- Seed CLI was executed against a temporary database and produced six-topic demo data with a hashed random password.
- Live Gemini, SMTP and Firebase credentials were not exercised. Existing JSON persistence and Gemini provider are preserved.

## Every changed file

| Full path | One-line explanation |
|---|---|
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/README.md` | Document quick planning, time limits, demo setup and seed safety. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/agents/pipeline.ts` | Propagate cancellation through parser, analyzer and planner. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/app.ts` | Apply existing AI quotas to the quick-plan endpoint. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/db.ts` | Persist and expose an explicit synthetic demo-account marker. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/agents.ts` | Chain validated planning stages with a deadline and resumable saved progress. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/routes/documents.ts` | Allow quick uploads to skip a redundant AI summary. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/services/demo.ts` | Seed six weighted topics, historical mocks, missed work, due reviews and an offline graded quiz. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/services/gemini.ts` | Abort bounded generation and reject output received after cancellation. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/server/validation.ts` | Validate the optional upload summary flag. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/App.tsx` | Show an explicitly labeled demo walkthrough inside the workspace. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/dashboard/DashboardOverview.tsx` | Link the primary dashboard action to syllabus planning. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/dashboard/DemoGuide.tsx` | Offer four demo navigation shortcuts and disclose synthetic history. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/landing/LandingPage.tsx` | Align feature descriptions with grounded answers and fixed review intervals. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/planner/PlanActions.tsx` | Improve light-mode contrast for timetable controls and messages. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/planner/QuickPlan.tsx` | Add one-click file upload and planning with elapsed time, cancellation and demo-plan access. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/components/planner/SyllabusAgentPanel.tsx` | Place quick planning first and retain advanced saved-source and topic practice controls. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/index.css` | Add visible keyboard focus and reduced-motion support. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/src/types/index.ts` | Type the demo marker for client rendering. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/tests/agents.test.ts` | Test linked one-request planning, validation and deadline recovery. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/tests/security.test.ts` | Test realistic seed feedback and summary-free uploads without provider calls. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/STEP5_CHANGELOG.md` | Record scope, validation, limitations and every changed path. |
| `/workspace/scratch/3acea0dbcacf/study-sniper-audit/STEP5_FULL_CHANGED_FILES.md` | Provide complete source contents for every changed implementation, test and README file. |
