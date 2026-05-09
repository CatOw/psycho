# Psychometry Extraction Inspector

Small static web UI for visually checking extracted psychometry vocabulary data.

This is an inspection/debugging tool, not a full study app.

## Data files

The app uses JSONL only:

```text
data/
  dictionary_entries.jsonl
  practice_questions.jsonl
```

`dictionary_entries.jsonl` contains one dictionary entry per line.

`practice_questions.jsonl` contains one practice question per line, including prompt, options/items, answer metadata, and `needs_review`.

The UI does not rely on CSV, SQLite, extraction scripts, report JSON files, or intermediate extraction artifacts.

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

On Windows, if `python3` is not available, try:

```powershell
python -m http.server 8000
```

The app loads JSONL with `fetch`, so it should be served over HTTP rather than opened directly as a file.
