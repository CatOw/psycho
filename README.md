# Psychometry Hebrew Webapp POC

Mobile-first static webapp POC for studying and practicing the extracted Hebrew vocabulary material.

This is still the webapp validation phase, not the Android app. There is no backend, account system, build step, or non-Hebrew section yet.

## Data Files

The app uses JSONL only:

```text
data/
  dictionary_entries.jsonl
  practice_questions.jsonl
```

The UI does not rely on CSV, SQLite, extraction scripts, reports, or intermediate extraction artifacts.

The implementation plan for the mobile-first POC is tracked at `docs/mobile_webapp_plan_for_codex.md`.

## Implemented In This Pass

- Hebrew section only.
- Study and Practice tabs.
- Mobile-first app shell with persisted light/dark theme.
- JSONL loading and client-side validation.
- Hebrew Study mode with dictionary cards, unit filter, examples-only toggle, nikud-insensitive search, shuffle, and reset order.
- Practice setup with question type, unit, provisional difficulty, mode, numeric question count, Use all, and dynamic timing controls that preserve hidden settings.
- Practice settings persisted in `localStorage`.
- Untimed practice mode with one question at a time, large answer buttons, immediate feedback, and next-question flow.
- Per-question timed practice with reset-per-question countdown, timeout handling, immediate feedback, and next-question flow.
- Simulation mode with one total timer, delayed feedback, manual submit, auto-submit on timeout, results, and review.
- Active session end controls, non-simulation results summaries, and simulation review filters/jump chips.
- Dictionary lookup bottom sheet after answering or during simulation review by tapping Hebrew words.
- Hebrew RTL rendering and niqqud/dagesh normalization safeguards.

Difficulty is currently provisional:

```text
units 1-7   -> easy
units 8-14  -> medium
units 15-20 -> hard
```

## Not Implemented Yet

- Android app.
- Math, English, or other sections.
- Backend storage or sync.
- Progress tracking or spaced repetition.
- Free navigation inside active simulation; this POC uses sequential simulation questions.

## Validation Expectations

The app logs validation results to the browser console and shows a warning banner if validation fails.

Expected dictionary data:

- 2,000 rows.
- 20 units.
- 100 entries per unit.
- unresolved `needs_review` count = 0.
- global `1615` / unit `17` / entry `15` may have `example = ""`; this is source-accurate and not an error.

Expected practice data:

- 640 questions.
- 20 units.
- 4 exercise types per unit.
- 8 questions per exercise type per unit.
- unresolved `needs_review` count = 0.
- `U06-D-04` correct answer text is exactly `טירה`.

## Run Locally

From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

On Windows, if `python3` is not available:

```powershell
python -m http.server 8000
```

Use browser devtools device emulation around 360-430px wide to test the phone UI.
