const $ = (id) => document.getElementById(id);

const ACCESS_DAYS = "60";
const END_MESSAGE = "Акція завершилась. Слідкуй за наступним запуском.";
const CONTENT_URL = "content.json";

function pad2(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function setTimer(d, h, m, s) {
  const dd = $("dd");
  const hh = $("hh");
  const mm = $("mm");
  const ss = $("ss");
  const ctaTime = $("ctaTime");

  if (dd) dd.textContent = pad2(d);
  if (hh) hh.textContent = pad2(h);
  if (mm) mm.textContent = pad2(m);
  if (ss) ss.textContent = pad2(s);
  if (ctaTime) {
    const totalHours = Math.max(0, d) * 24 + Math.max(0, h);
    ctaTime.textContent = `${totalHours}год ${pad2(m)}хв ${pad2(s)}с`;
  }
}

function endBehavior() {
  setTimer(0, 0, 0, 0);
  const note = $("timerNote");
  if (note) note.textContent = END_MESSAGE;
}

function getTodayDeadline() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (end <= now) {
    end.setDate(end.getDate() + 1);
  }
  return end.getTime();
}

async function loadContent() {
  try {
    const res = await fetch(CONTENT_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load content.json");
    return await res.json();
  } catch (err) {
    console.warn("Content JSON not loaded:", err);
    return null;
  }
}

function applyContent(data) {
  if (!data) return;

  if (data.title) {
    const titleEl = $("courseTitle");
    const ctaProductName = $("ctaProductName");
    if (titleEl) titleEl.textContent = data.title;
    if (ctaProductName) ctaProductName.textContent = data.title;
    document.title = data.title;
  }

  if (data.cta_primary) {
    const ctaPrimary = $("ctaPrimary");
    if (ctaPrimary) ctaPrimary.textContent = data.cta_primary;
  }

  if (data.cta_buy) {
    const buyBtn = $("buyBtn");
    if (buyBtn) buyBtn.textContent = data.cta_buy;
  }

  if (data.price) {
    const priceText = $("priceText");
    const ctaPrice = $("ctaPrice");
    if (priceText) priceText.textContent = data.price;
    if (ctaPrice) ctaPrice.textContent = data.price;
  }

  renderFaq(data.faq);
  renderProgram(data.program);
}

function renderFaq(items) {
  const container = $("faqList");
  if (!container || !Array.isArray(items)) return;

  container.innerHTML = "";
  items.forEach((item) => {
    if (!item || !item.question) return;
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = item.question;

    const answer = document.createElement("p");
    answer.textContent = item.answer || "";

    details.appendChild(summary);
    details.appendChild(answer);
    container.appendChild(details);
  });
}

function renderProgram(items) {
  const timeline = $("programTimeline");
  if (!timeline || !Array.isArray(items) || items.length === 0) return;

  timeline.innerHTML = "";
  items.forEach((item) => {
    if (!item || !item.label) return;
    const li = document.createElement("li");
    const label = document.createElement("b");
    const labelText = String(item.label).trim();
    label.textContent = labelText.endsWith(":") ? labelText : `${labelText}:`;
    li.appendChild(label);
    li.appendChild(document.createTextNode(item.text || ""));
    timeline.appendChild(li);
  });

  scheduleTimelineUpdate();
}

let timelineRaf = null;

function updateTimelineLine() {
  const timeline = $("programTimeline");
  if (!timeline) return;

  const isHorizontal = window.matchMedia("(min-width: 720px)").matches;
  if (!isHorizontal) {
    timeline.style.removeProperty("--timeline-start");
    timeline.style.removeProperty("--timeline-end");
    return;
  }

  const items = timeline.querySelectorAll("li");
  if (!items.length) return;
  timeline.style.setProperty("--timeline-count", items.length);

  const first = items[0];
  const last = items[items.length - 1];
  const firstCenter = first.offsetLeft + first.offsetWidth / 2;
  const lastCenter = last.offsetLeft + last.offsetWidth / 2;
  const totalWidth = Math.max(timeline.scrollWidth, timeline.offsetWidth);

  timeline.style.setProperty("--timeline-start", `${Math.max(0, firstCenter)}px`);
  timeline.style.setProperty(
    "--timeline-end",
    `${Math.max(0, totalWidth - lastCenter)}px`
  );
}

function scheduleTimelineUpdate() {
  if (timelineRaf) cancelAnimationFrame(timelineRaf);
  timelineRaf = requestAnimationFrame(() => {
    timelineRaf = requestAnimationFrame(updateTimelineLine);
  });
}

function isTimelineScrollLockEnabled() {
  return document.body && document.body.dataset.timelineScroll === "lock";
}

function shouldLockTimelineScroll() {
  const scroller = $("programTimelineScroller");
  if (!scroller) return false;

  if (!isTimelineScrollLockEnabled()) return false;
  if (!window.matchMedia("(min-width: 720px)").matches) return false;
  if (scroller.scrollWidth <= scroller.clientWidth + 1) return false;

  const rect = scroller.getBoundingClientRect();
  const center = window.innerHeight * 0.5;
  return rect.top <= center && rect.bottom >= center;
}

function handleTimelineWheel(event) {
  const scroller = $("programTimelineScroller");
  if (!scroller || !shouldLockTimelineScroll()) return;

  const delta =
    Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;
  if (delta === 0) return;

  const maxScroll = scroller.scrollWidth - scroller.clientWidth;
  const atStart = scroller.scrollLeft <= 0;
  const atEnd = scroller.scrollLeft >= maxScroll - 1;

  if ((delta > 0 && !atEnd) || (delta < 0 && !atStart)) {
    event.preventDefault();
    const next = Math.max(0, Math.min(maxScroll, scroller.scrollLeft + delta));
    scroller.scrollLeft = next;
  }
}

function initTimer() {
  const deadline = getTodayDeadline();
  if (Number.isNaN(deadline)) {
    const note = $("timerNote");
    if (note) note.textContent = "Помилка у даті таймера.";
    return;
  }

  function tick() {
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      endBehavior();
      clearInterval(intv);
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    setTimer(d, h, m, s);
  }

  tick();
  const intv = setInterval(tick, 1000);
}

async function init() {
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  const accessText = $("accessText");
  if (accessText) accessText.textContent = ACCESS_DAYS;

  const data = await loadContent();
  applyContent(data);
  scheduleTimelineUpdate();
  window.addEventListener("resize", scheduleTimelineUpdate);
  if (isTimelineScrollLockEnabled()) {
    window.addEventListener("wheel", handleTimelineWheel, { passive: false });
  }

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.style.scrollBehavior = "smooth";
  }

  initTimer();
}

init();
