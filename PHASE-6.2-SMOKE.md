# Phase 6.2 — Quiz Frontend Smoke

Manual verification checklist for the quiz player at `/learn/quizzes/[slug]`.
Run against the DDEV backend with the demo seeder applied. Login as an
enrolled student before each recipe (see `student.bohdan` in the demo).

## Prerequisites

- Backend running (`ddev start` in `backend/`).
- Frontend running (`npm run dev` in `frontend/`).
- DevTools open with Network tab filtered to `quizzes`.
- A `vl_quiz` exists at a known slug (e.g. `gp-c1-quiz`) and the student
  is enrolled in its parent course.

```sh
QUIZ_SLUG="gp-c1-quiz"
URL="http://localhost:3000/learn/quizzes/$QUIZ_SLUG"
```

---

## 1. Cold start

1. Navigate to `URL`.
2. Player renders with question 1 selected (or the first unanswered if
   prior partial state exists).
3. Top-right shows the timer (or the unlimited badge `∞` when
   `time_limit_seconds=0`).
4. Network shows exactly one `POST /vl/v1/quizzes/{slug}/attempts`
   responding 201.

## 2. Idempotent resume

1. From a mid-attempt state, refresh the page.
2. Expect the same `attempt.id` in the response.
3. Status code is 200, not 201.
4. Saved answers are restored — selected radio / checkbox / typed text
   matches what was there.
5. Timer continues from `time_remaining_seconds` server-supplied at request
   time; the displayed mm:ss matches the response within ~1 s.

## 3. Save radio (single_choice)

1. On a `single_choice` question, click an option.
2. UI shows "Збереження…" indicator briefly.
3. Network shows one `PATCH /vl/v1/quizzes/attempts/{id}/answers/{qid}`
   with the response body containing `expired: false` and the answer.
4. The dot for that question turns brand-coloured.

## 4. Save text with debounce

1. On a `text` question, start typing.
2. Confirm no PATCH fires while typing fast.
3. Pause typing for ~1.5 s — exactly one PATCH fires.
4. Resume typing within 1.5 s — debounce resets, no PATCH yet.
5. Click outside the textarea (blur) — a flush PATCH fires immediately
   with the latest text.

## 5. Prev/next flush

1. On a `text` question, type and within 1.5 s click "Наступне".
2. A flush PATCH fires before the index changes.
3. Verify the network panel shows the PATCH preceding any subsequent
   activity.

## 6. All-correct submit

1. Answer every question correctly.
2. Click "Завершити quiz".
3. Modal does NOT appear (all answered).
4. `POST /vl/v1/quizzes/attempts/{id}/submit` fires.
5. Page pivots to results: green check, `passed=true`, full score.
6. Per-question review section renders with green markers (assuming
   `_vl_quiz_show_correct_answers=after_submit`).

## 7. Partial submit confirm

1. Leave at least one question unanswered.
2. Click "Завершити quiz".
3. Modal opens with the count: "Ви відповіли на N з M запитань. Завершити
   quiz?".
4. Click "Продовжити" — modal closes, no submit fires.
5. Click "Завершити quiz" again, then confirm in the modal.
6. Submit fires; results render. `passed` is whatever the score yields.

## 8. Time-limit auto-expire (deferred-verifiable)

1. Set `_vl_quiz_time_limit_seconds=30` on the demo quiz CPT.
2. Reload `URL`.
3. Wait 30 s without answering or closing the tab.
4. Client timer hits 0, fires `submit()`. Page pivots to results with
   `status=expired`.

   Alternative reproduction (faster): start the attempt, then run on
   DDEV `wp db query "UPDATE wp_vl_quiz_attempts SET started_at =
   DATE_SUB(UTC_TIMESTAMP(), INTERVAL 100 SECOND) WHERE id=<id>"`, then
   PATCH any answer in the UI — the next save returns
   `409 attempt_expired` and the store pivots to results.

## 9. Reveal policy `after_pass`, failed

1. Configure a quiz with `_vl_quiz_show_correct_answers=after_pass`.
2. Submit a failing attempt.
3. Verify each incorrect answer shows the ❌ marker but no "правильна
   відповідь:" text and no explanation.
4. The "Правильна відповідь прихована" copy appears below answered
   questions.

## 10. Reveal policy `after_pass`, passed

1. Same quiz; pass it.
2. Verify the correct answer markers and explanations are visible.

## 11. Logout clears state

1. Mid-attempt, log out via header / nav.
2. Log in as a different user (`student.olena` in demo, or any second
   student).
3. Navigate to the same `URL`.
4. A fresh attempt is started (new `attempt.id` in the response).
5. No cross-user state leaks (no saved answers from the prior account).

## 12. Attempts-exhausted lockout

1. Set `_vl_quiz_max_attempts=1` on the quiz CPT.
2. Submit one attempt.
3. On the results screen, click "Спробувати ще".
4. A toast appears with "Кількість спроб вичерпано".
5. The page stays on the previous results — no error screen, no
   navigation.

---

## Toolchain

From `frontend/`:

```sh
npm run lint
npm run typecheck
npm run dev
```

All three should run clean.
