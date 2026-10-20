/* =====================================================================
   Richmond Seventh-day Adventist Church — site scripts
   ---------------------------------------------------------------------
   Linked from every page:
     • index.html loads it at the top of <body> (no defer) so the intro
       collage can cover the page before it first appears;
     • the other pages load it with "defer".

   1. Settings
   2. Helpers
   3. Intro photo collage   (home page only: <body data-intro>)
   4. Mobile menu
   5. Parallax background photos
   6. Event card photos      (Google Drive, with local fallbacks)
   7. Events carousel arrows
   8. Events from Google Calendar (needs an API key)
   9. Events page calendar   (month view on large screens, list on phones)
   ===================================================================== */
"use strict";

/* ---------------------------------------------------------------------
   1. Settings
   --------------------------------------------------------------------- */
const INTRO = {
  duration: 7000,            // total length, ms
  fadeOut: 1400,             // overlay fade at the end, ms
  swapStart: 900,            // new photos start flipping in, ms
  swapEnd: 4000,             // last photo flips in, ms
  titleAt: 4200,             // church name fades in, ms
  oncePerSession: true,
  featured: "6436",          // always the large photo in the center
  folder: "img/image-collage/",
  titleFont: "https://fonts.googleapis.com/css2?family=Dancing+Script&display=swap",
  photos: [
    "3641", "3691", "3698", "3723", "3727", "3739", "3740", "3760", "3766", "3770", "3777",
    "3800", "3832", "3851", "3863", "3876", "3909", "3927", "3931", "3932", "3942", "3953",
    "3955", "3959", "3965", "3985", "3990", "3991", "3994", "4004", "4018", "4021", "4027",
    "4030", "4038", "4044", "4061", "4103", "4108", "4109", "4117", "4122", "6436"
  ]
};

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

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------------------------------------------------------------
   3. Intro photo collage (~7 s)
      Opens full of photos, new photos flip in from the center outward,
      the church name fades in, then everything dissolves into the hero.
      Skippable (button / click / Esc / Enter / Space), respects
      prefers-reduced-motion, plays once per browser session.
      Styles: css/style.css → "Intro photo collage".
   --------------------------------------------------------------------- */
