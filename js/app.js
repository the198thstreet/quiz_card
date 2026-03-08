let allCards = [];
let filteredCards = [];
let currentIndex = 0;
let isFlipped = false;
let touchStartX = 0;
let touchStartY = 0;
let suppressClick = false;
let studyMode = "all";

const DEFAULT_SUBJECT = "전체";
const STORAGE_KEY = document.body.dataset.storageKey || "quiz-card-state";
const CARD_MANIFEST_PATH = document.body.dataset.cardManifest || "js/cards/index.json";
const CARD_STATUS = {
  review: "review",
  known: "known"
};

const flashCard = document.getElementById("flashCard");
const frontSubject = document.getElementById("frontSubject");
const frontText = document.getElementById("frontText");
const backText = document.getElementById("backText");
const cardInfo = document.getElementById("cardInfo");
const subjectFilter = document.getElementById("subjectFilter");
const flipBtn = document.getElementById("flipBtn");
const cardStatusBadge = document.getElementById("cardStatusBadge");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const reviewCount = document.getElementById("reviewCount");
const unmarkedCount = document.getElementById("unmarkedCount");
const knownCount = document.getElementById("knownCount");
const studyModeText = document.getElementById("studyModeText");
const studySummaryText = document.getElementById("studySummaryText");
const modeSwitch = document.getElementById("modeSwitch");
const reviewBtn = document.getElementById("reviewBtn");
const knownBtn = document.getElementById("knownBtn");
const resetBtn = document.getElementById("resetBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

function getCardKey(card) {
  return `${card.subject}::${card.question}`;
}

function getSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function persistState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function saveState() {
  const activeSubject = subjectFilter.value || DEFAULT_SUBJECT;
  const currentCard = filteredCards[currentIndex];
  const savedState = getSavedState();

  persistState({
    learning: savedState.learning || {},
    viewed: savedState.viewed || {},
    subject: activeSubject,
    cardKey: currentCard ? getCardKey(currentCard) : "",
    isFlipped,
    studyMode
  });
}

function saveLearningStatus(card, status) {
  const savedState = getSavedState();
  const learning = savedState.learning || {};
  learning[getCardKey(card)] = status;

  persistState({
    ...savedState,
    learning,
    subject: subjectFilter.value || DEFAULT_SUBJECT,
    cardKey: getCardKey(card),
    isFlipped,
    studyMode
  });
}

function getLearningMap() {
  return getSavedState().learning || {};
}

function getTodayStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function recordViewedCard(card) {
  const savedState = getSavedState();
  const viewed = savedState.viewed || {};
  const today = getTodayStamp();
  const todayViewed = new Set(viewed[today] || []);
  todayViewed.add(getCardKey(card));

  persistState({
    ...savedState,
    viewed: {
      ...viewed,
      [today]: [...todayViewed]
    }
  });
}

function clearLearningStatus(card) {
  const savedState = getSavedState();
  const learning = savedState.learning || {};
  delete learning[getCardKey(card)];

  persistState({
    ...savedState,
    learning,
    subject: subjectFilter.value || DEFAULT_SUBJECT,
    cardKey: filteredCards[currentIndex] ? getCardKey(filteredCards[currentIndex]) : "",
    isFlipped,
    studyMode
  });
}

function clearAllLearningState() {
  persistState({
    learning: {},
    viewed: {},
    isFlipped: false,
    studyMode: "all",
    cardKey: "",
    subject: DEFAULT_SUBJECT
  });
}

function setFlipState(nextFlipped) {
  isFlipped = nextFlipped;
  flashCard.classList.toggle("flipped", isFlipped);
  flipBtn.textContent = isFlipped ? "문제 보기" : "정답 보기";
  flipBtn.setAttribute("aria-pressed", String(isFlipped));
  saveState();
}

function toggleFlip() {
  if (filteredCards.length === 0) return;
  setFlipState(!isFlipped);
}

function updateProgress() {
  if (filteredCards.length === 0) {
    cardInfo.textContent = "0 / 0";
    progressFill.style.width = "0%";
    progressText.textContent =
      studyMode === "review"
        ? "복습 필요 카드가 없습니다"
        : studyMode === "unmarked"
          ? "안 본 카드가 없습니다"
          : "표시할 카드가 없습니다";
    return;
  }

  const progress = ((currentIndex + 1) / filteredCards.length) * 100;
  cardInfo.textContent = `${currentIndex + 1} / ${filteredCards.length}`;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `${frontSubject.textContent} 과목 ${filteredCards.length}문제`;
}

function updateStudyStats() {
  const learning = getLearningMap();
  const selectedSubject = subjectFilter.value || DEFAULT_SUBJECT;
  const scopedCards =
    selectedSubject === DEFAULT_SUBJECT
      ? allCards
      : allCards.filter(card => card.subject === selectedSubject);

  let reviewTotal = 0;
  let unmarkedTotal = 0;
  let knownTotal = 0;

  scopedCards.forEach(card => {
    const status = learning[getCardKey(card)];
    if (status === CARD_STATUS.review) {
      reviewTotal += 1;
    } else if (status === CARD_STATUS.known) {
      knownTotal += 1;
    } else {
      unmarkedTotal += 1;
    }
  });

  reviewCount.textContent = String(reviewTotal);
  unmarkedCount.textContent = String(unmarkedTotal);
  knownCount.textContent = String(knownTotal);

  const subjectLabel = selectedSubject === DEFAULT_SUBJECT ? "전체 과목" : `${selectedSubject} 과목`;
  const totalCount = scopedCards.length;
  const completionRate = totalCount > 0 ? Math.round((knownTotal / totalCount) * 100) : 0;
  const reviewRate = totalCount > 0 ? Math.round((reviewTotal / totalCount) * 100) : 0;
  const todayViewed = new Set((getSavedState().viewed || {})[getTodayStamp()] || []);
  const todayCount = scopedCards.filter(card => todayViewed.has(getCardKey(card))).length;

  studyModeText.textContent =
    studyMode === "review"
      ? `${subjectLabel} 복습 필요 카드만 보는 중`
      : studyMode === "unmarked"
        ? `${subjectLabel} 안 본 카드만 보는 중`
        : `${subjectLabel} 학습 중`;
  studySummaryText.textContent = `완료율 ${completionRate}% · 복습 ${reviewRate}% · 오늘 ${todayCount}장`;
}

function updateActionButtons() {
  if (filteredCards.length === 0) {
    reviewBtn.disabled = true;
    knownBtn.disabled = true;
    resetBtn.disabled = true;
    cardStatusBadge.textContent = "미분류";
    cardStatusBadge.classList.remove("is-review", "is-known");
    return;
  }

  const currentCard = filteredCards[currentIndex];
  const status = getLearningMap()[getCardKey(currentCard)];

  reviewBtn.disabled = false;
  knownBtn.disabled = false;
  resetBtn.disabled = false;
  reviewBtn.textContent = status === CARD_STATUS.review ? "복습하기 등록됨" : "복습하기 등록";
  knownBtn.textContent = status === CARD_STATUS.known ? "학습완료 처리됨" : "학습완료 처리";
  reviewBtn.setAttribute("aria-pressed", String(status === CARD_STATUS.review));
  knownBtn.setAttribute("aria-pressed", String(status === CARD_STATUS.known));
  cardStatusBadge.classList.remove("is-review", "is-known");

  if (status === CARD_STATUS.review) {
    cardStatusBadge.textContent = "복습 필요";
    cardStatusBadge.classList.add("is-review");
  } else if (status === CARD_STATUS.known) {
    cardStatusBadge.textContent = "학습 완료";
    cardStatusBadge.classList.add("is-known");
  } else {
    cardStatusBadge.textContent = "미분류";
  }
}

function applyTextDensity(element, text) {
  element.classList.remove("is-medium", "is-small");

  const normalizedLength = text.replace(/\s+/g, "").length;
  const lineCount = text.split("\n").length;

  if (normalizedLength > 42 || lineCount >= 3) {
    element.classList.add("is-medium");
  }

  if (normalizedLength > 88 || lineCount >= 5) {
    element.classList.remove("is-medium");
    element.classList.add("is-small");
  }
}

function getCardsForCurrentMode(selectedSubject = subjectFilter.value) {
  const baseCards =
    selectedSubject === DEFAULT_SUBJECT
      ? [...allCards]
      : allCards.filter(card => card.subject === selectedSubject);

  if (studyMode === "all") {
    return baseCards;
  }

  const learning = getLearningMap();
  if (studyMode === "review") {
    return baseCards.filter(card => learning[getCardKey(card)] === CARD_STATUS.review);
  }

  if (studyMode === "unmarked") {
    return baseCards.filter(card => !learning[getCardKey(card)]);
  }

  return baseCards;
}

async function loadCardManifest() {
  const manifestUrl = new URL(CARD_MANIFEST_PATH, window.location.href);
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error("카드 목록 파일을 불러오지 못했습니다.");
  }

  const manifest = await response.json();
  if (!Array.isArray(manifest.files)) {
    return [];
  }

  return manifest.files.map(filePath => new URL(filePath, manifestUrl).href);
}

