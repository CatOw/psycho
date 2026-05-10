# Psychometry Hebrew Webapp POC

Mobile-first static webapp POC for studying and practicing the extracted Hebrew vocabulary material.

This is the completed web POC before the Android phase. It currently exposes only the Hebrew section. There is no backend, account system, build step, sync, or non-Hebrew section.

## Data Files

The app uses JSONL only:

```text
data/
  dictionary_entries.jsonl
  practice_questions.jsonl
```

The UI does not rely on CSV, SQLite, extraction scripts, reports, or intermediate extraction artifacts.

The implementation plan for the mobile-first POC is tracked at `docs/mobile_webapp_plan_for_codex.md`.

## Implemented Features

- Hebrew section only.
- Study and Practice tabs.
- Mobile-first app shell with persisted dark/light theme toggle.
- JSONL loading and client-side validation.
- Hebrew Study mode with dictionary cards, unit filter, examples-only toggle, nikud-insensitive search, shuffle, and reset order.
- Practice setup with question type, unit, difficulty, mode, numeric question count, Use all, and dynamic timing controls that preserve hidden settings.
- Practice question and answer order settings for deterministic default order or randomized session order.
- Practice settings persisted in `localStorage`.
- Untimed practice mode with one question at a time, large answer buttons, immediate feedback, and next-question flow.
- Per-question timed practice with reset-per-question countdown, timeout handling, immediate feedback, and next-question flow.
- Simulation mode with one total timer, delayed feedback, manual submit, auto-submit on timeout, results, and review.
- Active session end controls, non-simulation results summaries, and simulation review filters/jump chips.
- Dictionary lookup bottom sheet after answering or during simulation review by tapping Hebrew words.
- Hebrew RTL rendering and niqqud/dagesh normalization safeguards.

## Known Limitations

- Web POC only; the Android app comes next.
- Data is local JSONL only; there is no sync or backend.
- Difficulty exists in the app model, but the current extracted data has no difficulty labels.
- All current practice questions are treated as `undefined` difficulty.
- Easy, medium, and hard remain in the UI/model for future real difficulty data.

- Simulation is sequential-only.
- Dictionary lookup is basic single-word lookup, not full idiom or phrase lookup.
- Math, English, user accounts, progress tracking, and spaced repetition are not implemented.

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
