const DATASETS = {
  dictionary: "data/dictionary_entries.jsonl",
  practice: "data/practice_questions.jsonl",
};

const STORAGE_KEY = "psychoHebrewPocSettings.v1";
const THEME_KEY = "psychoHebrewTheme.v1";
const STUDY_BATCH_SIZE = 40;

const QUESTION_TYPES = {
  A: { he: "\u05D4\u05E9\u05DC\u05DE\u05EA \u05DE\u05E9\u05E4\u05D8", en: "sentence_completion" },
  B: { he: "\u05DE\u05D9\u05DC\u05D9\u05DD \u05E0\u05E8\u05D3\u05E4\u05D5\u05EA", en: "synonyms" },
  C: { he: "\u05DE\u05D9\u05DC\u05D4 \u05D5\u05D4\u05D9\u05E4\u05D5\u05DB\u05D4", en: "antonyms" },
  D: { he: "\u05D9\u05D5\u05E6\u05D0 \u05D3\u05D5\u05E4\u05DF", en: "odd_one_out" },
};

const DIFFICULTIES = ["undefined", "easy", "medium", "hard"];

const defaultSettings = {
  selectedTypes: ["A", "B", "C", "D"],
  selectedUnit: "all",
  selectedDifficulties: ["undefined", "easy", "medium", "hard"],
  mode: "untimed",
  questionCount: "10",
  questionOrder: "default",
  answerOrder: "default",
  timing: {
    perQuestion: {
      mode: "fixed",
      fixedSeconds: 30,
      byDifficultySeconds: {
        undefined: 30,
        easy: 20,
        medium: 35,
        hard: 50,
      },
    },
    simulation: {
      mode: "fixedTotal",
      totalSeconds: 600,
      secondsPerQuestion: 45,
      byDifficultySeconds: {
        undefined: 45,
        easy: 25,
        medium: 40,
        hard: 60,
      },
    },
  },
};

const state = {
  hebrewTab: "study",
  dictionaryEntries: [],
  practiceQuestions: [],
  dictionaryLookupEntries: [],
  dictionaryDisplayTerms: new Map(),
  validationWarnings: [],
  study: {
    search: "",
    selectedUnit: "all",
    examplesOnly: false,
    renderedCount: STUDY_BATCH_SIZE,
    shuffleActive: false,
    shuffledIds: [],
  },
  practiceSetup: loadSettings(),
  activeSession: null,
};

const els = {
  themeToggle: document.querySelector("#themeToggle"),
  loadState: document.querySelector("#loadState"),
  warningBanner: document.querySelector("#warningBanner"),
  tabs: [...document.querySelectorAll(".tab-bar button")],
  studyView: document.querySelector("#studyView"),
  practiceView: document.querySelector("#practiceView"),
  studySearch: document.querySelector("#studySearch"),
  studyUnit: document.querySelector("#studyUnit"),
  studyExamplesOnly: document.querySelector("#studyExamplesOnly"),
  studyCount: document.querySelector("#studyCount"),
  dictionaryCards: document.querySelector("#dictionaryCards"),
  loadMoreStudy: document.querySelector("#loadMoreStudy"),
  shuffleStudy: document.querySelector("#shuffleStudy"),
  resetStudyOrder: document.querySelector("#resetStudyOrder"),
  backToTop: document.querySelector("#backToTop"),
  practiceSetup: document.querySelector("#practiceSetup"),
  practiceSession: document.querySelector("#practiceSession"),
  typeChoices: document.querySelector("#typeChoices"),
  practiceUnit: document.querySelector("#practiceUnit"),
  questionCount: document.querySelector("#questionCount"),
  questionCountLabel: document.querySelector("#questionCountLabel"),
  questionCountMessage: document.querySelector("#questionCountMessage"),
  useAllQuestions: document.querySelector("#useAllQuestions"),
  difficultyChoices: document.querySelector("#difficultyChoices"),
  modeNote: document.querySelector("#modeNote"),
  matchingCount: document.querySelector("#matchingCount"),
  startPractice: document.querySelector("#startPractice"),
  timingControls: document.querySelector("#timingControls"),
  timingControlsTitle: document.querySelector("#timingControlsTitle"),
  perQuestionTimingPanel: document.querySelector("#perQuestionTimingPanel"),
  perQuestionFixedFields: document.querySelector("#perQuestionFixedFields"),
  perQuestionDifficultyFields: document.querySelector("#perQuestionDifficultyFields"),
  simulationTimingPanel: document.querySelector("#simulationTimingPanel"),
  simulationFixedFields: document.querySelector("#simulationFixedFields"),
  simulationPerQuestionFields: document.querySelector("#simulationPerQuestionFields"),
  simulationDifficultyFields: document.querySelector("#simulationDifficultyFields"),
  fixedQuestionSeconds: document.querySelector("#fixedQuestionSeconds"),
  easyQuestionSeconds: document.querySelector("#easyQuestionSeconds"),
  mediumQuestionSeconds: document.querySelector("#mediumQuestionSeconds"),
  hardQuestionSeconds: document.querySelector("#hardQuestionSeconds"),
  unknownQuestionSeconds: document.querySelector("#unknownQuestionSeconds"),
  simulationTotalSeconds: document.querySelector("#simulationTotalSeconds"),
  simulationSecondsPerQuestion: document.querySelector("#simulationSecondsPerQuestion"),
  simulationEasySeconds: document.querySelector("#simulationEasySeconds"),
  simulationMediumSeconds: document.querySelector("#simulationMediumSeconds"),
  simulationHardSeconds: document.querySelector("#simulationHardSeconds"),
  simulationUnknownSeconds: document.querySelector("#simulationUnknownSeconds"),
  lookupSheet: document.querySelector("#lookupSheet"),
  closeLookup: document.querySelector("#closeLookup"),
  closeLookupButton: document.querySelector("#closeLookupButton"),
  lookupContent: document.querySelector("#lookupContent"),
};

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object") return structuredClone(defaultSettings);
    return normalizeSettings(mergeSettings(structuredClone(defaultSettings), stored));
  } catch {
    return structuredClone(defaultSettings);
  }
}

