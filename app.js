const DATASETS = {
  dictionary: {
    label: "Dictionary",
    url: "data/dictionary_entries.jsonl",
  },
  practice: {
    label: "Practice Questions",
    url: "data/practice_questions.jsonl",
  },
};

const state = {
  activeView: "dictionary",
  dictionary: [],
  practice: [],
  visibleRows: [],
  selectedId: null,
  validationWarnings: [],
};

const els = {
  totalRows: document.querySelector("#totalRows"),
  visibleRows: document.querySelector("#visibleRows"),
  reviewRows: document.querySelector("#reviewRows"),
  extraSummary: document.querySelector("#extraSummary"),
  extraSummaryLabel: document.querySelector("#extraSummaryLabel"),
  searchBox: document.querySelector("#searchBox"),
  unitFilter: document.querySelector("#unitFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  typeFilterWrap: document.querySelector("#typeFilterWrap"),
  reviewOnly: document.querySelector("#reviewOnly"),
  multiPageOnly: document.querySelector("#multiPageOnly"),
  multiPageWrap: document.querySelector("#multiPageWrap"),
  randomRow: document.querySelector("#randomRow"),
  status: document.querySelector("#status"),
  warningBanner: document.querySelector("#warningBanner"),
  tableHead: document.querySelector("#tableHead"),
  entriesBody: document.querySelector("#entriesBody"),
  tabs: [...document.querySelectorAll(".tabs button")],
};

function isNeedsReview(row) {
  return row.needs_review === true || row.needs_review === 1 || row.needs_review === "1";
}

function isMultiPage(entry) {
  return Number(entry.page_start) !== Number(entry.page_end);
}

function textValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function normalizeHebrewText(value) {
  if (value === null || value === undefined) return "";

  let text = String(value).normalize("NFC");

  // Hebrew letters: U+05D0-U+05EA
  // Hebrew combining marks / niqqud / dagesh: U+0591-U+05C7
  //
  // Safe cleanup:
  // 1. Move source-extracted leading marks onto the following Hebrew letter.
  // 2. Remove spaces between a Hebrew base letter and its marks.
  // 3. Remove spaces between consecutive Hebrew marks.
  // 4. Preserve spaces between a Hebrew mark and the next Hebrew base letter,
  //    because that may be a real word boundary.
  let previous;
  do {
    previous = text;
    text = text
      .replace(/(^|[^\u05D0-\u05EA\u0591-\u05C7])([\u0591-\u05C7]+)([\u05D0-\u05EA])/g, "$1$3$2")
      .replace(/([\u05D0-\u05EA])\s+([\u0591-\u05C7])/g, "$1$2")
      .replace(/([\u0591-\u05C7])\s+([\u0591-\u05C7])/g, "$1$2");
  } while (text !== previous);

  return text.normalize("NFC");
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function setWarnings(warnings) {
  state.validationWarnings = warnings;
  els.warningBanner.hidden = warnings.length === 0;
  els.warningBanner.textContent = warnings.length ? `Validation warnings: ${warnings.join(" | ")}` : "";
}

function parseJsonl(text, sourceName, normalizeRow) {
  const rows = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      rows.push(normalizeRow(JSON.parse(trimmed)));
    } catch (error) {
      throw new Error(`${sourceName}: malformed JSONL at line ${index + 1}: ${error.message}`);
    }
  });

  return rows;
}

function normalizeDictionaryEntry(entry) {
  return {
    ...entry,
    term: normalizeHebrewText(entry.term),
    term_unpointed: normalizeHebrewText(entry.term_unpointed),
    explanation: normalizeHebrewText(entry.explanation),
    example: normalizeHebrewText(entry.example),
  };
}

function normalizePracticeQuestion(question) {
  return {
    ...question,
    exercise_type_he: normalizeHebrewText(question.exercise_type_he),
    prompt: normalizeHebrewText(question.prompt),
    options: (question.options || []).map((option) => ({
      ...option,
      text: normalizeHebrewText(option.text),
    })),
    correct_answer_text: normalizeHebrewText(question.correct_answer_text),
    notes: normalizeHebrewText(question.notes),
  };
}

