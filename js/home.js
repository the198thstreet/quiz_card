const QUIZ_CATALOG_PATH = "data/quizzes.json";

const quizGrid = document.getElementById("quizGrid");
const catalogSummary = document.getElementById("catalogSummary");
const catalogDescription = document.getElementById("catalogDescription");
const liveCount = document.getElementById("liveCount");
const soonCount = document.getElementById("soonCount");
const liveSegment = document.getElementById("liveSegment");
const soonSegment = document.getElementById("soonSegment");

function renderQuizCard(item) {
  const isLive = item.status === "live";
  const card = document.createElement(isLive ? "a" : "article");
  card.className = `quiz-card${isLive ? " is-live" : " is-disabled"}`;

  if (isLive) {
    card.href = item.href;
    card.setAttribute("aria-label", `${item.title} 카드 퀴즈로 이동`);
  } else {
    card.setAttribute("aria-disabled", "true");
  }

  const badge = document.createElement("span");
  badge.className = `quiz-badge${isLive ? "" : " is-muted"}`;
  badge.textContent = isLive ? "Available" : "Coming Soon";

  const title = document.createElement("h3");
  title.textContent = item.title;

  const description = document.createElement("p");
  description.textContent = item.description;

  const foot = document.createElement("div");
  foot.className = "quiz-foot";

  const meta = document.createElement("span");
  meta.textContent = item.meta || (isLive ? "지금 학습 가능" : "다음 덱 준비 중");

  const arrow = document.createElement("span");
  arrow.className = "quiz-arrow";
  arrow.textContent = isLive ? "↗" : "··";

  foot.append(meta, arrow);
  card.append(badge, title, description, foot);
  return card;
}

function updateSummary(items) {
  const liveItems = items.filter(item => item.status === "live");
  const soonItems = items.filter(item => item.status !== "live");
  const total = items.length || 1;
  const liveRatio = `${Math.max(12, Math.round((liveItems.length / total) * 100))}%`;
  const soonRatio = `${Math.max(12, Math.round((soonItems.length / total) * 100))}%`;

  catalogSummary.textContent = "카드 구성";
  liveCount.textContent = String(liveItems.length);
  soonCount.textContent = String(soonItems.length);
  liveSegment.style.width = liveRatio;
  soonSegment.style.width = soonRatio;
  if (liveItems.length > 0) {
    catalogDescription.textContent = "바로 열 수 있는 카드 퀴즈와 준비 중인 구성을 보여줍니다.";
  } else {
    catalogDescription.textContent = "아직 공개된 카드 퀴즈가 없습니다.";
  }
}

async function loadCatalog() {
  try {
    const response = await fetch(QUIZ_CATALOG_PATH);
    if (!response.ok) {
      throw new Error("카탈로그를 불러오지 못했습니다.");
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    updateSummary(items);
    quizGrid.innerHTML = "";

    items.forEach(item => {
      quizGrid.appendChild(renderQuizCard(item));
    });
  } catch (error) {
    catalogSummary.textContent = "목록 오류";
    catalogDescription.textContent = error.message;
    liveCount.textContent = "0";
    soonCount.textContent = "0";
    liveSegment.style.width = "50%";
    soonSegment.style.width = "50%";
    quizGrid.innerHTML = "";

    const fallback = document.createElement("article");
    fallback.className = "quiz-card quiz-card-loading is-disabled";
    fallback.innerHTML = `
      <span class="quiz-badge is-muted">Error</span>
      <h3>목록을 표시하지 못했습니다</h3>
      <p>${error.message}</p>
    `;
    quizGrid.appendChild(fallback);
  }
}

loadCatalog();
