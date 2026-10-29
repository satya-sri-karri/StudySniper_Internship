# StudySniper — three-minute jury demo

## Prepare before the clock starts

Run the development server with `ENABLE_DEMO=true` and a valid `JWT_SECRET`. Open Sign In → **Open isolated demo account** and wait for the dashboard. Use a fresh account for each rehearsal so its quiz and history are predictable. Keep the browser at desktop width and dismiss unrelated dialogs.

This route needs no AI or email credentials after local setup. The dataset is synthetic; the grading, state updates and replanning demonstrated are real application behavior. The prebuilt plan is not a live-generated plan. Do not spend the three-minute slot waiting for a provider call.

## Timed presentation

### 0:00–0:20 — The problem

**Screen:** Dashboard and amber Demo workspace banner.

**Say:** “A chatbot can explain a chapter and draft a timetable. But after I miss a day or fail a quiz, I still have to reconnect my syllabus, results and remaining time. StudySniper keeps those records together and turns performance into the next study action. This is a labeled synthetic demo workspace.”

### 0:20–0:50 — Syllabus to persistent plan

**Click:** **1 · Inspect the plan** → **Open prebuilt demo plan**. Show the six topics, source evidence and timetable. Point to the quick-upload form without submitting it.

**Say:** “A student uploads a syllabus, selects an exam date and available hours, then clicks once. Parser, analyzer and planner stages produce validated data and a saved timetable. Here is the prebuilt networking example. Its missed task has been reallocated, completed work is retained, and source evidence stays linked to the topics.”

**Observe:** The timetable may already be rebalanced on first load; show its saved update reason rather than claiming the missed day happens live.

### 0:50–1:30 — Produce a weak result

**Click:** **2 · Take the saved quiz** → open **Demo: TCP recovery quiz**.

- Question 1: select **TCP**, then **Next**.
- Question 2: type **timeouts**, then **Next**. This is intentionally incorrect for the question asking how delivery is confirmed.
- Question 3: select **DNS resolution**, then **Submit Quiz**. This is intentionally incorrect; the correct answer is retransmissions.

**Say:** “I will deliberately get two answers wrong. This saved quiz is graded on the server without an AI call. The result is linked to TCP's topic ID. It becomes part of the latest-five-result mastery average and schedules focused reinforcement because the score is below seventy percent.”

**Observe:** The score is **33%**, one correct out of three. Review the explanations rather than presenting the intentional wrong answers as facts.

### 1:30–2:00 — Show the feedback loop

**Click:** **3 · Check readiness**. Inspect TCP's attempts and readiness; then **1 · Inspect the plan** → **Open prebuilt demo plan** and inspect its replan reason/tasks.

**Say:** “The dashboard now reflects the new TCP evidence. Unassessed topics still contribute zero, so a single easy quiz cannot imply full syllabus coverage. The timetable has added bounded weak-topic practice and redistributed pending work within the available hours. Readiness is an explained heuristic, not a prediction of exam marks.”

**Observe:** TCP mastery starts at 40% in a fresh seed and becomes 38% after this attempt. Overall readiness need not decrease: submitting also refreshes an overdue review, which can offset a lower mastery score. Show the formula and actual values; do not promise a particular overall percentage.

### 2:00–2:30 — Revision and follow-through

**Click:** **4 · Review due topics**; mark a due topic **Reviewed**. Open the header **Notifications** bell. Close it, return to the plan and click **Export calendar (.ics)**.

**Say:** “Revision follows fixed one, three, seven, fourteen and thirty-day intervals. Self-review changes the review date, not the mastery score. Due-work reminders persist inside the app. This calendar file can be imported into Google Calendar; it is a snapshot, not live synchronization.”

### 2:30–3:00 — Close with evidence

**Click:** **3 · Check readiness**, reload the page and show that the saved results remain.

**Say:** “The differentiator is this closed loop: syllabus, plan, attempt, evidence, revised plan and next review. It survives a page reload and does not require another prompt to connect the records. The current prototype passed forty-two tests. It uses Gemini and single-process JSON storage; live-provider performance and learning gains are not yet validated. Our next milestone is a student pilot and scalable persistence.”

## If asked for live AI generation

Outside the timed route, configure `GEMINI_API_KEY`, upload a small readable syllabus with explanatory notes, select a future exam date and click **Upload & create my plan**. The target is under a minute, with a 55-second client deadline. If it times out, show saved progress and resume the pending stage; do not claim the prebuilt plan was generated live. Scanned PDFs require external OCR.

For source grounding, open the tutor, select the networking document and ask “How does TCP provide reliable delivery?” Show the supporting excerpt. If the provider is unavailable, inspect the saved source quotes and explain that new answer generation is unavailable; do not substitute a fabricated response.

## Rehearsal checks

Confirm the saved quiz has not already been submitted in this fresh account, rehearse the navigation at your actual display size, and allow the download permission for `.ics`. If the same quiz is retried with identical answers on the same UTC day, deduplication may intentionally prevent another mastery update. Open a fresh isolated demo account instead of modifying stored records.