function mergeSettings(base, stored) {
  for (const [key, value] of Object.entries(stored)) {
    if (value && typeof value === "object" && !Array.isArray(value) && key in base) {
      base[key] = mergeSettings(base[key], value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.practiceSetup));
}

function normalizeSettings(settings) {
  settings.questionOrder = settings.questionOrder === "random" ? "random" : "default";
  settings.answerOrder = settings.answerOrder === "random" ? "random" : "default";
  settings.selectedDifficulties = normalizeDifficultySelection(settings.selectedDifficulties);
  migrateDifficultyTiming(settings.timing.perQuestion.byDifficultySeconds, 30);
  migrateDifficultyTiming(settings.timing.simulation.byDifficultySeconds, 45);
  return settings;
}

function normalizeDifficultySelection(values) {
  const selected = new Set((Array.isArray(values) ? values : []).map((value) => value === "unknown" ? "undefined" : value));
  if (!selected.size) selected.add("undefined");
  return DIFFICULTIES.filter((difficulty) => selected.has(difficulty));
}

function migrateDifficultyTiming(values, fallbackSeconds) {
  if (!Object.prototype.hasOwnProperty.call(values, "undefined")) {
    values.undefined = Number(values.unknown) || fallbackSeconds;
  }
  delete values.unknown;
}

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  els.themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
  els.themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function isNeedsReview(row) {
  return row.needs_review === true || row.needs_review === 1 || row.needs_review === "1";
}

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

function stripHebrewMarks(value) {
  return normalizeHebrewDisplay(value)
    .normalize("NFD")
    .replace(/[\u0591-\u05C7]/g, "")
    .normalize("NFC");
}

function normalizeForSearch(value) {
  return stripHebrewMarks(value)
    .toLowerCase()
    .replace(/[\u05F4"\u05F3'.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textValue(value) {
  return value == null ? "" : String(value);
}

function parseJsonl(text, sourceName, normalizeRow) {
  const rows = [];
  text.split(/\r?\n/).forEach((line, index) => {
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
    term: normalizeHebrewDisplay(entry.term),
    term_unpointed: normalizeHebrewDisplay(entry.term_unpointed),
    explanation: normalizeHebrewDisplay(entry.explanation),
    example: normalizeHebrewDisplay(entry.example),
  };
}

function normalizeDifficulty(value) {
  const difficulty = textValue(value).trim();
  return DIFFICULTIES.includes(difficulty) && difficulty !== "" ? difficulty : "undefined";
}

function normalizePracticeQuestion(question) {
  const typeMeta = QUESTION_TYPES[question.exercise_type] || {};
  return {
    ...question,
    exercise_type_he: normalizeHebrewDisplay(question.exercise_type_he || typeMeta.he),
    exercise_type_en: question.exercise_type_en || typeMeta.en || "",
    difficulty: normalizeDifficulty(question.difficulty),
    prompt: normalizeHebrewDisplay(question.prompt),
    options: (question.options || []).map((option) => ({
      ...option,
      text: normalizeHebrewDisplay(option.text),
    })),
    correct_answer_text: normalizeHebrewDisplay(question.correct_answer_text),
    notes: normalizeHebrewDisplay(question.notes),
  };
}

function buildDictionaryDisplayTerms(entries) {
  const terms = new Map();
  for (const entry of entries) {
    const displayTerm = normalizeHebrewDisplay(entry.term);
    for (const value of [entry.term_unpointed, stripHebrewMarks(entry.term), entry.term]) {
      const key = normalizeForSearch(value);
      if (key && displayTerm && !terms.has(key)) terms.set(key, displayTerm);
    }
  }
  return terms;
}

function pointHebrewTextFromDictionary(text, terms = state.dictionaryDisplayTerms) {
  const displayText = normalizeHebrewDisplay(text);
  if (!displayText) return "";

  const exact = terms.get(normalizeForSearch(displayText));
  if (exact) return exact;

  return displayText.split(/(\s+|[,.;:!?]+)/).map((part) => {
    if (!/[\u05D0-\u05EA]/.test(part)) return part;
    return terms.get(normalizeForSearch(part)) || part;
  }).join("");
}

function addPracticeDisplayText(question) {
  return {
    ...question,
    prompt_display: pointHebrewTextFromDictionary(question.prompt),
    options: (question.options || []).map((option) => ({
      ...option,
      display_text: pointHebrewTextFromDictionary(option.text),
    })),
    correct_answer_display: pointHebrewTextFromDictionary(question.correct_answer_text),
  };
}

function optionDisplayText(option) {
  return normalizeHebrewDisplay(option.display_text || option.text);
}

function questionPromptDisplay(question) {
  return normalizeHebrewDisplay(question.prompt_display || question.prompt);
}

function correctAnswerDisplay(question) {
  return normalizeHebrewDisplay(question.correct_answer_display || question.correct_answer_text);
}

function createHebrewElement(tagName, text, className = "hebrew") {
  const element = document.createElement(tagName);
  element.className = className;
  element.lang = "he";
  element.dir = "rtl";
  element.textContent = normalizeHebrewDisplay(text);
  return element;
}

function createLtrElement(tagName, text, className = "") {
  const element = document.createElement(tagName);
  element.className = className;
  element.lang = "en";
  element.dir = "ltr";
  element.textContent = textValue(text);
  return element;
}

function renderQuestionCategory(question, status = "") {
  const category = document.createElement("div");
  category.className = "question-category";
  const meta = createLtrElement("span", `Unit ${question.unit} · Q${question.question_num}${status ? ` · ${status}` : ""}`, "question-category-meta");
  const type = createHebrewElement("strong", question.exercise_type_he || question.exercise_type, "question-category-type hebrew");
  category.append(meta, type);
  return category;
}

function createAnswerDetail(label, text, lookupEnabled) {
  const detail = document.createElement("div");
  detail.className = "answer-detail";
  const labelElement = createLtrElement("span", label, "answer-detail-label");
  const value = createHebrewElement("span", "", "answer-detail-value hebrew");
  renderStableLookupText(value, text, lookupEnabled);
  detail.append(labelElement, value);
  return detail;
}

function setWarnings(warnings) {
  state.validationWarnings = warnings;
  els.warningBanner.hidden = warnings.length === 0;
  els.warningBanner.textContent = warnings.length ? `Validation warnings: ${warnings.join(" | ")}` : "";
}

function populateUnitSelect(select, includeAll = true) {
  select.replaceChildren();
  if (includeAll) {
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All units";
    select.append(all);
  }
  for (let unit = 1; unit <= 20; unit += 1) {
    const option = document.createElement("option");
    option.value = String(unit);
    option.textContent = `Unit ${unit}`;
    select.append(option);
  }
}

function setupControls() {
  populateUnitSelect(els.studyUnit);
  populateUnitSelect(els.practiceUnit);
  renderTypeChoices();
  renderDifficultyChoices();
  syncSetupControlsFromState();
}

function renderTypeChoices() {
  els.typeChoices.replaceChildren();
  for (const [type, meta] of Object.entries(QUESTION_TYPES)) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = type;
    input.checked = state.practiceSetup.selectedTypes.includes(type);
    input.addEventListener("change", () => {
      updateMultiSelect("selectedTypes", type, input.checked);
      renderPracticeSetupSummary();
    });
    label.append(input, document.createTextNode(`${type}: ${meta.he}`));
    els.typeChoices.append(label);
  }
}

function renderDifficultyChoices() {
  els.difficultyChoices.replaceChildren();
  for (const difficulty of DIFFICULTIES) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = difficulty;
    input.checked = state.practiceSetup.selectedDifficulties.includes(difficulty);
    input.addEventListener("change", () => {
      updateMultiSelect("selectedDifficulties", difficulty, input.checked);
      renderPracticeSetupSummary();
    });
    label.append(input, document.createTextNode(difficulty === "undefined" ? "Undefined" : difficulty));
    els.difficultyChoices.append(label);
  }
}

function updateMultiSelect(key, value, checked) {
  const current = new Set(state.practiceSetup[key]);
  if (checked) current.add(value);
  else current.delete(value);
  state.practiceSetup[key] = [...current];
  clampQuestionCountToMatching();
}

function syncSetupControlsFromState() {
  const settings = state.practiceSetup;
  els.practiceUnit.value = settings.selectedUnit;
  els.questionCount.value = settings.questionCount === "all" ? "" : settings.questionCount;
  const modeInput = document.querySelector(`input[name="practiceMode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;
  const orderInput = document.querySelector(`input[name="questionOrder"][value="${settings.questionOrder || "default"}"]`);
  if (orderInput) orderInput.checked = true;
  const answerOrderInput = document.querySelector(`input[name="answerOrder"][value="${settings.answerOrder || "default"}"]`);
  if (answerOrderInput) answerOrderInput.checked = true;
  els.fixedQuestionSeconds.value = settings.timing.perQuestion.fixedSeconds;
  els.unknownQuestionSeconds.value = settings.timing.perQuestion.byDifficultySeconds.undefined;
  els.easyQuestionSeconds.value = settings.timing.perQuestion.byDifficultySeconds.easy;
  els.mediumQuestionSeconds.value = settings.timing.perQuestion.byDifficultySeconds.medium;
  els.hardQuestionSeconds.value = settings.timing.perQuestion.byDifficultySeconds.hard;
  els.simulationTotalSeconds.value = settings.timing.simulation.totalSeconds;
  els.simulationSecondsPerQuestion.value = settings.timing.simulation.secondsPerQuestion;
  els.simulationUnknownSeconds.value = settings.timing.simulation.byDifficultySeconds.undefined;
  els.simulationEasySeconds.value = settings.timing.simulation.byDifficultySeconds.easy;
  els.simulationMediumSeconds.value = settings.timing.simulation.byDifficultySeconds.medium;
  els.simulationHardSeconds.value = settings.timing.simulation.byDifficultySeconds.hard;
  const perQuestionMode = document.querySelector(`input[name="perQuestionTimingMode"][value="${settings.timing.perQuestion.mode}"]`);
  if (perQuestionMode) perQuestionMode.checked = true;
  const simulationMode = document.querySelector(`input[name="simulationTimingMode"][value="${settings.timing.simulation.mode}"]`);
  if (simulationMode) simulationMode.checked = true;
  updatePracticeTimingVisibility();
}

function bindEvents() {
  els.themeToggle.addEventListener("click", toggleTheme);
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  els.studySearch.addEventListener("input", () => {
    state.study.search = els.studySearch.value;
    state.study.renderedCount = STUDY_BATCH_SIZE;
    resetStudyOrder(false);
    renderStudy();
  });
  els.studyUnit.addEventListener("change", () => {
    state.study.selectedUnit = els.studyUnit.value;
    state.study.renderedCount = STUDY_BATCH_SIZE;
    resetStudyOrder(false);
    renderStudy();
  });
  els.studyExamplesOnly.addEventListener("change", () => {
    state.study.examplesOnly = els.studyExamplesOnly.checked;
    state.study.renderedCount = STUDY_BATCH_SIZE;
    resetStudyOrder(false);
    renderStudy();
  });
  els.loadMoreStudy.addEventListener("click", () => {
    state.study.renderedCount += STUDY_BATCH_SIZE;
    renderStudy();
  });
  els.shuffleStudy.addEventListener("click", shuffleStudyOrder);
  els.resetStudyOrder.addEventListener("click", () => {
    resetStudyOrder();
    renderStudy();
  });
  els.backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => {
    els.backToTop.hidden = window.scrollY < 650;
  });

  els.practiceUnit.addEventListener("change", () => {
    state.practiceSetup.selectedUnit = els.practiceUnit.value;
    clampQuestionCountToMatching();
    renderPracticeSetupSummary();
  });
  els.questionCount.addEventListener("input", () => {
    state.practiceSetup.questionCount = els.questionCount.value;
    saveSettings();
    renderPracticeSetupSummary();
  });
  els.questionCount.addEventListener("blur", () => {
    clampQuestionCountToMatching();
    renderPracticeSetupSummary();
  });
  els.useAllQuestions.addEventListener("click", () => {
    const max = getMatchingPracticeQuestions().length;
    if (max > 0) {
      state.practiceSetup.questionCount = String(max);
      els.questionCount.value = String(max);
      saveSettings();
    }
    renderPracticeSetupSummary();
  });
  document.querySelectorAll('input[name="practiceMode"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.practiceSetup.mode = input.value;
      clampQuestionCountToMatching();
      updatePracticeTimingVisibility();
      renderPracticeSetupSummary();
    });
  });
  document.querySelectorAll('input[name="questionOrder"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.practiceSetup.questionOrder = input.value;
      saveSettings();
    });
  });
  document.querySelectorAll('input[name="answerOrder"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.practiceSetup.answerOrder = input.value;
      saveSettings();
    });
  });
  document.querySelectorAll('input[name="perQuestionTimingMode"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.practiceSetup.timing.perQuestion.mode = input.value;
      saveSettings();
      updatePracticeTimingVisibility();
      setWarnings(validateAll());
    });
  });
  document.querySelectorAll('input[name="simulationTimingMode"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.practiceSetup.timing.simulation.mode = input.value;
      saveSettings();
      updatePracticeTimingVisibility();
      renderPracticeSetupSummary();
      setWarnings(validateAll());
    });
  });
  [
    [els.fixedQuestionSeconds, "fixedSeconds"],
    [els.easyQuestionSeconds, "easy"],
    [els.mediumQuestionSeconds, "medium"],
    [els.hardQuestionSeconds, "hard"],
    [els.unknownQuestionSeconds, "undefined"],
    [els.simulationTotalSeconds, "simulationTotal"],
    [els.simulationSecondsPerQuestion, "simulationSecondsPerQuestion"],
    [els.simulationEasySeconds, "simulationEasy"],
    [els.simulationMediumSeconds, "simulationMedium"],
    [els.simulationHardSeconds, "simulationHard"],
    [els.simulationUnknownSeconds, "simulationUndefined"],
  ].forEach(([input, key]) => {
    input.addEventListener("input", () => updateTimingSetting(key, input.value));
  });
  els.startPractice.addEventListener("click", startPractice);
  els.closeLookup.addEventListener("click", closeLookupSheet);
  els.closeLookupButton.addEventListener("click", closeLookupSheet);
}

function updateTimingSetting(key, value) {
  const seconds = Math.max(1, Number(value) || 1);
  if (key === "fixedSeconds") {
    state.practiceSetup.timing.perQuestion.fixedSeconds = seconds;
  } else if (key === "simulationTotal") {
    state.practiceSetup.timing.simulation.totalSeconds = seconds;
  } else if (key === "simulationSecondsPerQuestion") {
    state.practiceSetup.timing.simulation.secondsPerQuestion = seconds;
  } else if (key.startsWith("simulation")) {
    const difficulty = key.replace("simulation", "").toLowerCase();
    state.practiceSetup.timing.simulation.byDifficultySeconds[difficulty] = seconds;
  } else {
    state.practiceSetup.timing.perQuestion.byDifficultySeconds[key] = seconds;
  }
  saveSettings();
  setWarnings(validateAll());
}

function updatePracticeTimingVisibility() {
  const setup = state.practiceSetup;
  const mode = setup.mode;
  const perQuestionMode = setup.timing.perQuestion.mode;
  const simulationMode = setup.timing.simulation.mode;

  els.timingControls.hidden = mode === "untimed";
  els.perQuestionTimingPanel.hidden = mode !== "perQuestionTimed";
  els.simulationTimingPanel.hidden = mode !== "simulation";

  els.perQuestionFixedFields.hidden = mode !== "perQuestionTimed" || perQuestionMode !== "fixed";
  els.perQuestionDifficultyFields.hidden = mode !== "perQuestionTimed" || perQuestionMode !== "byDifficulty";

  els.simulationFixedFields.hidden = mode !== "simulation" || simulationMode !== "fixedTotal";
  els.simulationPerQuestionFields.hidden = mode !== "simulation" || simulationMode !== "perQuestion";
  els.simulationDifficultyFields.hidden = mode !== "simulation" || simulationMode !== "byDifficulty";

  if (mode === "perQuestionTimed") {
    els.timingControlsTitle.textContent = "Per-question timing";
  } else if (mode === "simulation") {
    els.timingControlsTitle.textContent = "Simulation timing";
  } else {
    els.timingControlsTitle.textContent = "Timing controls";
  }
}

function switchTab(tab) {
  state.hebrewTab = tab;
  els.tabs.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tab === tab)));
  els.studyView.hidden = tab !== "study";
  els.practiceView.hidden = tab !== "practice";
}

function filteredStudyEntries() {
  const query = normalizeForSearch(state.study.search);
  return state.dictionaryEntries.filter((entry) => {
    if (state.study.selectedUnit !== "all" && String(entry.unit) !== state.study.selectedUnit) return false;
    if (state.study.examplesOnly && !entry.example) return false;
    if (!query) return true;
    const haystack = normalizeForSearch([entry.term, entry.term_unpointed, entry.explanation, entry.example].join(" "));
    return haystack.includes(query);
  });
}

function resetStudyOrder(resetRenderedCount = true) {
  state.study.shuffleActive = false;
  state.study.shuffledIds = [];
  if (resetRenderedCount) state.study.renderedCount = STUDY_BATCH_SIZE;
}

function shuffleStudyOrder() {
  const entries = filteredStudyEntries();
  state.study.shuffleActive = true;
  state.study.shuffledIds = shuffleArray(entries.map((entry) => entry.global_num));
  state.study.renderedCount = STUDY_BATCH_SIZE;
  renderStudy();
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function orderedStudyEntries(entries) {
  if (!state.study.shuffleActive) return entries;
  const entriesById = new Map(entries.map((entry) => [entry.global_num, entry]));
  const ordered = state.study.shuffledIds.map((id) => entriesById.get(id)).filter(Boolean);
  const orderedIds = new Set(ordered.map((entry) => entry.global_num));
  return [...ordered, ...entries.filter((entry) => !orderedIds.has(entry.global_num))];
}

function renderStudy() {
  const entries = orderedStudyEntries(filteredStudyEntries());
  const visible = entries.slice(0, state.study.renderedCount);
  els.studyCount.textContent = `${entries.length.toLocaleString()} matching entries${state.study.shuffleActive ? " · shuffled" : ""}`;
  els.dictionaryCards.replaceChildren(...visible.map(renderDictionaryCard));
  els.loadMoreStudy.hidden = visible.length >= entries.length;
  els.resetStudyOrder.disabled = !state.study.shuffleActive;
}

function renderDictionaryCard(entry) {
  const card = document.createElement("article");
  card.className = "dictionary-card";

  const term = createHebrewElement("h2", entry.term, "term hebrew");
  const explanation = createHebrewElement("p", entry.explanation, "explanation hebrew");
  const example = document.createElement("p");
  example.className = `example hebrew${entry.example ? "" : " empty-source-value"}`;
  example.lang = "he";
  example.dir = "rtl";

  const label = document.createElement("span");
  label.className = "example-label";
  label.textContent = "Example";
  example.append(label, document.createTextNode(entry.example || "No example in source"));

  const meta = document.createElement("div");
  meta.className = "meta-line";
  const pages = Number(entry.page_start) === Number(entry.page_end) ? `page ${entry.page_start}` : `pages ${entry.page_start}-${entry.page_end}`;
  meta.textContent = `unit ${entry.unit} · entry ${entry.entry_num} · ${pages}`;

  card.append(term, explanation, example, meta);
  return card;
}

function renderPracticeSetupSummary() {
  updatePracticeTimingVisibility();
  const matching = getMatchingPracticeQuestions();
  const countState = getQuestionCountState(matching.length);
  els.matchingCount.textContent = matching.length.toLocaleString();
  els.questionCount.max = String(Math.max(1, matching.length));
  els.questionCountLabel.textContent = `Question count (max ${matching.length})`;
  const mode = state.practiceSetup.mode;
  const modeLabel = {
    untimed: "untimed practice",
    perQuestionTimed: "timed practice",
    simulation: "simulation",
  }[mode];

  if (mode === "untimed") {
    els.modeNote.textContent = "Immediate feedback after each answer.";
  } else if (mode === "perQuestionTimed") {
    els.modeNote.textContent = "Timer resets for each question; feedback appears after answer or timeout.";
  } else {
    els.modeNote.textContent = "One total timer; feedback and dictionary lookup unlock after submit.";
  }
  if (matching.length === 0) {
    els.questionCountMessage.textContent = "No questions match these filters.";
  } else if (countState.message) {
    els.questionCountMessage.textContent = countState.message;
  } else {
    els.questionCountMessage.textContent = `${countState.count} questions will be used.`;
  }
  els.useAllQuestions.disabled = matching.length === 0;
  els.startPractice.disabled = !countState.valid;
  els.startPractice.textContent = `Start ${modeLabel}`;
}

function getQuestionCountState(matchingCount = getMatchingPracticeQuestions().length) {
  const raw = textValue(state.practiceSetup.questionCount).trim();
  if (matchingCount === 0) {
    return { valid: false, count: 0, message: "No matching questions." };
  }
  if (!raw) {
    return { valid: false, count: null, message: "Enter a question count or tap Use all." };
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { valid: false, count: null, message: "Question count must be a number." };
  }
  const count = Math.trunc(value);
  if (count < 1) {
    return { valid: false, count, message: "Question count must be at least 1." };
  }
  if (count > matchingCount) {
    return { valid: false, count, message: `Question count cannot exceed ${matchingCount}.` };
  }
  return { valid: true, count, message: "" };
}

function clampQuestionCountToMatching() {
  const matchingCount = getMatchingPracticeQuestions().length;
  let nextValue = Number(state.practiceSetup.questionCount);
  if (matchingCount === 0) {
    state.practiceSetup.questionCount = "";
    els.questionCount.value = "";
    saveSettings();
    return;
  }
  if (!Number.isFinite(nextValue)) nextValue = matchingCount;
  nextValue = Math.trunc(nextValue);
  if (nextValue < 1) nextValue = 1;
  if (nextValue > matchingCount) nextValue = matchingCount;
  state.practiceSetup.questionCount = String(nextValue);
  els.questionCount.value = String(nextValue);
  saveSettings();
}

function getMatchingPracticeQuestions() {
  const setup = state.practiceSetup;
  return state.practiceQuestions.filter((question) => {
    if (!setup.selectedTypes.includes(question.exercise_type)) return false;
    if (setup.selectedUnit !== "all" && String(question.unit) !== setup.selectedUnit) return false;
    if (!setup.selectedDifficulties.includes(question.difficulty)) return false;
    return true;
  });
}

function orderedPracticeQuestions() {
  const difficultyRank = { undefined: 1, easy: 2, medium: 3, hard: 4 };
  const questions = [...getMatchingPracticeQuestions()].sort((a, b) => {
    return difficultyRank[a.difficulty] - difficultyRank[b.difficulty]
      || Number(a.unit) - Number(b.unit)
      || a.exercise_type.localeCompare(b.exercise_type)
      || Number(a.question_num) - Number(b.question_num);
  });

  const countState = getQuestionCountState(questions.length);
  if (!countState.valid) return [];
  const selected = state.practiceSetup.questionOrder === "random"
    ? shuffleArray(questions).slice(0, countState.count)
    : questions.slice(0, countState.count);
  return selected.map(prepareSessionQuestion);
}

function prepareSessionQuestion(question) {
  const options = Array.isArray(question.options) ? question.options.map((option) => ({ ...option })) : [];
  const sessionOptions = state.practiceSetup.answerOrder === "random" && options.length > 1 ? shuffleArray(options) : options;
  return {
    ...question,
    options: options,
    sessionOptions,
  };
}

function questionOptions(question) {
  return question.sessionOptions || question.options || [];
}

function getPerQuestionSeconds(question) {
  const timing = state.practiceSetup.timing.perQuestion;
  if (timing.mode === "byDifficulty") {
    return Math.max(1, Number(timing.byDifficultySeconds[question.difficulty]) || 1);
  }
  return Math.max(1, Number(timing.fixedSeconds) || 1);
}

function getSimulationSeconds(questions) {
  const timing = state.practiceSetup.timing.simulation;
  if (timing.mode === "perQuestion") {
    return Math.max(1, questions.length * (Number(timing.secondsPerQuestion) || 1));
  }
  if (timing.mode === "byDifficulty") {
    return Math.max(1, questions.reduce((total, question) => {
      return total + (Number(timing.byDifficultySeconds[question.difficulty]) || 1);
    }, 0));
  }
  return Math.max(1, Number(timing.totalSeconds) || 1);
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function clearSessionTimer() {
  if (state.activeSession?.timerId) {
    clearInterval(state.activeSession.timerId);
    state.activeSession.timerId = null;
  }
}

function startQuestionTimer(question) {
  const session = state.activeSession;
  if (!session || session.mode !== "perQuestionTimed") return;
  clearSessionTimer();
  const limit = getPerQuestionSeconds(question);
  session.currentQuestionStartedAt = Date.now();
  session.currentQuestionTimeLimitSeconds = limit;
  session.currentQuestionRemainingSeconds = limit;
  session.timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - session.currentQuestionStartedAt) / 1000);
    session.currentQuestionRemainingSeconds = Math.max(0, limit - elapsed);
    updateTimerDisplay();
    if (session.currentQuestionRemainingSeconds <= 0) {
      clearSessionTimer();
      timeoutQuestion();
    }
  }, 250);
}

function startSimulationTimer() {
  const session = state.activeSession;
  if (!session || session.mode !== "simulation") return;
  clearSessionTimer();
  session.timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
    session.totalRemainingSeconds = Math.max(0, session.totalTimeLimitSeconds - elapsed);
    updateTimerDisplay();
    if (session.totalRemainingSeconds <= 0) {
      submitSimulation("timeout");
    }
  }, 250);
}

function updateTimerDisplay() {
  const session = state.activeSession;
  if (!session) return;
  const timer = document.querySelector("[data-session-timer]");
  if (!timer) return;
  const remaining = session.mode === "simulation" ? session.totalRemainingSeconds : session.currentQuestionRemainingSeconds;
  timer.textContent = formatTime(remaining);
  timer.classList.toggle("low", Number(remaining) <= 5);
}

function startPractice() {
  clampQuestionCountToMatching();
  const questions = orderedPracticeQuestions();
  if (!questions.length) return;
  const sessionWarnings = validateSessionQuestions(questions);
  if (sessionWarnings.length) {
    setWarnings([...validateAll(), ...sessionWarnings]);
    return;
  }
  const mode = state.practiceSetup.mode;
  const now = Date.now();
  state.activeSession = {
    mode,
    questions,
    currentIndex: 0,
    answers: {},
    startedAt: now,
    submittedAt: null,
    submitReason: null,
    status: "active",
    timerId: null,
    currentQuestionStartedAt: null,
    currentQuestionTimeLimitSeconds: null,
    currentQuestionRemainingSeconds: null,
    totalTimeLimitSeconds: mode === "simulation" ? getSimulationSeconds(questions) : null,
    totalRemainingSeconds: mode === "simulation" ? getSimulationSeconds(questions) : null,
    reviewFilter: "all",
  };
  els.practiceSetup.hidden = true;
  els.practiceSession.hidden = false;
  if (mode === "simulation") startSimulationTimer();
  renderPracticeQuestion();
}

function validateSessionQuestions(questions) {
  const warnings = [];
  const ids = new Set();
  for (const question of questions) {
    if (ids.has(question.id)) warnings.push(`Session generated duplicate question id ${question.id}`);
    ids.add(question.id);
    const optionNums = new Set(questionOptions(question).map((option) => Number(option.option_num)));
    if (!optionNums.has(Number(question.correct_option_num))) {
      warnings.push(`Session question ${question.id} is missing its correct source option`);
    }
  }
  return warnings;
}

function currentQuestion() {
  return state.activeSession?.questions[state.activeSession.currentIndex];
}

function currentAnswer() {
  const question = currentQuestion();
  return question ? state.activeSession.answers[question.id] : null;
}

function getAnswerStatus(question, answer = state.activeSession?.answers[question.id]) {
  if (!answer) return "unanswered";
  return answer.isCorrect ? "correct" : "wrong";
}

function sessionStats(session = state.activeSession) {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let timedOut = 0;
  let answered = 0;
  for (const question of session.questions) {
    const answer = session.answers[question.id];
    if (!answer) {
      unanswered += 1;
    } else {
      answered += 1;
      if (answer.timedOut) timedOut += 1;
      if (answer.isCorrect) correct += 1;
      else wrong += 1;
    }
  }
  const total = session.questions.length;
  const endedAt = session.submittedAt || Date.now();
  const usedSeconds = Math.max(0, Math.round((endedAt - session.startedAt) / 1000));
  return {
    total,
    answered,
    correct,
    wrong,
    unanswered,
    timedOut,
    score: total ? Math.round((correct / total) * 100) : 0,
    usedSeconds,
  };
}

function renderSessionProgress() {
  const session = state.activeSession;
  const stats = sessionStats(session);
  const progress = document.createElement("div");
  progress.className = "session-progress";
  const items = [
    [`${session.currentIndex + 1}/${session.questions.length}`, "Question"],
    [`${stats.answered}/${stats.total}`, "Answered"],
  ];
  if (session.mode !== "simulation") items.push([String(stats.correct), "Correct"]);
  for (const [value, label] of items) {
    const item = document.createElement("span");
    item.innerHTML = `<strong>${value}</strong><small>${label}</small>`;
    progress.append(item);
  }
  return progress;
}

function renderPracticeQuestion() {
  const session = state.activeSession;
  const question = currentQuestion();
  if (!session || !question) {
    if (session?.mode === "simulation" && session.status === "active") return renderSimulationSubmit();
    return renderPracticeComplete();
  }

  const answer = currentAnswer();
  els.practiceSession.replaceChildren();
  if (session.mode === "perQuestionTimed" && !answer) startQuestionTimer(question);

  const card = document.createElement("article");
  card.className = "question-card";
  card.dataset.questionId = question.id;

  const top = document.createElement("div");
  top.className = "session-top";
  const left = document.createElement("span");
  left.textContent = `${session.currentIndex + 1}/${session.questions.length}`;
  const right = document.createElement("span");
  right.textContent = `${question.id} · ${question.difficulty}`;
  top.append(left, right);
  if (session.mode === "perQuestionTimed" || session.mode === "simulation") {
    const timer = document.createElement("span");
    timer.className = "timer-pill";
    timer.dataset.sessionTimer = "true";
    timer.textContent = formatTime(session.mode === "simulation" ? session.totalRemainingSeconds : session.currentQuestionRemainingSeconds);
    top.append(timer);
  }

  const category = renderQuestionCategory(question);

  const prompt = createHebrewElement("div", "", "question-prompt hebrew");
  renderLookupText(prompt, questionPromptDisplay(question), Boolean(answer) && session.mode !== "simulation");

  const options = document.createElement("div");
  options.className = "answer-list";
  for (const option of questionOptions(question)) {
    if (!answer || session.mode === "simulation") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button hebrew";
      button.lang = "he";
      button.dir = "rtl";
      button.dataset.optionNum = String(option.option_num);
      button.textContent = optionDisplayText(option);
      if (answer?.selectedOptionNum === option.option_num) button.classList.add("selected");
      button.addEventListener("click", () => answerQuestion(option.option_num));
      options.append(button);
    } else {
      const answeredOption = document.createElement("div");
      answeredOption.className = "answer-button hebrew";
      answeredOption.lang = "he";
      answeredOption.dir = "rtl";
      answeredOption.dataset.optionNum = String(option.option_num);
      if (option.option_num === question.correct_option_num) answeredOption.classList.add("correct");
      if (option.option_num === answer.selectedOptionNum && !answer.isCorrect) answeredOption.classList.add("wrong");
      renderStableLookupText(answeredOption, optionDisplayText(option), true);
      options.append(answeredOption);
    }
  }

  card.append(top, renderSessionProgress(), category, prompt, options);
  els.practiceSession.append(card);

  if (session.mode === "simulation") renderSimulationFooter();
  else if (answer) renderFeedback(question, answer);
  else renderActivePracticeFooter();
}

function renderLookupText(container, text, lookupEnabled) {
  container.replaceChildren();
  container.classList.toggle("lookup-text", Boolean(lookupEnabled));
  const parts = normalizeHebrewDisplay(text).split(/(\s+|[,.;:!?]+)/);
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      continue;
    }
    const clean = normalizeForSearch(part);
    if (lookupEnabled && /[\u05D0-\u05EA]/.test(part) && clean) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "word-token";
      button.lang = "he";
      button.dir = "rtl";
      button.textContent = part;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openLookupSheet(part);
      });
      container.append(button);
    } else {
      const span = document.createElement("span");
      span.className = "lookup-token";
      span.textContent = part;
      container.append(span);
    }
  }
}

function renderStableLookupText(container, text, lookupEnabled) {
  const displayText = normalizeHebrewDisplay(text);
  container.replaceChildren();
  container.classList.remove("lookup-text");
  container.classList.toggle("lookup-phrase", Boolean(lookupEnabled && /[\u05D0-\u05EA]/.test(displayText)));
  container.textContent = displayText;
  if (lookupEnabled && /[\u05D0-\u05EA]/.test(displayText)) {
    container.tabIndex = 0;
    container.setAttribute("role", "button");
    container.addEventListener("click", (event) => {
      event.stopPropagation();
      openLookupSheet(displayText);
    });
    container.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLookupSheet(displayText);
      }
    });
  } else {
    container.removeAttribute("role");
    container.removeAttribute("tabindex");
  }
}

function answerQuestion(optionNum) {
  const question = currentQuestion();
  const isCorrect = Number(optionNum) === Number(question.correct_option_num);
  if (state.activeSession.mode === "perQuestionTimed") clearSessionTimer();
  state.activeSession.answers[question.id] = {
    selectedOptionNum: optionNum,
    isCorrect,
    answeredAt: Date.now(),
    timedOut: false,
  };
  renderPracticeQuestion();
}

function timeoutQuestion() {
  const question = currentQuestion();
  if (!question || currentAnswer()) return;
  state.activeSession.answers[question.id] = {
    selectedOptionNum: null,
    isCorrect: false,
    answeredAt: Date.now(),
    timedOut: true,
  };
  renderPracticeQuestion();
}

function renderFeedback(question, answer) {
  const feedback = document.createElement("section");
  feedback.className = `feedback-card ${answer.isCorrect ? "correct" : "wrong"}`;

  const status = document.createElement("strong");
  status.textContent = answer.timedOut ? "Time is up" : (answer.isCorrect ? "Correct" : "Wrong");

  const correct = createAnswerDetail("Correct answer", correctAnswerDisplay(question), true);

  const hint = document.createElement("p");
  hint.className = "muted";
  hint.textContent = "Tap Hebrew words above to look them up in the dictionary.";

  const footer = document.createElement("div");
  footer.className = "session-footer";
  const next = document.createElement("button");
  next.type = "button";
  next.className = "next-button";
  next.textContent = state.activeSession.currentIndex + 1 >= state.activeSession.questions.length ? "Finish" : "Next question";
  next.addEventListener("click", nextQuestion);

  const exit = document.createElement("button");
  exit.type = "button";
  exit.className = "plain-button";
  exit.textContent = "End session";
  exit.addEventListener("click", requestEndPractice);

  footer.append(next, exit);
  feedback.append(status, correct, hint);
  els.practiceSession.append(feedback, footer);
}

function renderActivePracticeFooter() {
  const footer = document.createElement("div");
  footer.className = "session-footer";
  const end = document.createElement("button");
  end.type = "button";
  end.className = "plain-button";
  end.textContent = "End session";
  end.addEventListener("click", requestEndPractice);
  footer.append(end);
  els.practiceSession.append(footer);
}

function nextQuestion() {
  if (state.activeSession.mode !== "simulation") clearSessionTimer();
  state.activeSession.currentIndex += 1;
  if (state.activeSession.currentIndex >= state.activeSession.questions.length) {
    if (state.activeSession.mode === "simulation") renderSimulationSubmit();
    else renderPracticeComplete();
  } else {
    renderPracticeQuestion();
  }
}

function renderSimulationFooter() {
  const session = state.activeSession;
  const footer = document.createElement("div");
  footer.className = "session-footer";

  const next = document.createElement("button");
  next.type = "button";
  next.className = "next-button";
  next.textContent = session.currentIndex + 1 >= session.questions.length ? "Review before submit" : "Next question";
  next.addEventListener("click", nextQuestion);

  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "plain-button";
  submit.textContent = "Submit simulation";
  submit.addEventListener("click", () => requestSubmitSimulation());

  const end = document.createElement("button");
  end.type = "button";
  end.className = "plain-button";
  end.textContent = "End session";
  end.addEventListener("click", requestEndPractice);

  footer.append(next, submit, end);
  els.practiceSession.append(footer);
}

function renderSimulationSubmit() {
  const session = state.activeSession;
  els.practiceSession.replaceChildren();
  const answered = Object.keys(session.answers).length;
  const card = document.createElement("section");
  card.className = "setup-card";
  card.innerHTML = `
    <h2>Submit simulation</h2>
    <p><strong>${answered}/${session.questions.length}</strong> answered</p>
    <p class="muted">Feedback and dictionary lookup unlock after submission.</p>
  `;
  const timer = document.createElement("div");
  timer.className = "timer-pill";
  timer.dataset.sessionTimer = "true";
  timer.textContent = formatTime(session.totalRemainingSeconds);
  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "secondary-action";
  submit.textContent = "Submit now";
  submit.addEventListener("click", () => requestSubmitSimulation());
  const back = document.createElement("button");
  back.type = "button";
  back.className = "plain-button";
  back.textContent = "Back to questions";
  back.addEventListener("click", () => {
    session.currentIndex = Math.max(0, session.questions.length - 1);
    renderPracticeQuestion();
  });
  const end = document.createElement("button");
  end.type = "button";
  end.className = "plain-button";
  end.textContent = "End session";
  end.addEventListener("click", requestEndPractice);
  card.append(timer, submit, back, end);
  els.practiceSession.append(card);
}

function requestSubmitSimulation() {
  const session = state.activeSession;
  const unanswered = session.questions.length - Object.keys(session.answers).length;
  if (unanswered > 0 && !window.confirm(`${unanswered} unanswered questions. Submit simulation?`)) return;
  submitSimulation("manual");
}

function submitSimulation(reason) {
  const session = state.activeSession;
  if (!session || session.mode !== "simulation" || session.status !== "active") return;
  clearSessionTimer();
  session.status = "review";
  session.submittedAt = Date.now();
  session.submitReason = reason;
  session.totalRemainingSeconds = Math.max(0, session.totalRemainingSeconds || 0);
  renderSimulationResults();
}

function renderSimulationResults() {
  const session = state.activeSession;
  const stats = sessionStats(session);
  stats.usedSeconds = Math.min(session.totalTimeLimitSeconds, stats.usedSeconds);
  els.practiceSession.replaceChildren();
  const card = document.createElement("section");
  card.className = "setup-card";
  const reason = session.submitReason === "timeout" ? "Time expired" : "Submitted manually";
  card.innerHTML = `
    <h2>Simulation results</h2>
    <p class="muted">${reason}</p>
    <div class="results-grid">
      <div class="result-metric"><strong>${stats.total}</strong><span>Total</span></div>
      <div class="result-metric success-metric"><strong>${stats.score}%</strong><span>Success</span></div>
      <div class="result-metric"><strong>${stats.correct}</strong><span>Correct</span></div>
      <div class="result-metric"><strong>${stats.wrong}</strong><span>Wrong</span></div>
      <div class="result-metric"><strong>${stats.unanswered}</strong><span>Unanswered</span></div>
      <div class="result-metric"><strong>${formatTime(stats.usedSeconds)}</strong><span>Time used</span></div>
    </div>
  `;
  const review = document.createElement("button");
  review.type = "button";
  review.className = "secondary-action";
  review.textContent = "Review questions";
  review.addEventListener("click", () => renderSimulationReview());
  const back = document.createElement("button");
  back.type = "button";
  back.className = "plain-button";
  back.textContent = "Back to setup";
  back.addEventListener("click", endPractice);
  card.append(review, back);
  els.practiceSession.append(card);
}

function renderSimulationReview(filter = state.activeSession?.reviewFilter || "all") {
  const session = state.activeSession;
  session.reviewFilter = filter;
  els.practiceSession.replaceChildren();
  const wrapper = document.createElement("section");
  wrapper.className = "review-list";
  const header = document.createElement("article");
  header.className = "setup-card";
  header.innerHTML = "<h2>Simulation review</h2><p class=\"muted\">Tap Hebrew words to look them up.</p>";
  header.append(renderReviewFilters(session), renderReviewJumpList(session, filter));
  wrapper.append(header);
  for (const question of filteredReviewQuestions(session, filter)) {
    wrapper.append(renderReviewCard(question, session.answers[question.id]));
  }
  const back = document.createElement("button");
  back.type = "button";
  back.className = "secondary-action";
  back.textContent = "Back to results";
  back.addEventListener("click", renderSimulationResults);
  wrapper.append(back);
  els.practiceSession.append(wrapper);
}

function filteredReviewQuestions(session, filter) {
  if (filter === "all") return session.questions;
  return session.questions.filter((question) => getAnswerStatus(question, session.answers[question.id]) === filter);
}

function renderReviewFilters(session) {
  const stats = sessionStats(session);
  const filters = [
    ["all", `All ${stats.total}`],
    ["wrong", `Wrong ${stats.wrong}`],
    ["unanswered", `Unanswered ${stats.unanswered}`],
    ["correct", `Correct ${stats.correct}`],
  ];
  const controls = document.createElement("div");
  controls.className = "review-filters";
  for (const [filter, label] of filters) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "chip-button";
    button.setAttribute("aria-pressed", String(session.reviewFilter === filter));
    button.addEventListener("click", () => renderSimulationReview(filter));
    controls.append(button);
  }
  return controls;
}

function renderReviewJumpList(session, filter) {
  const questions = filteredReviewQuestions(session, filter);
  const list = document.createElement("div");
  list.className = "jump-list";
  if (!questions.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No questions in this filter.";
    list.append(empty);
    return list;
  }
  for (const question of questions) {
    const index = session.questions.indexOf(question) + 1;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `index-chip ${getAnswerStatus(question, session.answers[question.id])}`;
    chip.textContent = String(index);
    chip.addEventListener("click", () => {
      document.querySelector(`[data-review-id="${question.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    list.append(chip);
  }
  return list;
}

function renderReviewCard(question, answer) {
  const status = getAnswerStatus(question, answer);
  const card = document.createElement("article");
  card.className = `review-card ${status}`;
  card.dataset.reviewId = question.id;
  card.dataset.questionId = question.id;
  const meta = renderQuestionCategory(question, status);
  const prompt = createHebrewElement("div", "", "question-prompt hebrew");
  renderLookupText(prompt, questionPromptDisplay(question), true);
  const options = document.createElement("div");
  options.className = "answer-list";
  for (const option of questionOptions(question)) {
    const item = document.createElement("div");
    item.className = "answer-button hebrew";
    item.lang = "he";
    item.dir = "rtl";
    item.dataset.optionNum = String(option.option_num);
    if (answer?.selectedOptionNum === option.option_num) item.classList.add("selected");
    if (option.option_num === question.correct_option_num) item.classList.add("correct");
    if (answer?.selectedOptionNum === option.option_num && !answer.isCorrect) item.classList.add("wrong");
    const badges = [];
    if (answer?.selectedOptionNum === option.option_num) badges.push("Selected");
    if (option.option_num === question.correct_option_num) badges.push("Correct");
    renderStableLookupText(item, optionDisplayText(option), true);
    if (badges.length) {
      const badge = document.createElement("span");
      badge.className = "answer-badge";
      badge.textContent = badges.join(" + ");
      item.append(document.createTextNode(" "), badge);
    }
    options.append(item);
  }
  const details = document.createElement("div");
  details.className = "feedback-card";
  const selected = questionOptions(question).find((option) => option.option_num === answer?.selectedOptionNum);
  const selectedLine = createAnswerDetail("Selected answer", selected ? optionDisplayText(selected) : "Unanswered", Boolean(selected));
  const correctLine = createAnswerDetail("Correct answer", correctAnswerDisplay(question), true);
  details.append(selectedLine, correctLine);
  card.append(meta, prompt, options, details);
  return card;
}

function renderPracticeComplete() {
  clearSessionTimer();
  const session = state.activeSession;
  session.status = "complete";
  session.submittedAt = Date.now();
  const stats = sessionStats(session);

  els.practiceSession.replaceChildren();
  const card = document.createElement("section");
  card.className = "setup-card";
  card.innerHTML = `
    <h2>Session complete</h2>
    <p class="muted">${session.mode === "perQuestionTimed" ? "Timed per-question practice" : "Untimed practice"}</p>
    <div class="results-grid">
      <div class="result-metric"><strong>${stats.total}</strong><span>Total</span></div>
      <div class="result-metric success-metric"><strong>${stats.score}%</strong><span>Success</span></div>
      <div class="result-metric"><strong>${stats.correct}</strong><span>Correct</span></div>
      <div class="result-metric"><strong>${stats.wrong}</strong><span>Wrong</span></div>
      <div class="result-metric"><strong>${stats.unanswered}</strong><span>Unanswered</span></div>
      <div class="result-metric"><strong>${stats.timedOut}</strong><span>Timed out</span></div>
      <div class="result-metric"><strong>${formatTime(stats.usedSeconds)}</strong><span>Time used</span></div>
    </div>
  `;
  const back = document.createElement("button");
  back.type = "button";
  back.className = "secondary-action";
  back.textContent = "Back to setup";
  back.addEventListener("click", endPractice);
  card.append(back);
  els.practiceSession.append(card);
}

function requestEndPractice() {
  if (!state.activeSession) return;
  const message = state.activeSession.mode === "simulation"
    ? "End this active simulation and lose current answers?"
    : "End this active practice session and lose current progress?";
  if (window.confirm(message)) endPractice();
}

function endPractice() {
  clearSessionTimer();
  state.activeSession = null;
  els.practiceSession.hidden = true;
  els.practiceSession.replaceChildren();
  els.practiceSetup.hidden = false;
  renderPracticeSetupSummary();
}

function openLookupSheet(rawWord) {
  const lookup = normalizeForSearch(rawWord);
  const exact = state.dictionaryLookupEntries.filter((entry) => {
    return entry.termSearch === lookup || entry.unpointedSearch === lookup;
  });
  const candidates = exact.length ? exact : state.dictionaryLookupEntries.filter((entry) => {
    return lookup && (entry.termSearch.includes(lookup) || entry.unpointedSearch.includes(lookup));
  }).slice(0, 8);

  els.lookupContent.replaceChildren();
  const heading = createHebrewElement("p", rawWord, "hebrew");
  heading.style.fontWeight = "800";
  els.lookupContent.append(heading);

  if (!candidates.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No dictionary match found";
    els.lookupContent.append(empty);
  } else {
    for (const entry of candidates.slice(0, 8)) {
      els.lookupContent.append(renderLookupCard(entry));
    }
  }

  els.lookupSheet.hidden = false;
}

function renderLookupCard(entry) {
  const card = document.createElement("article");
  card.className = "lookup-card";
  card.append(
    createHebrewElement("h3", entry.term, "hebrew"),
    createHebrewElement("p", entry.explanation, "hebrew"),
  );
  const example = createHebrewElement("p", entry.example || "No example in source", `hebrew${entry.example ? "" : " empty-source-value"}`);
  const meta = document.createElement("p");
  meta.className = "muted";
  meta.textContent = `unit ${entry.unit} · entry ${entry.entry_num}`;
  card.append(example, meta);
  return card;
}

function closeLookupSheet() {
  els.lookupSheet.hidden = true;
}

function validateDictionary(rows) {
  const warnings = [];
  const units = new Set(rows.map((row) => Number(row.unit)));
  const byUnit = new Map();
  for (const row of rows) byUnit.set(Number(row.unit), (byUnit.get(Number(row.unit)) || 0) + 1);
  const badUnits = [...byUnit].filter(([, count]) => count !== 100).map(([unit]) => unit);
  const reviewCount = rows.filter(isNeedsReview).length;
  const sourceEmpty = rows.find((row) => Number(row.global_num) === 1615 && Number(row.unit) === 17 && Number(row.entry_num) === 15);

  if (rows.length !== 2000) warnings.push(`Dictionary expected 2000 rows, found ${rows.length}`);
  if (units.size !== 20) warnings.push(`Dictionary expected 20 units, found ${units.size}`);
  if (badUnits.length) warnings.push(`Dictionary units without 100 entries: ${badUnits.join(", ")}`);
  if (reviewCount !== 0) warnings.push(`Dictionary unresolved needs_review count is ${reviewCount}`);
  if (!sourceEmpty || sourceEmpty.example !== "" || isNeedsReview(sourceEmpty)) {
    warnings.push("Dictionary source-confirmed empty example row 1615 is not configured correctly");
  }
  console.log("Dictionary validation", { rows: rows.length, units: units.size, badUnits, reviewCount, sourceEmpty });
  return warnings;
}

function validatePractice(rows) {
  const warnings = [];
  const units = new Set(rows.map((row) => Number(row.unit)));
  const reviewCount = rows.filter(isNeedsReview).length;
  const target = rows.find((row) => row.id === "U06-D-04");
  const difficultyCounts = rows.reduce((counts, row) => {
    counts[row.difficulty] = (counts[row.difficulty] || 0) + 1;
    return counts;
  }, {});
  const badBuckets = [];

  for (let unit = 1; unit <= 20; unit += 1) {
    for (const type of Object.keys(QUESTION_TYPES)) {
      const count = rows.filter((row) => Number(row.unit) === unit && row.exercise_type === type).length;
      if (count !== 8) badBuckets.push(`U${String(unit).padStart(2, "0")}-${type}:${count}`);
    }
  }

  if (rows.length !== 640) warnings.push(`Practice expected 640 questions, found ${rows.length}`);
  if (units.size !== 20) warnings.push(`Practice expected 20 units, found ${units.size}`);
  if (badBuckets.length) warnings.push(`Practice unit/type buckets not equal to 8: ${badBuckets.join(", ")}`);
  if (reviewCount !== 0) warnings.push(`Practice unresolved needs_review count is ${reviewCount}`);
  if ((difficultyCounts.undefined || 0) !== rows.length) {
    warnings.push(`Practice expected all ${rows.length} questions to have undefined difficulty, found ${difficultyCounts.undefined || 0}`);
  }
  for (const difficulty of ["easy", "medium", "hard"]) {
    if ((difficultyCounts[difficulty] || 0) !== 0) warnings.push(`Practice ${difficulty} difficulty count should currently be 0`);
  }
  if (!target || target.correct_answer_text !== "\u05D8\u05D9\u05E8\u05D4" || Number(target.correct_option_num) !== 1 || isNeedsReview(target)) {
    warnings.push("Practice U06-D-04 is not corrected to \u05D8\u05D9\u05E8\u05D4");
  }
  console.log("Practice validation", { rows: rows.length, units: units.size, badBuckets, reviewCount, difficultyCounts, target });
  return warnings;
}

function validateTimingSettings() {
  const warnings = [];
  const timing = state.practiceSetup.timing;
  if (state.practiceSetup.mode === "perQuestionTimed") {
    if (timing.perQuestion.mode === "fixed" && Number(timing.perQuestion.fixedSeconds) <= 0) {
      warnings.push("Fixed per-question time must be greater than 0");
    }
    if (timing.perQuestion.mode === "byDifficulty") {
      for (const [difficulty, seconds] of Object.entries(timing.perQuestion.byDifficultySeconds)) {
        if (Number(seconds) <= 0) warnings.push(`${difficulty} per-question time must be greater than 0`);
      }
    }
  }
  if (state.practiceSetup.mode === "simulation") {
    if (timing.simulation.mode === "fixedTotal" && Number(timing.simulation.totalSeconds) <= 0) {
      warnings.push("Simulation total time must be greater than 0");
    }
    if (timing.simulation.mode === "perQuestion" && Number(timing.simulation.secondsPerQuestion) <= 0) {
      warnings.push("Simulation seconds per question must be greater than 0");
    }
    if (timing.simulation.mode === "byDifficulty") {
      for (const [difficulty, seconds] of Object.entries(timing.simulation.byDifficultySeconds)) {
        if (Number(seconds) <= 0) warnings.push(`${difficulty} simulation time must be greater than 0`);
      }
    }
  }
  return warnings;
}

function validateAll() {
  return [
    ...validateDictionary(state.dictionaryEntries),
    ...validatePractice(state.practiceQuestions),
    ...validateTimingSettings(),
  ];
}

async function loadDataset(key, normalizeRow) {
  const response = await fetch(DATASETS[key], { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${DATASETS[key]} (${response.status})`);
  return parseJsonl(await response.text(), DATASETS[key], normalizeRow);
}

async function loadAll() {
  try {
    setupControls();
    bindEvents();
    const [dictionary, practice] = await Promise.all([
      loadDataset("dictionary", normalizeDictionaryEntry),
      loadDataset("practice", normalizePracticeQuestion),
    ]);
    state.dictionaryEntries = dictionary;
    state.dictionaryDisplayTerms = buildDictionaryDisplayTerms(dictionary);
    state.practiceQuestions = practice.map(addPracticeDisplayText);
    state.dictionaryLookupEntries = dictionary.map((entry) => ({
      ...entry,
      termSearch: normalizeForSearch(entry.term),
      unpointedSearch: normalizeForSearch(entry.term_unpointed),
    }));
    setWarnings(validateAll());
    els.loadState.textContent = "Ready";
    clampQuestionCountToMatching();
    renderStudy();
    renderPracticeSetupSummary();
  } catch (error) {
    console.error(error);
    els.loadState.textContent = "Error";
    setWarnings([error.message]);
  }
}

applyTheme(loadTheme());
loadAll();