function initIntro() {
  const root = document.documentElement;
  if (!document.body || !document.body.hasAttribute("data-intro")) return;

  let seen = false;
  try { seen = INTRO.oncePerSession && sessionStorage.getItem("introCollageSeen") === "1"; } catch (e) { /* storage blocked */ }
  if (seen || prefersReducedMotion()) return;

  // Title font, only downloaded when the intro actually plays
  document.head.appendChild(Object.assign(document.createElement("link"), { rel: "stylesheet", href: INTRO.titleFont }));
  root.classList.add("intro-active");

  // Grid size from the screen: 3 / 4 / 6 columns, an even number of rows
  const w = window.innerWidth, h = window.innerHeight;
  const cols = w < 600 ? 3 : w < 1000 ? 4 : 6;
  let rows = Math.max(3, Math.round(cols * (h / w) * 1.25));
  if (rows % 2) rows += 1;

  // One big tile exactly in the middle (2×2, or full width on 3-column phones)
  const spanC = cols % 2 ? cols : 2, spanR = 2;
  const bigC = (cols - spanC) / 2, bigR = rows / 2 - 1;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inBig = r >= bigR && r < bigR + spanR && c >= bigC && c < bigC + spanC;
      if (r === bigR && c === bigC) cells.push({ r: r + (spanR - 1) / 2, c: c + (spanC - 1) / 2, big: true });
      else if (!inBig) cells.push({ r, c, big: false });
    }
  }

  // Flip order: closest to the center first, with a little randomness
  const cr = (rows - 1) / 2, cc = (cols - 1) / 2;
  cells.forEach((cell) => { cell.d = Math.hypot(cell.r - cr, (cell.c - cc) * (h / w) * 1.25) + Math.random() * 0.6; });
  const order = cells.slice().sort((a, b) => a.d - b.d);
  const step = (INTRO.swapEnd - INTRO.swapStart) / Math.max(1, order.length - 1);
  order.forEach((cell, k) => { cell.delay = INTRO.swapStart + k * step; });

  // DOM
  const pics = shuffle(INTRO.photos.filter((n) => n !== INTRO.featured));
  const thumb = (n) => INTRO.folder + "thumbs/collage-" + n + ".webp";

  const overlay = el("div", "ic");
  overlay.setAttribute("role", "region");
  overlay.setAttribute("aria-label", "Welcome photo collage");
  overlay.style.setProperty("--ic-duration", INTRO.duration + "ms");
  overlay.style.setProperty("--ic-fade", INTRO.fadeOut + "ms");

  const grid = el("div", "ic__grid");
  grid.style.setProperty("--cols", cols);
  grid.style.setProperty("--rows", rows);

  cells.forEach((cell, k) => {
    const tile = el("div", "ic__tile" + (cell.big ? " ic__tile--big" : ""));
    tile.style.animationDelay = Math.random() * 120 + "ms";
    const first = Object.assign(new Image(), { alt: "" });
    first.fetchPriority = "high";

    if (cell.big) {                                      // featured photo: full size, stays put
      tile.style.gridColumn = "span " + spanC;
      tile.style.gridRow = "span " + spanR;
      first.src = INTRO.folder + "collage-" + INTRO.featured + ".webp";
      tile.appendChild(first);
    } else {                                             // small tile: a thumbnail, then a second one flips in
      const a = pics[k % pics.length];
      let b = pics[(k + cells.length) % pics.length];
      if (b === a) b = pics[(k + 7) % pics.length];
      first.src = thumb(a);
      const next = Object.assign(new Image(), { alt: "", className: "ic__new", decoding: "async", src: thumb(b) });
      tile.append(first, next);
    }
    grid.appendChild(tile);
    cell.el = tile;
  });

  const title = el("div", "ic__title");
  title.append(el("div", "ic__brand", "Richmond SDA"), el("div", "ic__sub", "Iglesia Adventista de Richmond"));
  const skip = el("button", "ic__skip", "Skip intro");
  skip.type = "button";
  overlay.append(grid, el("div", "ic__scrim"), title, skip, el("div", "ic__bar"));

  // Timeline
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    overlay.classList.add("is-done");
    // Hero photo settles (zoom 1.12 → 1) while the collage dissolves;
    // the hero text starts animating partway through the fade.
    const heroImg = document.querySelector(".hero__media img");
    if (heroImg) heroImg.style.transform = "scale(1)";
    setTimeout(() => {
      root.classList.remove("intro-active");
      if (heroImg) heroImg.style.transform = "";
    }, Math.round(INTRO.fadeOut * 0.45));
    try { sessionStorage.setItem("introCollageSeen", "1"); } catch (e) { /* storage blocked */ }
    setTimeout(() => overlay.remove(), INTRO.fadeOut + 100);
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
  }

  document.body.prepend(overlay);
  skip.addEventListener("click", finish);
  overlay.addEventListener("click", finish);
  document.addEventListener("keydown", onKey);

  order.forEach((cell) => at(cell.delay, () => cell.el.classList.add("is-in")));
  at(INTRO.titleAt, () => overlay.classList.add("is-title"));
  at(INTRO.duration - INTRO.fadeOut, finish);
}

/* ---------------------------------------------------------------------
   4. Mobile menu (dialog with focus trap, Esc to close)
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
   5. Parallax: background photos move slower than the page
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
   6. Event card photos from Google Drive: if one can't load
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
   7. Events carousel: arrows scroll one card at a time and
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
   8. Events from Google Calendar → cards
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
   9. Events page calendar: month view on large screens, list on phones
   --------------------------------------------------------------------- */
function initCalendarEmbed() {
  const cal = document.querySelector(".calendar__embed[data-src]");
  if (!cal) return;
  cal.src = window.matchMedia("(max-width: 640px)").matches ? cal.getAttribute("data-mobile-src") : cal.getAttribute("data-src");
}

/* ---------------------------------------------------------------------
   Start
   --------------------------------------------------------------------- */
initIntro();                 // runs right away, before the page first paints

onReady(() => {
  initMenu();
  initParallax();
  initCardPhotoFallbacks();
  initCarousel();
  initGoogleCalendarEvents();
  initCalendarEmbed();
});
