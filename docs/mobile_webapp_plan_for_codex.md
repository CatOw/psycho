# Codex Implementation Plan: Mobile-First Psychometry Webapp POC

## Purpose

Build a mobile-first webapp POC for studying and practicing extracted psychometry Hebrew vocabulary material.

This is still a webapp phase, not the Android app phase yet. The goal is to validate UX, flows, data structure, practice behavior, timings, and Hebrew rendering on a phone-sized UI before moving to Android.

The app should be optimized for a phone viewport. I will test it using a browser user-agent/device switcher. Design for mobile first; desktop support can be minimal/responsive, but phone UX is the priority.

## Existing data files

Use JSONL only.

Expected structure:

```text
data/
  dictionary_entries.jsonl
  practice_questions.jsonl
```

Do not rely on:
- CSV files
- SQLite files
- extraction scripts
- temporary files
- validation reports
- old debug artifacts

## App scope

The app should have a section system, but only expose one section for now:

```text
Sections
└── Hebrew
    ├── Study
    └── Practice
```

Do not create visible Math, English, or other future sections yet.

The code may be structured so future sections can be added later, but the UI should currently show only Hebrew.

## Mobile-first UI requirements

Design primarily for phone screens.

Target assumptions:
- Width around 360-430px
- Touch input
- One-handed scrolling
- Large tap targets
- Minimal clutter
- Sticky navigation where useful
- RTL Hebrew content should be easy to read

General mobile UI rules:
- Use a single-column layout.
- Avoid wide tables in the main study/practice experience.
- Use cards, bottom sheets, drawers, or accordions instead of large tables.
- Buttons and option rows should be easy to tap.
- Use sticky top navigation or bottom tab navigation.
- Keep study/practice flows clear and simple.
- Avoid hover-only interactions.
- Make feedback visible without requiring horizontal scrolling.

Suggested app shell:

```text
[Top app bar]
Hebrew

[Segmented tabs]
Study | Practice

[Content area]
Mobile cards / setup screens / question screen
```

A bottom navigation or sticky segmented control is also acceptable:

```text
Bottom nav:
[Study] [Practice]
```

## Hebrew rendering and normalization

Hebrew display must preserve niqqud/dagesh correctly.

Use RTL display for Hebrew text:
- `lang="he"`
- `dir="rtl"`
- `unicode-bidi: plaintext`
- Hebrew-capable font stack

Suggested CSS:

```css
:root {
  color-scheme: light;
}

body {
  margin: 0;
  font-family: "Noto Sans Hebrew", "Arial Hebrew", Arial, sans-serif;
}

.hebrew {
  direction: rtl;
  unicode-bidi: plaintext;
  text-align: right;
  font-family: "Noto Sans Hebrew", "Arial Hebrew", Arial, sans-serif;
  line-height: 1.7;
}
```

Normalization rules:
- Normalize Unicode with NFC.
- Remove accidental spaces between Hebrew base letters and Hebrew combining marks.
- Remove accidental spaces between consecutive Hebrew combining marks.
- Do not remove real spaces between words after a dagesh/niqqud mark.
- Do not strip niqqud from displayed text.
- Strip niqqud only for search/matching.

Safe display normalization:

```js
function normalizeHebrewDisplay(value) {
  if (value == null) return "";

  let text = String(value).normalize("NFC");

  let previous;
  do {
    previous = text;
    text = text
      .replace(/([\u05D0-\u05EA])\s+([\u0591-\u05C7])/g, "$1$2")
      .replace(/([\u0591-\u05C7])\s+([\u0591-\u05C7])/g, "$1$2");
  } while (text !== previous);

  return text.normalize("NFC");
}
```

Nikud-insensitive normalization for search:

