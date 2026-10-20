/* =====================================================================
   Richmond Seventh-day Adventist Church — site scripts
   ---------------------------------------------------------------------
   Linked from every page with "defer".
   The home page's intro photo collage has its own script in index.html.

   1. Settings
   2. Helpers
   3. Mobile menu
   4. Parallax background photos
   5. Event card photos      (Google Drive, with local fallbacks)
   6. Events carousel arrows
   7. Events from Google Calendar (needs an API key)
   8. Events page calendar   (month view on large screens, list on phones)
   ===================================================================== */
"use strict";

/* ---------------------------------------------------------------------
   1. Settings
   --------------------------------------------------------------------- */
const GOOGLE_CALENDAR = {
  calendarId: "ca2c67269866b9614dd8dee7cb0749a64f6071c8e8fce1a24c530f19ffec6d1c@group.calendar.google.com",
  apiKey: "",                // ← paste a Google Calendar API key here to load events automatically
  timeZone: "America/New_York",
  maxEvents: 8
};

/* ---------------------------------------------------------------------
   2. Helpers
   --------------------------------------------------------------------- */
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function onReady(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

/** Create an element with an optional class and text. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/* ---------------------------------------------------------------------
   3. Mobile menu (dialog with focus trap, Esc to close)
   --------------------------------------------------------------------- */
function initMenu() {
  const openBtn = document.querySelector(".nav .nav__toggle");
  const menu = document.getElementById("mobile-menu");
  if (!openBtn || !menu) return;
  const closeBtn = menu.querySelector("[data-menu-close]");
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    openBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }
  function close() {
    menu.classList.remove("is-open");
    openBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => { menu.hidden = true; }, 300);
    (lastFocus || openBtn).focus();
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  document.addEventListener("keydown", (e) => {
    if (menu.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") {                               // keep focus inside the open menu
      const focusable = menu.querySelectorAll("a, button");
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

/* ---------------------------------------------------------------------
   4. Parallax: background photos move slower than the page
   --------------------------------------------------------------------- */
function initParallax() {
  if (prefersReducedMotion()) return;
  const items = [...document.querySelectorAll(".parallax")].map((section) => ({
    section, img: section.querySelector(".parallax__img"), visible: false
  }));
  if (!items.length) return;

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    items.forEach((it) => {
      if (!it.visible) return;
      const r = it.section.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, ((vh - r.top) / (vh + r.height)) * 2 - 1));   // -1 entering, +1 leaving
      it.img.style.transform = "translate3d(0," + (-p * r.height * 0.12).toFixed(1) + "px,0)";
    });
  }
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const it = items.find((i) => i.section === entry.target);
      if (it) it.visible = entry.isIntersecting;
    });
    request();
  }, { rootMargin: "100px 0px" });
  items.forEach((it) => io.observe(it.section));
}

/* ---------------------------------------------------------------------
   5. Event card photos from Google Drive: if one can't load
      (not shared publicly, removed), show the local church photo
   --------------------------------------------------------------------- */
function initCardPhotoFallbacks() {
  document.querySelectorAll(".event-card img[data-fallback]").forEach((img) => {
    const useLocal = () => { img.onerror = null; img.src = img.getAttribute("data-fallback"); };
    img.onerror = useLocal;
    if (img.complete && img.naturalWidth === 0) useLocal();
  });
}

/* ---------------------------------------------------------------------
   6. Events carousel: arrows scroll one card at a time and
      turn off at each end
   --------------------------------------------------------------------- */
function initCarousel() {
  const track = document.getElementById("events-track");
  const prev = document.querySelector("[data-events-prev]");
  const next = document.querySelector("[data-events-next]");
  if (!track || !prev || !next) return;

  const step = () => {
    const card = track.querySelector(".event-card");
    return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 24) : track.clientWidth;
  };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  };

  prev.addEventListener("click", () => track.scrollBy({ left: -step() }));
  next.addEventListener("click", () => track.scrollBy({ left: step() }));
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ---------------------------------------------------------------------
   7. Events from Google Calendar → cards
      Needs a public calendar and an API key (see GOOGLE_CALENDAR).
      Without a key, the cards written in the page are kept.
   --------------------------------------------------------------------- */