function rowKey(row) {
  if (state.activeView === "dictionary") return `D-${row.global_num}`;
  return row.id;
}

function populateUnitFilter(rows) {
  const units = [...new Set(rows.map((row) => textValue(row.unit)).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));

  els.unitFilter.innerHTML = '<option value="">All units</option>';
  for (const unit of units) {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    els.unitFilter.append(option);
  }
}

function searchableText(row) {
  if (state.activeView === "dictionary") {
    return [row.term, row.term_unpointed, row.explanation, row.example];
  }

  return [
    row.prompt,
    row.correct_answer_text,
    row.notes,
    ...(row.options || []).map((option) => option.text),
  ];
}

function matchesSearch(row, query) {
  if (!query) return true;
  const haystack = searchableText(row).map(normalizeHebrewText).join(" ").toLocaleLowerCase();
  return haystack.includes(query);
}

function currentRows() {
  return state[state.activeView];
}

function getFilteredRows() {
  const query = normalizeHebrewText(els.searchBox.value).trim().toLocaleLowerCase();
  const unit = els.unitFilter.value;
  const type = els.typeFilter.value;

  return currentRows().filter((row) => {
    if (unit && textValue(row.unit) !== unit) return false;
    if (state.activeView === "practice" && type && row.exercise_type !== type) return false;
    if (els.reviewOnly.checked && !isNeedsReview(row)) return false;
    if (state.activeView === "dictionary" && els.multiPageOnly.checked && !isMultiPage(row)) return false;
    return matchesSearch(row, query);
  });
}

function countPracticeTypes(rows) {
  return ["A", "B", "C", "D"]
    .map((type) => `${type}:${rows.filter((row) => row.exercise_type === type).length}`)
    .join(" ");
}

function updateSummary() {
  const rows = currentRows();
  els.totalRows.textContent = rows.length.toLocaleString();
  els.visibleRows.textContent = state.visibleRows.length.toLocaleString();
  els.reviewRows.textContent = rows.filter(isNeedsReview).length.toLocaleString();

  if (state.activeView === "dictionary") {
    els.extraSummary.textContent = rows.filter(isMultiPage).length.toLocaleString();
    els.extraSummaryLabel.textContent = "multi-page";
  } else {
    els.extraSummary.textContent = countPracticeTypes(rows);
    els.extraSummaryLabel.textContent = "by type";
  }
}

function clearTable() {
  els.tableHead.replaceChildren();
  els.entriesBody.replaceChildren();
}

function makeHeader(labels) {
  const tr = document.createElement("tr");
  for (const label of labels) {
    const th = document.createElement("th");
    th.textContent = label;
    tr.append(th);
  }
  els.tableHead.replaceChildren(tr);
}

function makeCell(text, className = "") {
  const td = document.createElement("td");
  td.textContent = textValue(text);
  if (className) td.className = className;
  return td;
}

function makeHebrewCell(text, className = "text") {
  const td = makeCell(normalizeHebrewText(text), className);
  td.lang = "he";
  td.dir = "rtl";
  return td;
}

function makeExampleCell(entry) {
  const example = normalizeHebrewText(entry.example);
  const td = makeHebrewCell(example || "No example in source", "text");
  if (!example) td.classList.add("empty-source-value");
  return td;
}

function makeOptionsCell(options) {
  const td = document.createElement("td");
  td.className = "text options-cell";
  td.lang = "he";
  td.dir = "rtl";

  const list = document.createElement("ol");
  for (const option of options || []) {
    const item = document.createElement("li");
    item.value = option.option_num;
    item.textContent = normalizeHebrewText(option.text);
    list.append(item);
  }
  td.append(list);
  return td;
}

function pageRange(entry) {
  return `${textValue(entry.page_start)} -> ${textValue(entry.page_end)}`;
}

