/* ==================================================================
   Intro image collage — Richmond SDA
   A ~7 second photo collage shown before the website.
   It opens already filled with photos, then new photos flip in
   across the grid from the center outward, the church name fades
   in, and the overlay fades away.
   Include with: <script src="img/image-collage/intro-collage.js"></script>
   right after <body>. Skippable (click / Esc / button). Respects
   prefers-reduced-motion. Plays once per browser session.
   ================================================================== */
(function () {
  "use strict";

  var DURATION   = 7000;   // total length, ms
  var FADE_OUT   = 1400;   // overlay fade at the end, ms
  var ONCE_PER_SESSION = true;
  var BASE = "img/image-collage/";
  var PHOTOS = [
    "3641","3691","3698","3723","3727","3739","3740","3760","3766","3770","3777","3800","3832","3851","3863","3876","3909","3927","3931","3932","3942","3953","3955","3959","3965","3985","3990","3991","3994","4004","4018","4021","4027","4030","4038","4044","4061","4103","4108","4109","4117","4122","6436"
  ];

  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = ONCE_PER_SESSION && sessionStorage.getItem("introCollageSeen") === "1"; } catch (e) {}
  if (reduce || seen) return;

  /* ---------- styles ---------- */
  var css = [
    ".intro-active, .intro-active body { overflow: hidden; }",
    ".intro-active .reveal { animation-play-state: paused !important; }",
    ".ic { position: fixed; inset: 0; z-index: 9999; background: #0b0b0c; overflow: hidden;",
    "  transition: opacity " + FADE_OUT + "ms cubic-bezier(.4,0,.2,1), visibility 0s linear " + FADE_OUT + "ms; }",
    ".ic.is-done { opacity: 0; visibility: hidden; pointer-events: none; }",
    ".ic.is-done .ic__grid { transform: scale(1.08) !important; filter: blur(10px) brightness(.8); transition: transform " + FADE_OUT + "ms cubic-bezier(.4,0,.2,1), filter " + FADE_OUT + "ms ease; animation: none; }",
    ".ic.is-done .ic__title, .ic.is-done .ic__skip, .ic.is-done .ic__bar { opacity: 0; transition: opacity .5s ease; }",
    ".hero__media img { transition: transform 2.4s cubic-bezier(.2,.7,.2,1); }",
    ".intro-active .hero__media img { transform: scale(1.12); }",
    ".ic__grid { position: absolute; inset: -4vmin; display: grid; gap: 6px;",
    "  grid-template-columns: repeat(var(--cols), 1fr); grid-template-rows: repeat(var(--rows), 1fr);",
    "  animation: ic-drift " + (DURATION - FADE_OUT) + "ms linear forwards; }",
    "@keyframes ic-drift { from { transform: scale(1.12); } to { transform: scale(1); } }",
    ".ic__tile { position: relative; overflow: hidden; border-radius: 4px; background: #1a1a1c; animation: ic-open .35s ease both; }",
    "@keyframes ic-open { from { opacity: 0; } to { opacity: 1; } }",
    ".ic__tile img { position: absolute; inset: 0; }",
    ".ic__tile .ic__new { opacity: 0; transform: scale(1.18); }",
    ".ic__tile.is-in .ic__new { animation: ic-pop 1s cubic-bezier(.2,.8,.2,1) forwards; }",
    ".ic__tile--big { grid-column: span 2; grid-row: span 2; }",
    "@keyframes ic-pop { 0% { opacity: 0; transform: scale(1.18); filter: brightness(1.7); }",
    "  55% { opacity: 1; } 100% { opacity: 1; transform: scale(1); filter: brightness(1); } }",
    ".ic__tile img { width: 100%; height: 100%; object-fit: cover; display: block; }",
    ".ic__scrim { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(0,0,0,.25) 0%, rgba(0,0,0,.7) 100%);",
    "  opacity: 0; transition: opacity 1s ease; }",
    ".ic.is-title .ic__scrim { opacity: 1; }",
    ".ic__title { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; color: #fff;",
    "  padding: 24px; opacity: 0; transform: translateY(14px); transition: opacity 1s ease, transform 1s cubic-bezier(.2,.7,.2,1); }",
    ".ic.is-title .ic__title { opacity: 1; transform: none; }",
    ".ic__brand { font-family: 'Dancing Script', cursive; font-size: clamp(44px, 9vw, 110px); line-height: 1; text-shadow: 0 4px 30px rgba(0,0,0,.6); }",
    ".ic__sub { margin-top: 12px; font-family: Inter, system-ui, sans-serif; font-size: clamp(11px, 1.4vw, 14px);",
    "  letter-spacing: .28em; text-transform: uppercase; opacity: .85; }",
    ".ic__skip { position: absolute; right: 20px; bottom: 20px; z-index: 2; font: 500 13px/1 Inter, system-ui, sans-serif;",
    "  color: #fff; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.35); border-radius: 999px;",
    "  padding: 10px 16px; cursor: pointer; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }",
    ".ic__skip:hover { background: rgba(0,0,0,.65); }",
    ".ic__bar { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: rgba(255,255,255,.8);",
    "  transform-origin: left; transform: scaleX(0); animation: ic-bar " + (DURATION - FADE_OUT) + "ms linear forwards; z-index: 2; }",
    "@keyframes ic-bar { to { transform: scaleX(1); } }"
  ].join("\n");
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  root.classList.add("intro-active");

  /* ---------- layout ---------- */
  var w = window.innerWidth, h = window.innerHeight;
  var cols = w < 600 ? 3 : w < 1000 ? 4 : 6;
  var rows = Math.max(3, Math.round(cols * (h / w) * 1.25));

  // Shuffle photos
  var pics = PHOTOS.slice();
  for (var i = pics.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)); var t = pics[i]; pics[i] = pics[j]; pics[j] = t;
  }

  // Cells: one 2x2 "big" tile in the middle, the rest 1x1
  var cells = [];
  var bigC = Math.floor(cols / 2) - 1, bigR = Math.floor(rows / 2) - 1;
  var occupied = {};
  for (var dr = 0; dr < 2; dr++) for (var dc = 0; dc < 2; dc++) occupied[(bigR + dr) + "," + (bigC + dc)] = true;
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      if (r === bigR && c === bigC) { cells.push({ r: r + .5, c: c + .5, big: true }); continue; }
      if (occupied[r + "," + c]) continue;
      cells.push({ r: r, c: c, big: false });
    }
  }

  // Order: closest to center first, with a little randomness
  var cr = (rows - 1) / 2, cc = (cols - 1) / 2;
  cells.forEach(function (cell) {
    cell.d = Math.hypot(cell.r - cr, (cell.c - cc) * (h / w) * 1.25) + Math.random() * 0.6;
  });
  var order = cells.slice().sort(function (a, b) { return a.d - b.d; });

  // Timing: grid is full from the start; new photos flip in from the
  // center outward between SWAP_START and SWAP_END
  var SWAP_START = 900, SWAP_END = 4000, TITLE_AT = 4200;
  order.forEach(function (cell, k) {
    cell.delay = SWAP_START + k * ((SWAP_END - SWAP_START) / Math.max(1, order.length - 1));
  });

  /* ---------- DOM ---------- */
  var overlay = document.createElement("div");
  overlay.className = "ic";
  overlay.setAttribute("role", "region");
  overlay.setAttribute("aria-label", "Welcome photo collage");

  var grid = document.createElement("div");
  grid.className = "ic__grid";
  grid.style.setProperty("--cols", cols); grid.style.setProperty("--rows", rows);

  cells.forEach(function (cell, k) {
    var tile = document.createElement("div");
    tile.className = "ic__tile" + (cell.big ? " ic__tile--big" : "");
    tile.style.animationDelay = (Math.random() * 120) + "ms";
    var img = new Image();
    img.alt = ""; img.fetchPriority = "high";
    img.src = BASE + "collage-" + pics[k % pics.length] + ".webp";
    var nxt = new Image();
    nxt.alt = ""; nxt.className = "ic__new"; nxt.decoding = "async";
    nxt.src = BASE + "collage-" + pics[(k + cells.length) % pics.length] + ".webp";
    if (pics[(k + cells.length) % pics.length] === pics[k % pics.length]) nxt.src = BASE + "collage-" + pics[(k + 7) % pics.length] + ".webp";
    tile.appendChild(img); tile.appendChild(nxt);
    grid.appendChild(tile);
    cell.el = tile;
  });

  var scrim = document.createElement("div"); scrim.className = "ic__scrim";
  var title = document.createElement("div"); title.className = "ic__title";
  title.innerHTML = '<div class="ic__brand">Richmond SDA</div><div class="ic__sub">Iglesia Adventista de Richmond</div>';
  var skip = document.createElement("button"); skip.type = "button"; skip.className = "ic__skip"; skip.textContent = "Skip intro";
  var bar = document.createElement("div"); bar.className = "ic__bar";

  overlay.appendChild(grid); overlay.appendChild(scrim); overlay.appendChild(title);
  overlay.appendChild(skip); overlay.appendChild(bar);

  /* ---------- timeline ---------- */
  var timers = [], finished = false;
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function finish() {
    if (finished) return; finished = true;
    timers.forEach(clearTimeout);
    overlay.classList.add("is-done");
    // Let the hero photo settle (zoom 1.12 -> 1) while the collage dissolves,
    // then start the hero text animation partway through the fade.
    var heroImg = document.querySelector(".hero__media img");
    if (heroImg) heroImg.style.transform = "scale(1)";
    setTimeout(function () {
      root.classList.remove("intro-active");
      if (heroImg) heroImg.style.transform = "";
    }, Math.round(FADE_OUT * 0.45));
    try { sessionStorage.setItem("introCollageSeen", "1"); } catch (e) {}
    setTimeout(function () { overlay.remove(); style.remove(); }, FADE_OUT + 100);
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); }

  function start() {
    order.forEach(function (cell) { at(cell.delay, function () { cell.el.classList.add("is-in"); }); });
    at(TITLE_AT, function () { overlay.classList.add("is-title"); });
    at(DURATION - FADE_OUT, finish);
  }

  function mount() {
    document.body.prepend(overlay);
    skip.addEventListener("click", finish);
    overlay.addEventListener("click", finish);
    document.addEventListener("keydown", onKey);

    start();
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
