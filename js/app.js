let allCards = [];
let filteredCards = [];
let currentIndex = 0;
let isFlipped = false;
let touchStartX = 0;
let touchStartY = 0;
let suppressClick = false;
let studyMode = "all";

const STORAGE_KEY = "quiz-card-state";
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
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const reviewCount = document.getElementById("reviewCount");
const knownCount = document.getElementById("knownCount");
const studyModeText = document.getElementById("studyModeText");
const modeSwitch = document.getElementById("modeSwitch");
const reviewBtn = document.getElementById("reviewBtn");
const knownBtn = document.getElementById("knownBtn");
const CARD_MANIFEST_PATH = "js/cards/index.json";

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

function saveState() {
  const activeSubject = subjectFilter.value || "전체";
  const currentCard = filteredCards[currentIndex];
  const savedState = getSavedState();
  const cardKey = currentCard ? getCardKey(currentCard) : "";

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      learning: savedState.learning || {},
      subject: activeSubject,
      cardKey,
      isFlipped,
      studyMode
    })
  );
}

function saveLearningStatus(card, status) {
  const savedState = getSavedState();
  const learning = savedState.learning || {};
  learning[getCardKey(card)] = status;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...savedState,
      learning,
      subject: subjectFilter.value || "전체",
      cardKey: getCardKey(card),
      isFlipped,
      studyMode
    })
  );
}

function getLearningMap() {
  return getSavedState().learning || {};
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
    progressText.textContent = studyMode === "review" ? "복습 필요 카드가 없습니다" : "표시할 카드가 없습니다";
    return;
  }

  const progress = ((currentIndex + 1) / filteredCards.length) * 100;
  cardInfo.textContent = `${currentIndex + 1} / ${filteredCards.length}`;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `${frontSubject.textContent} 과목 ${filteredCards.length}문제`;
}

function updateStudyStats() {
  const learning = getLearningMap();
  let reviewTotal = 0;
  let knownTotal = 0;

  allCards.forEach(card => {
    const status = learning[getCardKey(card)];
    if (status === CARD_STATUS.review) {
      reviewTotal += 1;
    } else if (status === CARD_STATUS.known) {
      knownTotal += 1;
    }
  });

  reviewCount.textContent = String(reviewTotal);
  knownCount.textContent = String(knownTotal);
  studyModeText.textContent = studyMode === "review" ? "복습 필요 카드만 보는 중" : "전체 카드 학습 중";
}

function updateActionButtons() {
  if (filteredCards.length === 0) {
    reviewBtn.disabled = true;
    knownBtn.disabled = true;
    return;
  }

  const currentCard = filteredCards[currentIndex];
  const status = getLearningMap()[getCardKey(currentCard)];

  reviewBtn.disabled = false;
  knownBtn.disabled = false;
  reviewBtn.textContent = status === CARD_STATUS.review ? "복습 필요 표시됨" : "복습 필요";
  knownBtn.textContent = status === CARD_STATUS.known ? "학습 완료 표시됨" : "학습 완료";
  reviewBtn.setAttribute("aria-pressed", String(status === CARD_STATUS.review));
  knownBtn.setAttribute("aria-pressed", String(status === CARD_STATUS.known));
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
    selectedSubject === "전체"
      ? [...allCards]
      : allCards.filter(card => card.subject === selectedSubject);

  if (studyMode !== "review") {
    return baseCards;
  }

  const learning = getLearningMap();
  return baseCards.filter(card => learning[getCardKey(card)] === CARD_STATUS.review);
}

async function loadCardManifest() {
  const response = await fetch(CARD_MANIFEST_PATH);
  if (!response.ok) {
    throw new Error("카드 목록 파일을 불러오지 못했습니다");
  }

  const manifest = await response.json();
  return Array.isArray(manifest.files) ? manifest.files : [];
}

async function loadCardFile(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`${filePath} 파일을 불러오지 못했습니다`);
  }

  const cards = await response.json();
  if (!Array.isArray(cards)) {
    throw new Error(`${filePath} 파일 형식이 올바르지 않습니다`);
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
    frontText.textContent = "카드 데이터를 불러오지 못했습니다";
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

  subjectFilter.innerHTML = `<option value="전체">전체 (${allCards.length})</option>`;
  subjects.forEach(subject => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = `${subject} (${subjectCounts[subject]})`;
    subjectFilter.appendChild(option);
  });
}

function renderCard() {
  if (filteredCards.length === 0) {
    frontSubject.textContent = "과목";
    frontText.textContent = allCards.length === 0 ? "아직 등록된 카드가 없습니다" : "해당 카드가 없습니다";
    backText.textContent =
      allCards.length === 0
        ? "과목별 JSON 파일에 카드를 추가해보세요"
        : studyMode === "review"
          ? "복습 필요로 표시한 카드가 없습니다"
          : "필터를 변경해보세요";
    applyTextDensity(frontText, frontText.textContent);
    applyTextDensity(backText, backText.textContent);
    setFlipState(false);
    updateProgress();
    updateActionButtons();
    return;
  }

  const card = filteredCards[currentIndex];
  frontSubject.textContent = card.subject;
  frontText.textContent = card.question;
  backText.textContent = card.answer;
  applyTextDensity(frontText, card.question);
  applyTextDensity(backText, card.answer);
  updateProgress();
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
  for (let i = filteredCards.length - 1; i > 0; i--) {
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
  const savedSubject = savedState.subject || "전체";
  studyMode = savedState.studyMode === "review" ? "review" : "all";
  const hasSavedSubject = [...subjectFilter.options].some(option => option.value === savedSubject);

  subjectFilter.value = hasSavedSubject ? savedSubject : "전체";
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
    button.classList.toggle("is-active", button.dataset.mode === studyMode);
    button.setAttribute("aria-pressed", String(button.dataset.mode === studyMode));
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
  saveLearningStatus(currentCard, status);
  updateStudyStats();

  if (studyMode === "review") {
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
flashCard.addEventListener("click", handleCardClick);
flashCard.addEventListener("keydown", handleKeydown);
flashCard.addEventListener("touchstart", handleTouchStart, { passive: true });
flashCard.addEventListener("touchend", handleTouchEnd, { passive: true });

loadCards();