function renderDictionaryTable() {
  makeHeader([
    "global_num",
    "unit",
    "entry_num",
    "page_start -> page_end",
    "term",
    "explanation",
    "example",
    "continuation_pages",
    "needs_review",
  ]);

  const fragment = document.createDocumentFragment();
  for (const entry of state.visibleRows) {
    const tr = document.createElement("tr");
    tr.dataset.rowKey = rowKey(entry);
    tr.classList.toggle("needs-review", isNeedsReview(entry));
    tr.classList.toggle("selected", rowKey(entry) === state.selectedId);

    tr.append(
      makeCell(entry.global_num, "num"),
      makeCell(entry.unit, "num"),
      makeCell(entry.entry_num, "num"),
      makeCell(pageRange(entry), "pages"),
      makeHebrewCell(entry.term, "term"),
      makeHebrewCell(entry.explanation, "text"),
      makeExampleCell(entry),
      makeCell(entry.continuation_pages, "pages"),
      makeCell(isNeedsReview(entry) ? "1" : "0", "flag"),
    );

    fragment.append(tr);
  }
  els.entriesBody.replaceChildren(fragment);
}

function renderPracticeTable() {
  makeHeader([
    "id",
    "unit",
    "exercise type",
    "question #",
    "page_question / page_answer",
    "prompt",
    "options/items",
    "correct option #",
    "correct answer text",
    "needs_review",
  ]);

  const fragment = document.createDocumentFragment();
  for (const question of state.visibleRows) {
    const tr = document.createElement("tr");
    tr.dataset.rowKey = rowKey(question);
    tr.classList.toggle("needs-review", isNeedsReview(question));
    tr.classList.toggle("selected", rowKey(question) === state.selectedId);

    tr.append(
      makeCell(question.id, "id-cell"),
      makeCell(question.unit, "num"),
      makeHebrewCell(`${question.exercise_type} / ${question.exercise_type_he}`, "type-cell"),
      makeCell(question.question_num, "num"),
      makeCell(`${textValue(question.page_question)} / ${textValue(question.page_answer)}`, "pages"),
      makeHebrewCell(question.prompt, "text"),
      makeOptionsCell(question.options),
      makeCell(question.correct_option_num ?? "", "num"),
      makeHebrewCell(question.correct_answer_text, "text"),
      makeCell(isNeedsReview(question) ? "1" : "0", "flag"),
    );

    fragment.append(tr);
  }
  els.entriesBody.replaceChildren(fragment);
}

function renderTable() {
  if (state.activeView === "dictionary") {
    renderDictionaryTable();
  } else {
    renderPracticeTable();
  }

  els.randomRow.disabled = state.visibleRows.length === 0;
}

function applyFilters() {
  state.visibleRows = getFilteredRows();
  if (!state.visibleRows.some((row) => rowKey(row) === state.selectedId)) {
    state.selectedId = null;
  }
  updateSummary();
  renderTable();
}

function switchView(view) {
  state.activeView = view;
  state.selectedId = null;
  els.tabs.forEach((tab) => tab.setAttribute("aria-pressed", String(tab.dataset.view === view)));
  els.typeFilterWrap.hidden = view !== "practice";
  els.multiPageWrap.hidden = view !== "dictionary";
  els.searchBox.placeholder = view === "dictionary"
    ? "term, unpointed term, explanation, example..."
    : "prompt, options, answer text...";
  populateUnitFilter(currentRows());
  applyFilters();
}