```js
function stripHebrewMarks(value) {
  return normalizeHebrewDisplay(value)
    .normalize("NFD")
    .replace(/[\u0591-\u05C7]/g, "")
    .normalize("NFC");
}

function normalizeForSearch(value) {
  return stripHebrewMarks(value)
    .toLowerCase()
    .replace(/[״"׳'.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

Important regression examples:
- `ב ּ` should display as `בּ`
- `בעזרת תער` must stay `בעזרת תער`
- Do not accidentally display it as `בעזרתתער`

## Data expectations

### Dictionary

Expected:
- 2,000 rows
- 20 units
- 100 entries per unit
- unresolved `needs_review` count should be 0

Important known valid empty source example:
- `global_num = 1615`
- `unit = 17`
- `entry_num = 15`
- `term = "בְׁנֶפֶש חְׁפָצָה"`
- `example = ""`
- `needs_review = false` or `0`

Do not treat this empty example as an error. The source PDF has no example for this entry.

### Practice questions

Expected:
- 640 questions
- 20 units
- 4 exercise types per unit
- 8 questions per exercise type per unit
- unresolved `needs_review` count should be 0
- `U06-D-04` correct answer text should be exactly `טירה`

Practice question types:

| Code | Hebrew | English key |
|---|---|---|
| A | השלמת משפט | sentence_completion |
| B | מילים נרדפות | synonyms |
| C | מילה והיפוכה | antonyms |
| D | יוצא דופן | odd_one_out |

## Recommended practice question object shape

Each line in `data/practice_questions.jsonl` should represent one practice question and include everything needed to render and verify it.

Recommended shape:

```json
{
  "id": "U06-D-04",
  "unit": 6,
  "exercise_type": "D",
  "exercise_type_he": "יוצא דופן",
  "exercise_type_en": "odd_one_out",
  "question_num": 4,
  "difficulty": "easy",
  "page_question": 87,
  "page_answer": 88,
  "prompt": "טירה, ...",
  "options": [
    {
      "option_num": 1,
      "text": "טירה"
    }
  ],
  "correct_option_num": 1,
  "correct_answer_text": "טירה",
  "needs_review": false,
  "notes": ""
}
```

The current extracted practice data has no real difficulty labels.
- Keep the `difficulty` field in the app model.
- Treat all current questions as `"undefined"` difficulty.
- Keep easy, medium, and hard in the UI/model for future real difficulty data.
- The UI should still support difficulty filters.
- Do not derive provisional difficulty from unit number.

## Hebrew section: Study mode

Purpose:
Browse the full dictionary in a comfortable doom-scroll style.

Mobile-first study UI:
- Search bar at the top.
- Optional collapsible filters.
- Scrollable dictionary cards.
- No table required for the main mobile experience.

Study controls:
- Search input.
- Unit filter: All, 1-20.
- Optional toggle: show only entries with examples.
- Optional toggle: show only page-spanning entries.
- Optional sort: global order, unit order.

Search behavior:
- Nikud-insensitive.
- Searches:
  - term
  - term_unpointed
  - explanation
  - example
- Preserve display text with niqqud/dagesh.

Dictionary card content:
- Term
- Explanation
- Example
- Unit and entry number
- Page start/end if useful

Example card layout:

```text
אֶבֶן מַשְׁחֶזֶת

אבן להשחזה ולחידוד של סכינים או חומרים קשים.

דוגמה:
כח פיזיקאי יודע כי על מנת להשחיז...