async function loadCardFile(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`${filePath} 파일을 불러오지 못했습니다.`);
  }

  const cards = await response.json();
  if (!Array.isArray(cards)) {
    throw new Error(`${filePath} 파일 형식이 올바르지 않습니다.`);
  }

  return cards;
}

async function loadCards() {
  try {
    const files = await loadCardManifest();
    const cardSets = await Promise.all(files.map(loadCardFile));
    allCards = cardSets.flat();

    setupSubjects();
    restoreState();
  } catch (error) {
    frontSubject.textContent = "오류";
    frontText.textContent = "카드 데이터를 불러오지 못했습니다.";
    backText.textContent = error.message;
    updateProgress();
    console.error(error);
  }
}

function setupSubjects() {
  const subjectCounts = allCards.reduce((counts, card) => {
    counts[card.subject] = (counts[card.subject] || 0) + 1;
    return counts;
  }, {});
  const subjects = Object.keys(subjectCounts);

  subjectFilter.innerHTML = `<option value="${DEFAULT_SUBJECT}">${DEFAULT_SUBJECT} (${allCards.length})</option>`;
  subjects.forEach(subject => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = `${subject} (${subjectCounts[subject]})`;
    subjectFilter.appendChild(option);
  });
}

function renderEmptyCard() {
  frontSubject.textContent = "과목";
  frontText.textContent = allCards.length === 0 ? "아직 등록된 카드가 없습니다" : "해당 카드가 없습니다";
  backText.textContent =
    allCards.length === 0
      ? "과목별 JSON 파일에 카드를 추가해보세요"
      : studyMode === "review"
        ? "복습 필요로 표시된 카드가 없습니다"
        : studyMode === "unmarked"
          ? "안 본 상태의 카드가 없습니다"
          : "필터를 변경해보세요";
  applyTextDensity(frontText, frontText.textContent);
  applyTextDensity(backText, backText.textContent);
  setFlipState(false);
  updateProgress();
  updateStudyStats();
  updateActionButtons();
}