function scrollToRandomRow() {
  if (state.visibleRows.length === 0) return;

  const row = state.visibleRows[Math.floor(Math.random() * state.visibleRows.length)];
  state.selectedId = rowKey(row);
  renderTable();

  const element = els.entriesBody.querySelector(`[data-row-key="${CSS.escape(state.selectedId)}"]`);
  element?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function validateDictionary(rows) {
  const warnings = [];
  const units = new Set(rows.map((row) => Number(row.unit)));
  const reviewCount = rows.filter(isNeedsReview).length;
  const byUnit = new Map();
  for (const row of rows) byUnit.set(Number(row.unit), (byUnit.get(Number(row.unit)) || 0) + 1);
  const badUnits = [...byUnit].filter(([, count]) => count !== 100).map(([unit]) => unit);
  const sourceEmpty = rows.find((row) => Number(row.global_num) === 1615 && Number(row.unit) === 17 && Number(row.entry_num) === 15);

  if (rows.length !== 2000) warnings.push(`Dictionary expected 2000 rows, found ${rows.length}`);
  if (units.size !== 20) warnings.push(`Dictionary expected 20 units, found ${units.size}`);
  if (badUnits.length) warnings.push(`Dictionary units without 100 entries: ${badUnits.join(", ")}`);
  if (reviewCount !== 0) warnings.push(`Dictionary unresolved needs_review count is ${reviewCount}`);
  if (!sourceEmpty || sourceEmpty.example !== "" || isNeedsReview(sourceEmpty)) {
    warnings.push("Dictionary source-confirmed empty example row 1615 is not configured correctly");
  }

  console.log("Dictionary validation", { rows: rows.length, units: units.size, reviewCount, badUnits, sourceEmpty });
  return warnings;
}

function validatePractice(rows) {
  const warnings = [];
  const units = new Set(rows.map((row) => Number(row.unit)));
  const reviewCount = rows.filter(isNeedsReview).length;
  const target = rows.find((row) => row.id === "U06-D-04");

  const missingBuckets = [];
  for (let unit = 1; unit <= 20; unit += 1) {
    for (const type of ["A", "B", "C", "D"]) {
      const count = rows.filter((row) => Number(row.unit) === unit && row.exercise_type === type).length;
      if (count !== 8) missingBuckets.push(`U${String(unit).padStart(2, "0")}-${type}:${count}`);
    }
  }

  if (rows.length !== 640) warnings.push(`Practice expected 640 questions, found ${rows.length}`);
  if (units.size !== 20) warnings.push(`Practice expected 20 units, found ${units.size}`);
  if (missingBuckets.length) warnings.push(`Practice unit/type buckets not equal to 8: ${missingBuckets.join(", ")}`);
  if (reviewCount !== 0) warnings.push(`Practice unresolved needs_review count is ${reviewCount}`);
  if (!target || target.correct_answer_text !== "טירה" || target.correct_option_num !== 1 || isNeedsReview(target)) {
    warnings.push("Practice U06-D-04 is not corrected to טירה");
  }

  console.log("Practice validation", { rows: rows.length, units: units.size, reviewCount, missingBuckets, target });
  return warnings;
}

async function loadDataset(key) {
  const response = await fetch(DATASETS[key].url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${DATASETS[key].url} (${response.status} ${response.statusText})`);
  }

  const text = await response.text();
  return parseJsonl(
    text,
    DATASETS[key].url,
    key === "dictionary" ? normalizeDictionaryEntry : normalizePracticeQuestion,
  );
}

async function loadAll() {
  try {
    setStatus("Loading JSONL data...");
    clearTable();

    const [dictionary, practice] = await Promise.all([
      loadDataset("dictionary"),
      loadDataset("practice"),
    ]);

    state.dictionary = dictionary;
    state.practice = practice;
    setWarnings([...validateDictionary(dictionary), ...validatePractice(practice)]);
    setStatus(`Loaded ${dictionary.length.toLocaleString()} dictionary rows and ${practice.length.toLocaleString()} practice questions.`);
    switchView(state.activeView);
  } catch (error) {
    state.dictionary = [];
    state.practice = [];
    state.visibleRows = [];
    updateSummary();
    clearTable();
    setWarnings([error.message]);
    setStatus(`${error.message}. Run a local HTTP server from the project root and confirm data/*.jsonl files are present.`, true);
  }
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});
els.searchBox.addEventListener("input", applyFilters);
els.unitFilter.addEventListener("change", applyFilters);
els.typeFilter.addEventListener("change", applyFilters);
els.reviewOnly.addEventListener("change", applyFilters);
els.multiPageOnly.addEventListener("change", applyFilters);
els.randomRow.addEventListener("click", scrollToRandomRow);

loadAll();
