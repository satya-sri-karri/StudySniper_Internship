# StudySniper — ten likely jury questions

## 1. Why should I use this instead of ChatGPT or Claude?

General assistants can explain content, use files and offer memory or scheduling capabilities. Our value is a purpose-built exam workflow: each syllabus topic is linked to its deadline, tasks, results, mastery and review date. A weak result automatically changes the saved plan without asking the student to copy it into another prompt. The defensible claim is integrated execution and inspectable state—not that general assistants could never reproduce these features.

**Show:** Generate a quiz from your own uploaded notes, submit it, then inspect readiness and the updated timetable.

**Short spoken answer:** “Yes, Grok can generate an explanation or a plan. We use it for that capability. Our contribution is the system around it: a persistent syllabus model, validated scheduling, graded evidence linked to topics, and automatic updates to the next study action. The model can be replaced; the student’s learning workflow remains.”

## 2. Is this really multi-agent, or just several prompts?

It is a staged agent pipeline: parser, analyzer, planner and coach/evaluator have distinct responsibilities and runtime output contracts. They use the same configured Grok model. We do not claim independently trained models or an autonomous agent society. The engineering value is schema validation, evidence checks, bounded retries and persisted intermediate stages, which make failures recoverable.

**Evidence:** `server/agents/pipeline.ts`, `server/agents/schemas.ts`, `server/routes/agents.ts`.

## 3. How do you stop hallucinations and answers outside the syllabus?

We select an account-owned document, split its text into overlapping chunks and rank matches by query keywords. Grounded generation uses retrieved passages; supporting quotes must exist in the supplied source. Insufficient matches or unsupported evidence fail visibly. This reduces unsupported output, but a valid quote does not prove the interpretation is correct. Keyword retrieval can also miss synonyms. Semantic retrieval and evaluation against a labeled question set are future improvements.

**Evidence:** `server/services/retrieval.ts` and quote checks in generation schemas/pipeline code. No embeddings or vector database are currently used.

## 4. What exactly is remembered? Does your tutor remember all previous conversations?

The database persists each account's sources, timetables, completed work, assessment history, topic mastery, review dates and reminders. Saved chat history is available to the learner, but each tutor question is independently retrieved against its selected source; we do not claim full conversational reasoning over all prior messages. Persistent structured learning state is the core memory used by the scheduler.

**Show:** Reload after grading and inspect the same topic result and plan.

## 5. How does adaptive replanning work, and what if there is not enough time?

The initial plan comes from validated AI output. Subsequent rebalancing is deterministic. It preserves completed tasks, orders remaining work by deadline, lower mastery and higher priority, and fills available time. A score below 70% adds up to 30 minutes of reinforcement, with at most one pending reinforcement task for that topic. Missed-day maintenance runs at startup, each minute and on relevant requests. Overflow remains visibly Unscheduled rather than disappearing. Capacity is per timetable; cross-plan global allocation is not implemented.

**Evidence:** `server/services/learning.ts`, `server/services/progress.ts`.

## 6. Can you justify the readiness score scientifically?

It is a transparent heuristic, not a scientifically validated exam predictor. Mastery is the latest-five-result mean. Readiness discounts limited evidence through an attempt factor and overdue revision by 15%, then combines topics using syllabus percentages or estimated importance. Unassessed topics count as zero. This makes the metric explainable and useful for prioritization, but question difficulty, repeated exposure and grading quality can bias it. A future student pilot should compare it with unseen-question performance before making learning-outcome claims.

**Example:** With mastery 80%, one attempt and no overdue review, topic readiness is about 53%; with three attempts it is 80%. Being overdue reduces the latter to 68%.

## 7. Why use these spaced-repetition intervals? Are reminders truly proactive?

We implemented a simple, inspectable 1/3/7/14/30-day sequence. Successful review advances it, difficulty resets it, and same-day repeats cannot accelerate it. We have not calibrated the intervals per learner or claimed an optimized memory model. The running server maintains due-work reminders without a new chat prompt, but delivery is currently in-app. There is no email/push reminder service. The calendar export is a snapshot users import themselves.

**Show:** Review a due topic and reopen the queue; inspect the notification bell.

## 8. How do you protect accounts, uploaded notes and API keys?

JWT authentication and ownership checks guard study records. Passwords are hashed, email accounts require OTP verification, and session versions support revocation. Request schemas, upload/extraction limits, AI rate limits and concurrency limits constrain abuse. Private AI keys and JWT secrets stay on the server. Relevant retrieved notes are sent to the configured AI provider for generation, so we cannot claim all content stays on the device or end-to-end encryption. Deployment still needs HTTPS, protected storage, backups and an appropriate provider/data policy.

**Evidence:** `server/middleware/auth.ts`, `server/validation.ts`, `server/routes/`, `.env.example`. Security checks do not imply that no vulnerabilities remain.

## 9. Can it scale, and what happens if AI fails or is expensive?

This release is deliberately a single-process prototype with atomic JSON storage and writer locking; it is not ready for multiple replicas. AI work has bounded attempts, timeouts and per-user quotas. Saved stages avoid repeating completed work, and deterministic replanning needs no extra model call. The quick flow has a 55-second client deadline, not a guaranteed completion time. For scale we would migrate to a transactional database, distributed quotas and durable background jobs, then load-test. We have not measured per-user cost with live usage.

**Show:** Saved progress after a failed stage; the demo's saved quiz and learning loop work without an AI key.

## 10. What have you actually validated, and what is your next milestone?

The implementation passed 48 regression tests covering security, parsing, pipeline validation and learning behavior, plus TypeScript, build, startup and browser smoke checks. Browser checks included a 390px viewport and found no page errors or page overflow on the tested path. AI responses in automated checks were mocked; live Grok, SMTP and Firebase credentials remain unverified. Seed history is explicitly synthetic. Our next milestone is a small consented student pilot measuring plan completion, missed-work recovery and performance on unseen questions, alongside live-provider latency and cost. No improved-marks percentage is claimed today.

**Evidence:** `tests/`, `STEP5_CHANGELOG.md`. The actual shipped stack is React 19, Express, Grok and JSON persistence, not the MongoDB/Claude migration from the original brief.