function renderCard() {
  if (filteredCards.length === 0) {
    renderEmptyCard();
    return;
  }

  const card = filteredCards[currentIndex];
  frontSubject.textContent = card.subject;
  frontText.textContent = card.question;
  backText.textContent = card.answer;
  recordViewedCard(card);
  applyTextDensity(frontText, card.question);
  applyTextDensity(backText, card.answer);
  updateProgress();
  updateStudyStats();
  updateActionButtons();
  saveState();
}

function nextCard() {
  if (filteredCards.length === 0) return;
  currentIndex = (currentIndex + 1) % filteredCards.length;
  setFlipState(false);
  renderCard();
}

function prevCard() {
  if (filteredCards.length === 0) return;
  currentIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
  setFlipState(false);
  renderCard();
}

function shuffleCards() {
  for (let i = filteredCards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [filteredCards[i], filteredCards[j]] = [filteredCards[j], filteredCards[i]];
  }
  currentIndex = 0;
  setFlipState(false);
  renderCard();
}

function filterCards() {
  filteredCards = getCardsForCurrentMode(subjectFilter.value);
  currentIndex = 0;
  setFlipState(false);
  renderCard();
  updateStudyStats();
}

function restoreState() {
  const savedState = getSavedState();
  const savedSubject = savedState.subject || DEFAULT_SUBJECT;
  const hasSavedSubject = [...subjectFilter.options].some(option => option.value === savedSubject);

  studyMode = savedState.studyMode === "review" ? "review" : "all";
  if (savedState.studyMode === "unmarked") {
    studyMode = "unmarked";
  }

  subjectFilter.value = hasSavedSubject ? savedSubject : DEFAULT_SUBJECT;
  setModeButtons();
  filteredCards = getCardsForCurrentMode(subjectFilter.value);

  if (savedState.cardKey) {
    const savedIndex = filteredCards.findIndex(card => getCardKey(card) === savedState.cardKey);
    currentIndex = savedIndex >= 0 ? savedIndex : 0;
  } else {
    currentIndex = 0;
  }

  renderCard();
  setFlipState(Boolean(savedState.isFlipped && filteredCards.length > 0));
  updateStudyStats();
}

