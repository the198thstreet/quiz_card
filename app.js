let allCards = [];
let filteredCards = [];
let currentIndex = 0;

const flashCard = document.getElementById("flashCard");
const frontSubject = document.getElementById("frontSubject");
const frontText = document.getElementById("frontText");
const backText = document.getElementById("backText");
const cardInfo = document.getElementById("cardInfo");
const subjectFilter = document.getElementById("subjectFilter");

async function loadCards() {
  try {
    const response = await fetch("cards.json");
    if (!response.ok) {
      throw new Error("cards.json을 불러오지 못했습니다");
    }

    allCards = await response.json();
    filteredCards = [...allCards];

    setupSubjects();
    renderCard();
  } catch (error) {
    frontSubject.textContent = "오류";
    frontText.textContent = "카드 데이터를 불러오지 못했습니다";
    backText.textContent = error.message;
    cardInfo.textContent = "0 / 0";
    console.error(error);
  }
}

function setupSubjects() {
  const subjects = [...new Set(allCards.map(card => card.subject))];

  subjectFilter.innerHTML = `<option value="전체">전체</option>`;
  subjects.forEach(subject => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectFilter.appendChild(option);
  });
}

function renderCard() {
  if (filteredCards.length === 0) {
    frontSubject.textContent = "과목";
    frontText.textContent = "해당 카드가 없습니다";
    backText.textContent = "필터를 변경해보세요";
    cardInfo.textContent = "0 / 0";
    flashCard.classList.remove("flipped");
    return;
  }

  const card = filteredCards[currentIndex];
  frontSubject.textContent = card.subject;
  frontText.textContent = card.question;
  backText.textContent = card.answer;
  cardInfo.textContent = `${currentIndex + 1} / ${filteredCards.length}`;
  flashCard.classList.remove("flipped");
}

function nextCard() {
  if (filteredCards.length === 0) return;
  currentIndex = (currentIndex + 1) % filteredCards.length;
  renderCard();
}

function prevCard() {
  if (filteredCards.length === 0) return;
  currentIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
  renderCard();
}

function shuffleCards() {
  for (let i = filteredCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filteredCards[i], filteredCards[j]] = [filteredCards[j], filteredCards[i]];
  }
  currentIndex = 0;
  renderCard();
}

function filterCards() {
  const selected = subjectFilter.value;

  if (selected === "전체") {
    filteredCards = [...allCards];
  } else {
    filteredCards = allCards.filter(card => card.subject === selected);
  }

  currentIndex = 0;
  renderCard();
}

document.getElementById("nextBtn").addEventListener("click", nextCard);
document.getElementById("prevBtn").addEventListener("click", prevCard);
document.getElementById("shuffleBtn").addEventListener("click", shuffleCards);
document.getElementById("flipBtn").addEventListener("click", () => {
  flashCard.classList.toggle("flipped");
});
subjectFilter.addEventListener("change", filterCards);
flashCard.addEventListener("click", () => {
  flashCard.classList.toggle("flipped");
});

loadCards();