יחידה 1 · מילה 1 · עמוד 10
```

Empty example behavior:
- Show muted text such as:
  `No example in source`
- Do not show this as an error.

Doom-scroll requirements:
- Smooth vertical scrolling.
- Cards should be compact enough for mobile.
- Use lazy rendering or simple virtual/incremental rendering if performance becomes an issue.
- A “back to top” floating button is acceptable.

## Hebrew section: Practice mode

Practice should have a setup screen before starting a session.

### Practice setup options

The setup screen should allow selecting:

1. Question types
   - A: השלמת משפט
   - B: מילים נרדפות
   - C: מילה והיפוכה
   - D: יוצא דופן

2. Units
   - All units
   - Specific units 1-20

3. Difficulties
   - Easy
   - Medium
   - Hard
   - Undefined, for the current extracted data
   - Any combination

4. Ordering
   - Easy to hard by default
   - Optional randomization within each difficulty bucket
   - Optional full shuffle

5. Practice mode
   - Questions without time
   - Questions with time per question
   - Simulation: multiple questions with total time limit

6. Question count
   - All matching questions
   - Or a selected count, such as 5, 10, 20, 40

7. Timing configuration
   - See configurable timings section below.

The setup screen should show:
- Number of matching questions before starting.
- Warning if zero questions match.
- Clear start button.

## Configurable timings

Timings must be configurable in the UI.

Do not hard-code only one timing behavior.

### Timing config model

Use a simple settings object like:

```js
const defaultTimingSettings = {
  perQuestion: {
    mode: "fixed", 
    fixedSeconds: 30,
    byDifficultySeconds: {
      easy: 20,
      medium: 35,
      hard: 50,
      undefined: 30
    }
  },
  simulation: {
    mode: "fixedTotal",
    totalSeconds: 600,
    secondsPerQuestion: 45,
    byDifficultySeconds: {
      easy: 25,
      medium: 40,
      hard: 60,
      undefined: 45
    }
  }
};
```

### Per-question timed mode settings

For “Questions with time per question”, allow:

1. Fixed seconds per question
   - Example: 30 seconds for every question

2. Difficulty-based seconds per question
   - Easy: configurable
   - Medium: configurable
   - Hard: configurable
- Undefined: configurable

UI:
- Radio/segmented choice:
  - Fixed
  - By difficulty
- Numeric inputs for seconds.
- Reasonable defaults:
  - fixed = 30 seconds
  - easy = 20 seconds
  - medium = 35 seconds
  - hard = 50 seconds
  - undefined = 30 seconds

Behavior:
- Timer resets for each question.
- If user answers before timer ends, stop timer and show immediate feedback.
- If timer reaches zero, mark as unanswered/wrong, show correct answer, and require tapping Next.

### Simulation timing settings

For simulation mode, allow:

1. Fixed total time
   - Example: 10 minutes total

2. Time calculated by number of questions
   - Example: 45 seconds x number of questions

3. Difficulty-based calculated total time
   - Sum configured seconds by difficulty for selected questions
   - Easy + medium + hard can each have different seconds
- Undefined should have its own configurable fallback

UI:
- Radio/segmented choice:
  - Fixed total
  - Seconds per question
  - By difficulty
- Numeric inputs:
  - fixed total minutes/seconds
  - seconds per question
  - per-difficulty seconds

Reasonable defaults:
- fixed total = 10 minutes
- seconds per question = 45
- easy = 25 seconds
- medium = 40 seconds
- hard = 60 seconds
- undefined = 45 seconds

Behavior:
- One total timer for the whole simulation.
- No immediate feedback during simulation.
- User may move between questions or proceed sequentially. Sequential-only is acceptable for MVP.
- User submits at the end.
- If time runs out, auto-submit.
- Results and review appear after submit/timeout.

### Persist timing settings

Persist timing settings in localStorage so they survive refreshes.

Also persist:
- last selected question types
- selected units
- selected difficulties
- selected practice mode
- selected question count

Do not require backend storage.

## Practice mode 1: Questions without time

Flow:

```text
Setup → Start → Answer question → Immediate feedback → Next
```

Behavior:
- User selects an option.
- Immediately show whether correct or wrong.
- If correct, highlight selected option as correct.
- If wrong, highlight selected option as wrong and correct option as correct.
- Show correct answer text.
- Enable dictionary word lookup after answer.
- Next button advances to the next question.

Mobile UI:
- Question prompt as a card.
- Options as large tappable full-width buttons.
- Feedback panel below options.
- Sticky footer with Next button after answering.

## Practice mode 2: Questions with time per question

Flow:

```text
Setup → Start → Timer per question → Answer or timeout → Immediate feedback → Next
```

Behavior:
- Timer resets per question.
- Timer duration comes from configurable timing settings.
- If user answers, stop the timer and immediately show feedback.
- If timer reaches zero:
  - mark unanswered/wrong
  - show correct answer
  - enable dictionary lookup
  - require user to tap Next
- Ordering should be easy → medium → hard by default.

Mobile UI:
- Prominent timer near top.
- Use simple text timer, no fancy graphics required.
- Consider warning visual under 5 seconds, but keep it simple.

## Practice mode 3: Simulation

Flow:

```text
Setup → Start simulation → Answer all questions under total timer → Submit or auto-submit → Results → Review
```

Behavior:
- Total timer only.
- No immediate feedback.
- No dictionary lookup during active simulation.
- Submit button available.
- Auto-submit when time runs out.
- Results shown only at the end.
- Review mode enables clickable word lookup.

Results summary:
- Score
- Correct count
- Wrong count
- Unanswered count
- Total questions
- Time used
- Time expired or manually submitted

Review:
- Show each question.
- Show selected answer.
- Show correct answer.
- Mark correct/wrong/unanswered.
- Enable dictionary popup for Hebrew words.

Mobile UI:
- One question per screen or accordion review cards.
- Sticky timer/footer during simulation.
- Final submit button should be clear.
- Confirm before manual submit if unanswered questions remain.

## Practice ordering and difficulty

Default ordering:
- Undefined → Easy → Medium → Hard
- Within each difficulty, keep source order unless shuffle is enabled.

Current extracted data should use `undefined` difficulty for every question. Do not derive difficulty from unit number. Easy, medium, and hard remain available for future real difficulty data.

## Click-any-word dictionary popup

After answering in non-simulation modes, and during simulation review, the user should be able to tap Hebrew words in:
- prompt
- options
- correct answer text
- feedback/review content

When tapped, show a floating popup/bottom sheet with dictionary information.

Since this is mobile-first, prefer a bottom sheet over a tiny hover popup.

Bottom sheet content:
- Matched term
- Explanation
- Example
- Unit and entry number
- If multiple matches, show candidate list
- If no match, show `No dictionary match found`

Lookup logic:
1. Normalize clicked word by removing niqqud.
2. Strip punctuation.
3. Search exact match against normalized `term` and `term_unpointed`.
4. If no exact match, search entries where normalized term contains the clicked word or clicked phrase.
5. If multiple matches, show candidates.
6. If no match, show no-match message.

Important:
- Dictionary lookup should not be available during active simulation.
- In simulation, enable lookup only after the simulation ends and the user is reviewing results.
- For non-simulation modes, enable lookup only after the current question has been answered or timed out.

Future improvement:
- Support selecting multiple words/phrases for idioms.
- For MVP, single-word tap is enough.

## Rendering clickable Hebrew words

Implement a helper that tokenizes Hebrew text into tappable spans while preserving punctuation and spacing.

Basic behavior:
- Split on whitespace but keep punctuation visible.
- Each Hebrew token gets a tap handler.
- Non-Hebrew text can remain plain.
- Do not break niqqud/dagesh rendering.

If tokenization is risky for niqqud, keep rendering as plain text for MVP and add a “lookup word” input in the feedback panel. But preferred MVP is tappable words.

## State model

Suggested high-level state:

```js
const appState = {
  section: "hebrew",
  hebrewTab: "study", // "study" | "practice"
  dictionaryEntries: [],
  practiceQuestions: [],
  study: {
    search: "",
    selectedUnit: "all"
  },
  practiceSetup: {
    selectedTypes: ["A", "B", "C", "D"],
    selectedUnits: "all",
    selectedDifficulties: ["undefined", "easy", "medium", "hard"],
    mode: "untimed", // "untimed" | "perQuestionTimed" | "simulation"
    questionCount: "all",
    order: "easyToHard"
  },
  timingSettings: {
    perQuestion: {
      mode: "fixed",
      fixedSeconds: 30,
      byDifficultySeconds: {
        easy: 20,
        medium: 35,
        hard: 50,
        undefined: 30
      }
    },
    simulation: {
      mode: "fixedTotal",
      totalSeconds: 600,
      secondsPerQuestion: 45,
      byDifficultySeconds: {
        easy: 25,
        medium: 40,
        hard: 60,
        undefined: 45
      }
    }
  },
  activeSession: null
};
```

Suggested session model:

```js
const activeSession = {
  mode: "untimed",
  questions: [],
  currentIndex: 0,
  answers: {
    "U06-D-04": {
      selectedOptionNum: 1,
      isCorrect: true,
      answeredAt: 1234567890,
      timedOut: false
    }
  },
  startedAt: 1234567890,
  submittedAt: null,
  totalTimeLimitSeconds: null,
  currentQuestionTimeLimitSeconds: null,
  status: "active" // "active" | "review"
};
```

## Validation checks

Add lightweight validation in JavaScript and log results to the console.

Show a visible warning banner if validation fails.

Dictionary validation:
- 2,000 rows
- 20 units
- 100 entries per unit
- unresolved `needs_review` count should be 0
- global 1615 empty example should not be treated as an error

Practice validation:
- 640 questions
- 20 units
- 4 exercise types per unit
- 8 questions per exercise type per unit
- unresolved `needs_review` count should be 0
- `U06-D-04` correct answer text exactly equals `טירה`

Timing validation:
- Fixed per-question time must be greater than 0.
- Difficulty-based seconds must all be greater than 0.
- Simulation total time must be greater than 0.
- Calculated simulation time must be greater than 0.

## README updates

Update README with:
- Purpose of the app
- Webapp POC only, not Android yet
- JSONL-only data files
- Mobile-first testing note
- How to run locally
- How to test phone UI with browser devtools/device switcher
- Validation expectations

Run locally:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Implementation priorities

Implement in this order:

1. Mobile-first app shell
   - Hebrew section only
   - Study and Practice tabs

2. Data loading
   - Load dictionary JSONL
   - Load practice questions JSONL
   - Validate data

3. Study mode
   - Doom-scroll dictionary cards
   - Nikud-insensitive search
   - Unit filter

4. Practice setup screen
   - Question type filters
   - Unit filters
   - Difficulty filters
   - Mode selection
   - Question count
   - Configurable timing controls
   - Persist settings in localStorage

5. Untimed practice
   - Immediate feedback
   - Correct/wrong highlighting
   - Next question flow

6. Dictionary lookup after answer
   - Tappable words or fallback lookup input
   - Mobile bottom sheet display

7. Per-question timed practice
   - Configurable fixed/difficulty timers
   - Timeout behavior
   - Immediate feedback after answer/timeout

8. Simulation mode
   - Configurable total timer
   - No feedback during active simulation
   - Submit/auto-submit
   - Results page
   - Review with dictionary lookup enabled

9. Polish
   - Mobile spacing
   - Sticky controls
   - Clear empty/error states
   - README

## Non-goals for this POC

Do not implement yet:
- Android app
- Backend server
- User accounts
- Cloud sync
- Analytics
- Spaced repetition
- Math section
- Payment/authentication
- Complex progress tracking
- Full design system

LocalStorage persistence is enough for now.

## Final deliverable

A mobile-first static webapp that can be run locally and tested in a phone viewport.

It should allow me to:
- Browse/search the Hebrew dictionary.
- Practice Hebrew questions with selected question types and difficulties.
- Configure timing behavior.
- Use untimed practice, per-question timed practice, and simulation mode.
- Get immediate feedback outside simulation.
- Review simulation results at the end.
- Tap words after answering/reviewing to see dictionary explanations.
- Confirm that all extracted JSONL data is structured and working correctly.