function setModeButtons() {
  modeSwitch.querySelectorAll(".mode-btn").forEach(button => {
    const isActive = button.dataset.mode === studyMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setStudyMode(nextMode) {
  studyMode = nextMode;
  setModeButtons();
  filterCards();
  saveState();
}

function markCurrentCard(status) {
  if (filteredCards.length === 0) return;

  const currentCard = filteredCards[currentIndex];
  const currentKey = getCardKey(currentCard);
  saveLearningStatus(currentCard, status);
  updateStudyStats();

  if (studyMode === "review" || studyMode === "unmarked") {
    filteredCards = getCardsForCurrentMode(subjectFilter.value);

    if (filteredCards.length === 0) {
      currentIndex = 0;
      renderCard();
      return;
    }

    const nextIndex = filteredCards.findIndex(card => getCardKey(card) === currentKey);
    currentIndex = nextIndex >= 0 ? nextIndex : Math.min(currentIndex, filteredCards.length - 1);
    setFlipState(false);
    renderCard();
    return;
  }

  if (filteredCards.length > 1) {
    nextCard();
    return;
  }

  setFlipState(false);
  renderCard();
}

function resetCurrentCardStatus() {
  if (filteredCards.length === 0) return;

  const currentCard = filteredCards[currentIndex];
  clearLearningStatus(currentCard);
  updateStudyStats();

  if (studyMode === "review" || studyMode === "unmarked") {
    filteredCards = getCardsForCurrentMode(subjectFilter.value);
    if (filteredCards.length === 0) {
      currentIndex = 0;
      renderCard();
      return;
    }

    const nextIndex = filteredCards.findIndex(card => getCardKey(card) === getCardKey(currentCard));
    currentIndex = nextIndex >= 0 ? nextIndex : Math.min(currentIndex, filteredCards.length - 1);
  }

  renderCard();
}

function resetAllStudyState() {
  const confirmed = window.confirm("복습 기록과 학습 위치를 모두 초기화할까요?");
  if (!confirmed) return;

  clearAllLearningState();
  studyMode = "all";
  subjectFilter.value = DEFAULT_SUBJECT;
  currentIndex = 0;
  setModeButtons();
  filteredCards = getCardsForCurrentMode(DEFAULT_SUBJECT);
  setFlipState(false);
  updateStudyStats();
  renderCard();
}

function handleKeydown(event) {
  if (event.key === "ArrowRight") {
    nextCard();
  } else if (event.key === "ArrowLeft") {
    prevCard();
  } else if (event.key.toLowerCase() === "r") {
    markCurrentCard(CARD_STATUS.review);
  } else if (event.key.toLowerCase() === "k") {
    markCurrentCard(CARD_STATUS.known);
  } else if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    toggleFlip();
  }
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  const touch = event.changedTouches[0];
  const diffX = touch.clientX - touchStartX;
  const diffY = touch.clientY - touchStartY;

  if (Math.abs(diffX) < 50 || Math.abs(diffX) < Math.abs(diffY)) {
    return;
  }

  suppressClick = true;
  if (diffX < 0) {
    nextCard();
  } else {
    prevCard();
  }
}

function handleCardClick() {
  if (suppressClick) {
    suppressClick = false;
    return;
  }

  toggleFlip();
}

document.getElementById("nextBtn").addEventListener("click", nextCard);
document.getElementById("prevBtn").addEventListener("click", prevCard);
document.getElementById("shuffleBtn").addEventListener("click", shuffleCards);
flipBtn.addEventListener("click", toggleFlip);
subjectFilter.addEventListener("change", filterCards);
modeSwitch.addEventListener("click", event => {
  const button = event.target.closest(".mode-btn");
  if (!button) return;
  setStudyMode(button.dataset.mode);
});
reviewBtn.addEventListener("click", () => markCurrentCard(CARD_STATUS.review));
knownBtn.addEventListener("click", () => markCurrentCard(CARD_STATUS.known));
resetBtn.addEventListener("click", resetCurrentCardStatus);
resetAllBtn.addEventListener("click", resetAllStudyState);
flashCard.addEventListener("click", handleCardClick);
flashCard.addEventListener("keydown", handleKeydown);
flashCard.addEventListener("touchstart", handleTouchStart, { passive: true });
flashCard.addEventListener("touchend", handleTouchEnd, { passive: true });

loadCards();