function initGoogleCalendarEvents() {
  const track = document.getElementById("events-track");
  if (!track || !GOOGLE_CALENDAR.apiKey) return;

  // Local photo for a card, chosen by words in the event title (first match wins)
  const PHOTO_RULES = [
    [/outreach|literature|community|visit/i, "event-sabbath-worship"],
    [/prayer|pray/i, "event-prayer-meeting"],
    [/vesper|friday|evening/i, "event-vespers"],
    [/lunch|potluck|fellowship|meal|dinner/i, "event-fellowship-lunch"],
    [/thanksgiving/i, "event-thanksgiving"],
    [/christmas|advent|carol/i, "event-christmas"]
  ];
  const DEFAULT_PHOTOS = ["event-sabbath-worship", "event-vespers", "event-fellowship-lunch", "event-prayer-meeting"];
  const photoFor = (title, i) => (PHOTO_RULES.find(([re]) => re.test(title)) || [null, DEFAULT_PHOTOS[i % DEFAULT_PHOTOS.length]])[1];

  const tz = GOOGLE_CALENDAR.timeZone;
  const fmtBadge = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" });
  const fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" });
  const fmtTime = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });

  // Image from Google Drive: an image attached to the event, or a Drive link in its description.
  // The Drive file must be shared as "Anyone with the link".
  function driveImage(ev) {
    const att = (ev.attachments || []).find((a) => /^image\//.test(a.mimeType || "") && a.fileId);
    let id = att && att.fileId;
    if (!id) {
      const m = (ev.description || "").match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
      id = m && m[1];
    }
    return id ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w800" : "";
  }

  // Descriptions can contain HTML: keep plain text, max ~150 characters
  function plainText(html) {
    const d = document.createElement("div");
    d.innerHTML = (html || "").replace(/<br\s*\/?>/gi, " ");
    const t = (d.textContent || "").replace(/https?:\/\/drive\.google\.com\/\S+/g, "").replace(/\s+/g, " ").trim();
    return t.length > 150 ? t.slice(0, 147).replace(/\s+\S*$/, "") + "…" : t;
  }

  function card(ev, i) {
    const allDay = !ev.start.dateTime;
    // All-day events: read the date at noon so it never slips to the day before
    const start = allDay ? new Date(ev.start.date + "T12:00:00") : new Date(ev.start.dateTime);
    const when = fmtDay.format(start) + " · " + (allDay ? "All day" : fmtTime.format(start).toLowerCase());
    const title = ev.summary || "Church event";

    const local = "img/events/" + photoFor(title, i) + ".webp";
    const fromDrive = driveImage(ev);
    const img = Object.assign(el("img"), { src: fromDrive || local, alt: "", width: 800, height: 600, loading: "lazy", decoding: "async" });
    if (fromDrive) {
      img.referrerPolicy = "no-referrer";
      img.onerror = () => { img.onerror = null; img.src = local; };   // not shared publicly → our photo
    }

    const media = el("div", "event-card__media");
    media.append(img, el("span", "event-card__badge", fmtBadge.format(start)));
    const body = el("div", "event-card__body");
    body.append(
      el("span", "event-card__when", when),
      el("h3", "event-card__title", title),
      el("p", "event-card__copy", plainText(ev.description) || ev.location || "Join us at Richmond SDA Church.")
    );
    const li = el("li", "event-card");
    li.append(media, body);
    return li;
  }

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    supportsAttachments: "true",
    timeMin: new Date().toISOString(),
    maxResults: String(GOOGLE_CALENDAR.maxEvents),
    timeZone: tz,
    key: GOOGLE_CALENDAR.apiKey
  });
  const url = "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(GOOGLE_CALENDAR.calendarId) + "/events?" + params;

  fetch(url)
    .then((r) => { if (!r.ok) throw new Error("Calendar " + r.status); return r.json(); })
    .then((data) => {
      const items = (data.items || []).filter((ev) => ev.status !== "cancelled");
      if (!items.length) return;                         // nothing upcoming → keep the written cards
      track.replaceChildren(...items.map(card));
      track.scrollLeft = 0;
      track.dispatchEvent(new Event("scroll"));          // refresh the arrow buttons
    })
    .catch((err) => console.warn("Google Calendar could not be loaded:", err.message));
}

/* ---------------------------------------------------------------------
   8. Events page calendar: month view on large screens, list on phones
   --------------------------------------------------------------------- */
function initCalendarEmbed() {
  const cal = document.querySelector(".calendar__embed[data-src]");
  if (!cal) return;
  cal.src = window.matchMedia("(max-width: 640px)").matches ? cal.getAttribute("data-mobile-src") : cal.getAttribute("data-src");
}

/* ---------------------------------------------------------------------
   Start
   --------------------------------------------------------------------- */
onReady(() => {
  initMenu();
  initParallax();
  initCardPhotoFallbacks();
  initCarousel();
  initGoogleCalendarEvents();
  initCalendarEmbed();
});
