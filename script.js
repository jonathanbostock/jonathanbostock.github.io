// Open every external link in a new tab, so the markup doesn't have to
// repeat target/rel on each <a>. Internal/anchor links are left alone.
for (const a of document.querySelectorAll('a[href^="http"]')) {
	a.target = "_blank";
	a.rel = "noopener noreferrer";
}

// ============================================================
//  ACTION BUTTON DEFINITIONS  ← EDIT THIS PART
//  Add one entry per action button. The key on the left must
//  match the button's  data-define="..."  value in index.html.
// ============================================================
const actionButtonDefinitions = {
  "living-document": "A living document is one which is updated over time, as opposed to being written once and kept static. The history of this document can be found on my github, where it's hosted.",
  "ai-alignment": "The AI alignment problem is the technical and philosophical problem of producing artificially intelligent systems which are aligned to human values.",
  "ai-control": "The field of AI control studies how to prevent AI systems from causing harm, even if they attempt to do so. I investigated a sub-field called untrusted montoring.",
  "bio-nanotech": "Bio-nanotech is a field of science which attempts to build nanometer-scale structures out of biological molecules, like lipids, DNA, and proteins.",
  "insect-husbandry": "Not a joke: see left picture. I have also worked on a fly farm.",
  "auto-research": "Research carried out and written up by AI agents with little to no oversight.",
  "music-desktop": "But only on desktop :("
};

// ------------------------------------------------------------
//  Tooltip behaviour. Clicking an action button pins a tooltip
//  with its definition; clicking again un-pins it. The tooltip
//  floats above content, centered under the button.
//  (Tracked in a Map by key so state survives the ant effect
//  rebuilding the page below.)
// ------------------------------------------------------------
const pinnedTooltips = new Map();

function positionTooltipUnder(button, tooltip) {
  const rect = button.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2 + window.scrollX;
  // Clamp horizontally so a tooltip near a screen edge can't overflow the
  // viewport (matters on narrow/mobile screens; a no-op on the desktop column).
  const MARGIN = 8;
  const w = tooltip.offsetWidth;
  const minLeft = window.scrollX + MARGIN;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - w - MARGIN;
  let left = centerX - w / 2;
  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = Math.max(minLeft, maxLeft);
  tooltip.style.left = left + "px";
  tooltip.style.top = rect.bottom + window.scrollY + 6 + "px";
}

// Both kinds of button (tooltip-buttons and the action button) carry a tooltip.
const BTN_SEL = ".tooltip-button, .action-button";

// Build a tooltip element for a button, place it under the button, return it.
function createTooltip(button) {
  const key = button.dataset.define;
  const text = actionButtonDefinitions[key] || `(No definition set for "${key}")`;
  const tooltip = document.createElement("span");
  tooltip.className = "action-tooltip";
  // The action button's tooltip uses the purple variant.
  if (button.classList.contains("action-button")) tooltip.classList.add("ant-tooltip");
  tooltip.textContent = text;
  document.body.appendChild(tooltip);
  positionTooltipUnder(button, tooltip); // needs to be in the DOM to measure its width
  return tooltip;
}

function pinTooltip(button) {
  hideHoverTooltip(); // a click supersedes any temporary hover tooltip
  pinnedTooltips.set(button.dataset.define, createTooltip(button));
  button.classList.add("pinned");
}

function dismissAllTooltips() {
  for (const tooltip of pinnedTooltips.values()) tooltip.remove();
  pinnedTooltips.clear();
  document.querySelectorAll(".pinned")
    .forEach(b => b.classList.remove("pinned"));
}

// ------------------------------------------------------------
//  Hover tooltip: shows on mouse-over, hides on mouse-out.
//  Independent of (and suppressed by) the pinned tooltip, so a
//  pinned definition isn't disturbed by the cursor leaving.
// ------------------------------------------------------------
let hoverTooltip = null; // { key, el }

function showHoverTooltip(button) {
  const key = button.dataset.define;
  if (pinnedTooltips.has(key)) return;          // already pinned & showing
  if (hoverTooltip && hoverTooltip.key === key) return; // already hovering this one
  hideHoverTooltip();
  hoverTooltip = { key, el: createTooltip(button) };
}

function hideHoverTooltip() {
  if (hoverTooltip) {
    hoverTooltip.el.remove();
    hoverTooltip = null;
  }
}

// URL links get a hover tooltip showing their href (truncated, in orange).
const truncateUrl = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function showLinkTooltip(link) {
  // Only on hover-capable (pointer) devices — touch devices have no hover and
  // the link navigates on tap anyway, so the href tooltip is dropped there.
  if (!matchMedia("(hover: hover)").matches) return;
  if (pinnedTooltips.size) return;                 // don't fight a pinned tooltip
  // Skip internal links — their URLs are uninteresting and a tooltip on every
  // breadcrumb / card / index link looks fussy. Only external links get the
  // href-preview treatment. `link.href` always resolves to an absolute URL.
  try {
    if (new URL(link.href).origin === location.origin) return;
  } catch (_) { return; } // malformed: skip
  const key = "url:" + link.href;
  if (hoverTooltip && hoverTooltip.key === key) return;
  hideHoverTooltip();
  const tip = document.createElement("span");
  tip.className = "action-tooltip link-tooltip";
  tip.textContent = truncateUrl(link.getAttribute("href"), 42);
  document.body.appendChild(tip);
  positionTooltipUnder(link, tip);
  hoverTooltip = { key, el: tip };
}

// One brief, slightly-random wobble per text block — a hint that the text is
// "ant-ish" — when the living-document warning button is moused over.
let actionHovered = false;
function jiggleText() {
  if (document.body.classList.contains("ants-active")) return;
  document.querySelectorAll("#page p, #page h1, #page h2, #page h3").forEach(el => {
    const dx = (Math.random() * 2 - 1) * 5;
    const dy = (Math.random() * 2 - 1) * 5;
    const dr = (Math.random() * 2 - 1) * 3.5;
    el.animate(
      [{ transform: "translate(0,0) rotate(0deg)" },
       { transform: `translate(${dx}px, ${dy}px) rotate(${dr}deg)` },
       { transform: "translate(0,0) rotate(0deg)" }],
      { duration: 180 + Math.random() * 90, easing: "ease-out" }); // fast, twitchy
  });
}

document.addEventListener("mouseover", (e) => {
  const button = e.target.closest(BTN_SEL);
  if (button) {
    showHoverTooltip(button);
    if (button.classList.contains("action-button") && !actionHovered) {
      actionHovered = true; // wobble once per hover, not every mousemove
      jiggleText();
    }
    return;
  }
  const link = e.target.closest("a[href]");
  if (link) showLinkTooltip(link);
});

document.addEventListener("mouseout", (e) => {
  const el = e.target.closest(BTN_SEL) || e.target.closest("a[href]");
  if (!el) return;
  if (el.contains(e.relatedTarget)) return; // still inside the same element
  if (el.classList.contains("action-button")) { actionHovered = false; jiggleText(); } // wobble on the way out too
  hideHoverTooltip();
});

// Dark-mode toggle (delegated, so it survives the ant effect rebuilding #page).
document.addEventListener("click", (e) => {
  if (!e.target.closest("#theme-toggle")) return;
  const dark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", dark ? "dark" : "light");
  Ants.recolor(); // recolour any live ants to the new theme
});

// Clicking the "music" word sends a copy of it flying along an S-shaped curve
// (rotating to follow the path) up to the dormant music button. On arrival the
// button reveals its label and gains its hover behaviour. Delegated so it keeps
// working after the ant effect rebuilds #page. One-shot per word.
document.addEventListener("click", (e) => {
  const word = e.target.closest(".music-word");
  if (!word || word.classList.contains("spent")) return;

  const btn = document.getElementById("music-toggle");
  if (!btn) return;
  const to = btn.getBoundingClientRect();
  if (!to.width) return; // button isn't on screen (e.g. mobile) — do nothing

  const from = word.getBoundingClientRect();

  // A copy flies so the sentence is left intact. Capture the word's look BEFORE
  // marking it spent, so the moving copy keeps the purple "clickable" colour
  // while the original drops to normal text colour.
  const fly = document.createElement("span");
  fly.className = "music-fly";
  fly.textContent = word.textContent;
  const cs = getComputedStyle(word);
  fly.style.fontFamily = cs.fontFamily;
  fly.style.fontSize = cs.fontSize;
  fly.style.fontWeight = cs.fontWeight;
  fly.style.color = cs.color;
  document.body.appendChild(fly);

  word.classList.add("spent"); // grey out the original + stop further hovers/clicks

  // Centres of start (word) and end (button) in DOCUMENT coords — the clone is
  // position:absolute (pinned to the page), so the motion-path uses page coords
  // and the word stays put relative to content if you scroll mid-flight.
  const ox = window.scrollX, oy = window.scrollY;
  const sx = from.left + from.width / 2 + ox, sy = from.top + from.height / 2 + oy;
  const ex = to.left + to.width / 2 + ox,     ey = to.top + to.height / 2 + oy;

  // S-curve via a cubic Bézier with HORIZONTAL tangents at both ends: the word
  // departs moving left-to-right and arrives moving left-to-right, bowing through
  // an S in between. offset-rotate follows the tangent (~0° at each end), so the
  // word is upright and reading forwards as it leaves and as it lands.
  const dx = ex - sx;
  const run = Math.max(70, Math.abs(dx) * 0.5);
  const c1x = sx + run, c1y = sy;   // leave the word horizontally (left-to-right)
  const c2x = ex - run, c2y = ey;   // reach the button horizontally (left-to-right)
  fly.style.offsetPath =
    `path("M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}")`;

  const anim = fly.animate(
    [{ offsetDistance: "0%" }, { offsetDistance: "100%" }],
    { duration: 1200, easing: "cubic-bezier(0.45, 0, 0.55, 1)" }); // smooth ease-in-out
  anim.onfinish = () => {
    fly.remove();
    Music.activate(); // reveal the button frame/label and prime its tooltip
  };
});

// ------------------------------------------------------------
//  Music player for the record-player dock, driven by a small finite state
//  machine over [Paused, Playing, Stopping, Changing, Starting]. A looping vinyl
//  crackle (synthesised with the Web Audio API) is layered over the song <audio>.
//  The record's colour is swapped at the bottom of the dip, while it's off-screen.
//
//    PLAY  (Paused):   Starting --start noise--> Playing (song + crackle)
//    PAUSE (Playing):  Stopping --stop noise---> Paused
//    NEXT  (Playing):  Stopping -> Changing (dip) -> Starting -> Playing
//    NEXT  (Paused):            Changing (dip) -> Starting -> Playing
//  Events arriving mid-transition are ignored.
// ------------------------------------------------------------
const Music = (function () {
  // ↓↓↓ EDIT PER-SONG TOOLTIP TEXT HERE ↓↓↓
  // `note` is a longer blurb shown beneath the song title in the Music button's
  // hover tooltip. Leave it "" for no blurb. (name/file/label are also editable.)
  const SONGS = [
    { name: "♪ No Earth ♪\n(Thumbprint, 2019)",         file: "songs/no earth.mp3",         label: "#5a8f3c", note: "" }, // green
    { name: "♪ What we Meant ♪\n(Jonathan, 2020)",    file: "songs/what we meant.wav",    label: "#3f7e88", note: "" }, // teal
    { name: "♪ Counting Flowers ♪\n(Jonathan, 2020)", file: "songs/counting flowers.wav", label: "#c46a3a", note: "" }, // warm orange
  ];
  // ↑↑↑ EDIT PER-SONG TOOLTIP TEXT HERE ↑↑↑
  const audio    = document.getElementById("music-audio");
  const playBtn  = document.getElementById("play-toggle");
  const nextBtn  = document.getElementById("next-btn");
  const musicBtn = document.getElementById("music-toggle");
  const disc     = document.getElementById("record-disc");
  const label    = document.getElementById("record-label");
  const svg      = document.getElementById("record-svg");
  const rpInner  = document.getElementById("rp-inner");
  const tonearm  = document.getElementById("tonearm");

  // Give each record a distinct look (label colour) so the swap is visible.
  function applyRecordStyle() {
    if (label) label.setAttribute("fill", SONGS[index].label);
  }

  // Tonearm rotation (degrees about its pivot): 0 = needle at the disc edge,
  // EDGE_IN = swung in near the label, AWAY = lifted off the record.
  const EDGE_IN = -16, AWAY = 5; // AWAY stays small so the head doesn't lift out of the peeking strip
  function setArm(angle, ms) {
    if (!tonearm) return;
    tonearm.style.transitionDuration = (ms == null ? 400 : ms) + "ms";
    tonearm.style.transform = "rotate(" + angle + "deg)";
  }
  function armFrac() { // 0..1 through the current song
    return audio && audio.duration ? Math.min(1, audio.currentTime / audio.duration) : 0;
  }

  const START_MS = 320, STOP_MS = 90, DIP_MS = 900;

  let index = 0;
  let activated = false, opened = false, firstClick = false, confirmClose = false;
  let state = "Paused", seq = 0, tip = null;

  // ---- Web Audio: needle drop / lift one-shots + looping vinyl crackle ------
  let ax = null, crackle = null;
  function ac() {
    if (!ax) ax = new (window.AudioContext || window.webkitAudioContext)();
    if (ax.state === "suspended") ax.resume();
    return ax;
  }
  function crackleBuffer(dur) {      // faint hiss + sparse pops, for looping
    const ctx = ac(), n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.06;
    const pops = Math.floor(dur * 20);
    for (let p = 0; p < pops; p++) {
      const i0 = Math.floor(Math.random() * n);
      const amp = (Math.random() * 0.6 + 0.25) * (Math.random() < 0.5 ? 1 : -1);
      for (let k = 0; k < 5 && i0 + k < n; k++) d[i0 + k] += amp * Math.exp(-k * 0.7);
    }
    return buf;
  }
  function startCrackle() {
    if (crackle) return;
    const ctx = ac();
    const src = ctx.createBufferSource(); src.buffer = crackleBuffer(2.4); src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.13;
    src.connect(g).connect(ctx.destination); src.start();
    crackle = { src, g };
  }
  function stopCrackle() {
    if (!crackle) return;
    const c = crackle; crackle = null;
    c.g.gain.setTargetAtTime(0.0001, ac().currentTime, 0.05);
    setTimeout(() => { try { c.src.stop(); } catch (e) {} }, 250);
  }

  // ---- visuals --------------------------------------------------------------
  function spin(on) { if (svg) (on ? svg.unpauseAnimations() : svg.pauseAnimations()); }
  function dipRecord() {
    if (!disc) return;
    disc.animate(
      [{ transform: "translateY(0)" },
       { transform: "translateY(120px)" }, /* fully clear of the peeking strip */
       { transform: "translateY(0)" }],
      { duration: DIP_MS, easing: "ease-in-out" });
  }
  function setLabel(playing) { if (playBtn) playBtn.textContent = playing ? "Pause" : "Play"; }

  function loadNext() {
    index = (index + 1) % SONGS.length;
    audio.src = encodeURI(SONGS[index].file);
    if (tip) { fillTip(tip); positionTooltipUnder(musicBtn, tip); } // keep an open tooltip fresh + centred
    // NB: applyRecordStyle() is deferred to the bottom of the dip (off-screen).
  }

  // ---- the state machine ----------------------------------------------------
  function after(my, ms, fn) { setTimeout(() => { if (my === seq) fn(); }, ms); }

  function enter(s, intent) {
    seq++;                          // invalidate any pending transition timer
    const my = seq;
    state = s;
    if (s === "Paused") {
      audio.pause(); stopCrackle(); spin(false); setLabel(false);
    } else if (s === "Playing") {
      spin(true); audio.play().catch(() => {}); startCrackle(); setLabel(true);
    } else if (s === "Stopping") {  // stop the sound, then pause or change
      stopCrackle(); audio.pause();
      after(my, STOP_MS, () => enter(intent === "change" ? "Changing" : "Paused", intent));
    } else if (s === "Changing") {  // visual change: dip the record, swap track
      spin(false); loadNext(); dipRecord();
      setArm(AWAY, 350);                       // lift the tonearm out of the way
      after(my, DIP_MS / 2, applyRecordStyle); // recolour while it's fully off-screen
      after(my, DIP_MS, () => enter("Starting"));
    } else if (s === "Starting") {  // spin up, drop the needle, then the song
      spin(true);
      setArm(EDGE_IN * armFrac(), 350);        // needle to the start of the (new) track
      after(my, START_MS, () => enter("Playing"));
    }
  }

  function onPlayPause() {
    // Pause/Play on the record that's already on is instant — no ceremony.
    if (state === "Playing") enter("Paused");
    else if (state === "Paused") enter("Playing");
  }
  function onNext() {
    if (state === "Playing") enter("Stopping", "change");
    else if (state === "Paused") enter("Changing", "change");
  }

  // ---- wiring ---------------------------------------------------------------
  if (playBtn) playBtn.addEventListener("click", onPlayPause);
  if (nextBtn) nextBtn.addEventListener("click", onNext);
  if (audio) {
    // Reaching the end auto-advances to the next track (looping the playlist).
    audio.addEventListener("ended", () => enter("Stopping", "change"));

    // Creep the tonearm inward as the song plays.
    audio.addEventListener("timeupdate", () => {
      if (state === "Playing") setArm(EDGE_IN * armFrac(), 300);
    });

    // Keep the crackle and UI in step with the ACTUAL playback state, so a
    // system pause (e.g. unplugging headphones) silences the pops too.
    audio.addEventListener("pause", () => {
      stopCrackle();
      if (state === "Playing") { state = "Paused"; spin(false); setLabel(false); }
    });
    audio.addEventListener("play", () => {
      startCrackle();
      if (state === "Paused") { state = "Playing"; spin(true); setLabel(true); }
    });
  }

  // Fill the Music tooltip: the prompt before the first click, otherwise the
  // current song's title with its (optional) longer note underneath.
  function fillTip(el) {
    el.textContent = "";
    if (confirmClose) { el.textContent = "No more music?"; return; }
    if (!firstClick) { el.textContent = "Are you sure?"; return; }
    const s = SONGS[index];
    el.appendChild(document.createTextNode(s.name)); // title (not bold)
    if (s.note) {
      el.appendChild(document.createElement("br"));
      el.appendChild(document.createTextNode(s.note));
    }
  }
  function showTip() {
    if (tip) return;
    tip = document.createElement("span");
    tip.className = "action-tooltip ant-tooltip song-tooltip";
    fillTip(tip);
    document.body.appendChild(tip);
    positionTooltipUnder(musicBtn, tip);
  }
  function hideTip() { if (tip) { tip.remove(); tip = null; } }

  // Make the player + button vanish, and reset everything so the prose word can
  // summon it all again from scratch.
  function closePlayer() {
    enter("Paused");                                      // stop audio, crackle, spin
    hideTip();
    if (rpInner) rpInner.classList.remove("popped");      // record player slides away
    if (musicBtn) musicBtn.classList.remove("activated"); // button goes dormant (invisible)
    activated = false; opened = false; firstClick = false; confirmClose = false;
    document.querySelectorAll(".music-word.spent")
      .forEach(w => w.classList.remove("spent"));         // the word can fly again
  }

  if (musicBtn) {
    musicBtn.addEventListener("mouseover", () => { if (activated) showTip(); });
    musicBtn.addEventListener("mouseout", () => { confirmClose = false; hideTip(); }); // mousing away cancels the close prompt
    musicBtn.addEventListener("click", () => {
      if (!activated) return;
      if (!opened) {
        // First click: summon the record player.
        opened = true; firstClick = true;
        if (tip) { tip.textContent = "OK!"; positionTooltipUnder(musicBtn, tip); } // re-centre for the shorter text
        if (rpInner) rpInner.classList.add("popped"); // the record player appears
        audio.src = encodeURI(SONGS[index].file);  // queue the first track (stays Paused)
        applyRecordStyle();                         // colour the first record
        ac();                                       // unlock audio on this user gesture
        spin(false); setLabel(false);
        return;
      }
      // Already open: two-click confirm to dismiss everything.
      if (!confirmClose) {
        confirmClose = true;
        if (tip) { fillTip(tip); positionTooltipUnder(musicBtn, tip); } // -> "No more music?"
      } else {
        closePlayer();
      }
    });
  }

  // Called when the "Music" word lands: reveal the button frame + prime tooltip.
  function activate() {
    if (activated) return;
    activated = true;
    if (musicBtn) musicBtn.classList.add("activated");
  }

  // Re-apply the in-prose word's state to match the real music state. Needed
  // after the ant effect rebuilds #page from a snapshot, which can otherwise
  // restore a stale "spent" word (e.g. dismissed while the ants were out).
  function syncWord() {
    document.querySelectorAll(".music-word")
      .forEach(w => w.classList.toggle("spent", activated));
  }

  return { activate, syncWord };
})();

// Delegated click handler: works even after the ant effect rebuilds the page.
document.addEventListener("click", (e) => {
  const button = e.target.closest(BTN_SEL);
  const isActionBtn = button && button.classList.contains("action-button");

  // Was THIS exact button the one already pinned? (capture before we clear,
  // since dismissAllTooltips removes the pinned state.)
  const thisWasPinned = button && !isActionBtn &&
                        pinnedTooltips.has(button.dataset.define);

  // A click ANYWHERE cancels any active tooltip.
  if (pinnedTooltips.size > 0) dismissAllTooltips();

  if (button) {
    if (isActionBtn) {
      // THE action button: releases/recalls the ants. Pin its tooltip only
      // when this click RELEASES them; on a recall click it stays down — even
      // if it was already dismissed by an earlier click somewhere random.
      if (Ants.toggle() === "released") pinTooltip(button);
    } else {
      // Tooltip buttons: pin the clicked one — switching the pin from any
      // other open button to this one. The exception is clicking the button
      // that was already pinned: that just closed it, so leave it closed.
      if (!thisWasPinned) pinTooltip(button);
    }
  }
});

// ============================================================
//  "Release the ants" effect — adapted from ant-words.html.
//  Each word in #page becomes an ant that follows pheromone
//  trails; clicking again marches them home and restores the
//  page. You shouldn't need to edit this.
// ============================================================
const Ants = (function () {
  // ---- knobs -------------------------------------------------------------
  const SPEED_MULT  = 1.4;      // MASTER ant-speed multiplier (1 = original).
                                // Scales every movement: wander, guard, forage,
                                // and the march home.
  const SHOW_PHEROMONE = false; // flip to true to watch the trail field
  const CELL        = 22;       // pheromone grid resolution (px)
  const EVAP        = 0.997;    // pheromone decay/frame (closer to 1 = trails persist)
  const DIFFUSE     = 0.16;     // how much pheromone bleeds to neighbours
  const DEPOSIT     = 4;        // pheromone dropped per ant per frame
  const SEED        = 30;       // strength of the pre-laid starter trails
  const SENSE_DIST  = 28;       // how far ahead the ant sniffs
  const SENSE_ANGLE = 0.5;      // left/right sensor spread (rad)
  const STEER       = 0.03;     // turn toward the strongest trail
  const WANDER      = 0.03;     // random heading jitter
  const MAX_TURN    = 0.045;    // HARD cap on turn per frame -> slow turns
  const SPEED       = 0.9 * SPEED_MULT;  // forward px per frame
  const SETTLE      = 80;       // within this distance of home, rotate upright
  // -- foraging (biting pieces off the images, carrying them to the nest) --
  const NEST_SCENT   = 8;       // pheromone laid at the nest each frame
  const FORAGE_CHANCE = 0.004;  // per-frame chance an idle ant goes foraging
  const FORAGE_SPEED = 1.7 * SPEED_MULT; // foragers move faster than wanderers
  const CELL_PX      = 15;      // bite size (px of image taken per trip)
  const REACH        = 12;      // "arrived at the bite point" threshold
  const NEST_REACH   = 70;      // "arrived at the nest" threshold (a big nest area)
  const FLOW_TURN    = 0.09;    // how strongly terrain bends a wanderer's path
  const TERRAIN_MIN  = 0.4;     // slowest speed factor (in "thick" terrain)
  const REPEL_COUNT  = 14;      // number of obstacles the ants steer around
  const REPEL_RANGE  = 95;      // how far an obstacle's push reaches (px)
  const REPEL_TURN   = 0.14;    // how hard ants veer away from an obstacle
  const PATROL_R     = 150;     // radius scouts orbit the nest at
  const SOLDIER_R    = 200;     // radius soldiers orbit "their" image at
  const TURN_SMOOTH  = 0.18;    // how fast the drawn rotation chases the heading
  // ------------------------------------------------------------------------

  let nest = null;        // {x, y} document coords of the nest (left of button)
  let biteImages = [];    // image canvases the ants chew on
  let pieces = [];        // bitten pieces in transit / piled at the nest
  let terrain = null;     // smooth 0..1 field: slows ants where it's low
  let flow = null;        // per-cell flow angle: bends ant paths into curves
  let repellors = [];     // obstacles the ants curve around

  const cvs = document.getElementById("pher");
  const ctx = cvs.getContext("2d");

  let ants = [], raf = null;
  let running = false, goingHome = false, savedHTML = null, overlay = null;
  let cols, rows, W, H, pher, tmp;

  const page = () => document.getElementById("page");
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  function lerpAngle(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  // ---- pheromone field ---------------------------------------------------
  function idx(gx, gy) {
    gx = ((gx % cols) + cols) % cols;
    gy = ((gy % rows) + rows) % rows;
    return gy * cols + gx;
  }
  function readPher(px, py) { return pher[idx(Math.floor(px / CELL), Math.floor(py / CELL))]; }
  function deposit(px, py, amt) { pher[idx(Math.floor(px / CELL), Math.floor(py / CELL))] += amt; }

  // ---- terrain: a smooth random field giving slow zones + curved flow -----
  function buildTerrain() {
    let t = new Float32Array(cols * rows);
    for (let i = 0; i < t.length; i++) t[i] = Math.random();
    for (let pass = 0; pass < 3; pass++) { // blur into smooth blobs
      const t2 = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        t2[y * cols + x] = (t[idx(x - 1, y)] + t[idx(x + 1, y)] +
                            t[idx(x, y - 1)] + t[idx(x, y + 1)] + t[y * cols + x]) / 5;
      }
      t = t2;
    }
    let mn = Infinity, mx = -Infinity;
    for (const v of t) { if (v < mn) mn = v; if (v > mx) mx = v; }
    const rng = (mx - mn) || 1;
    for (let i = 0; i < t.length; i++) t[i] = (t[i] - mn) / rng; // normalise 0..1
    terrain = t;

    flow = new Float32Array(cols * rows); // flow runs along the contours
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const gx = terrain[idx(x + 1, y)] - terrain[idx(x - 1, y)];
      const gy = terrain[idx(x, y + 1)] - terrain[idx(x, y - 1)];
      flow[y * cols + x] = Math.atan2(gy, gx) + Math.PI / 2;
    }
  }
  function terrainAt(px, py) { return terrain[idx(Math.floor(px / CELL), Math.floor(py / CELL))]; }
  function flowAt(px, py) { return flow[idx(Math.floor(px / CELL), Math.floor(py / CELL))]; }
  function speedFactor(px, py) { return TERRAIN_MIN + (1 - TERRAIN_MIN) * terrainAt(px, py); }

  // ---- repellors: scattered obstacles the ants veer around ----------------
  function spotIsClear(x, y) {
    if (nest && Math.hypot(x - nest.x, y - nest.y) < 170) return false; // keep off the nest
    for (const b of biteImages) { // keep off the images
      if (x > b.x0 - 40 && x < b.x0 + b.w + 40 &&
          y > b.y0 - 40 && y < b.y0 + b.h + 40) return false;
    }
    return true;
  }

  // Drop one obstacle on the line from the nest to (tx, ty). Scans outward from
  // the midpoint for a spot that clears the nest/image keep-out zones, so there
  // is always something for foragers to steer around between the two. Returns
  // true if one was placed.
  function placePathRepellor(tx, ty) {
    const ts = [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7, 0.25, 0.75];
    for (const t of ts) {
      const x = nest.x + (tx - nest.x) * t;
      const y = nest.y + (ty - nest.y) * t;
      if (spotIsClear(x, y)) { repellors.push({ x, y }); return true; }
    }
    return false;
  }

  function buildRepellors() {
    repellors = [];
    // Guarantee one obstacle on the path between the nest and each image, so the
    // ants always have something to walk around on the way out and back.
    for (const b of biteImages) placePathRepellor(b.x0 + b.w / 2, b.y0 + b.h / 2);

    // Fill the rest in with random scatter, up to REPEL_COUNT total.
    while (repellors.length < REPEL_COUNT) {
      let x, y, tries = 0;
      do {
        x = 80 + Math.random() * (W - 160);
        y = 80 + Math.random() * (H - 160);
      } while (!spotIsClear(x, y) && ++tries < 40);
      if (!spotIsClear(x, y)) break; // couldn't find a clear spot — stop filling
      repellors.push({ x, y }); // invisible: an unseen force the ants curve around
    }
  }

  // Veer the ant away from any nearby obstacle (strength rises as it nears).
  function applyRepel(a) {
    let rx = 0, ry = 0;
    for (const r of repellors) {
      const dx = a.x - r.x, dy = a.y - r.y, d = Math.hypot(dx, dy);
      if (d > 0.01 && d < REPEL_RANGE) {
        const f = 1 - d / REPEL_RANGE;
        rx += (dx / d) * f; ry += (dy / d) * f;
      }
    }
    if (rx || ry) a.heading = lerpAngle(a.heading, Math.atan2(ry, rx), REPEL_TURN);
  }

  // Circle a point like a guard: steer along a ring of radius R, correcting
  // inward/outward toward the ring, and lay strong trails.
  function orbit(a, cx, cy, R) {
    const dx = cx - a.x, dy = cy - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const toC = Math.atan2(dy, dx);
    const tangent = toC + a.facing * (Math.PI / 2);            // around the ring
    const err = clamp((d - R) / R, -1, 1);                     // >0 = too far out
    const radial = err > 0 ? toC : toC + Math.PI;              // back toward the ring
    const desired = lerpAngle(tangent, radial, Math.min(0.7, Math.abs(err)));
    a.heading = lerpAngle(a.heading, desired, 0.12);
    applyRepel(a);
    const sp = SPEED * speedFactor(a.x, a.y);
    a.x += Math.cos(a.heading) * sp;
    a.y += Math.sin(a.heading) * sp;
    a.legPhase += 0.55;
    deposit(a.x + a.hw, a.y + a.hh, DEPOSIT * 3);              // guards blaze trails
  }

  // Scouts guard the nest; soldiers guard "their" image (falling back to the
  // nest if there are no images to guard).
  function patrol(a) { orbit(a, nest.x, nest.y, PATROL_R); }
  function soldierPatrol(a) {
    const b = biteImages.length ? biteImages[a.imgIndex % biteImages.length] : null;
    if (!b) { patrol(a); return; }
    orbit(a, b.x0 + b.w / 2, b.y0 + b.h / 2, SOLDIER_R);
  }

  function diffuseEvaporate() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const avg = (pher[idx(x - 1, y)] + pher[idx(x + 1, y)] +
                     pher[idx(x, y - 1)] + pher[idx(x, y + 1)]) * 0.25;
        tmp[i] = (pher[i] * (1 - DIFFUSE) + avg * DIFFUSE) * EVAP;
      }
    }
    const s = pher; pher = tmp; tmp = s;
  }

  // lay down a few fat, wavy trails so the ants have real structure on frame 1
  function seedTrails() {
    const lanes = 3;
    for (let t = 0; t < lanes; t++) {
      const y0 = (t + 0.7) / (lanes + 0.4) * H;
      const amp = 30 + Math.random() * 70;
      const phase = Math.random() * Math.PI * 2;
      const freq = (0.8 + Math.random() * 1.2) * Math.PI * 2 / W;
      for (let x = 0; x < W; x += 3) {
        const y = y0 + Math.sin(x * freq + phase) * amp;
        deposit(x, y, SEED);
        deposit(x, y - CELL, SEED * 0.5);
        deposit(x, y + CELL, SEED * 0.5);
        deposit(x, y - 2 * CELL, SEED * 0.18);
        deposit(x, y + 2 * CELL, SEED * 0.18);
      }
    }
  }

  function drawPher() {
    ctx.clearRect(0, 0, W, H);
    if (!SHOW_PHEROMONE) return;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = pher[y * cols + x];
        if (v > 0.4) {
          ctx.fillStyle = "rgba(180,83,10," + Math.min(0.45, v / 40) + ")";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }
  }

  // ---- word -> ant -------------------------------------------------------
  function wrapWords() {
    const root = page();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        // The launcher buttons (action / theme / music) stay static; everything
        // else, tooltip-button text included, turns to ants with the prose.
        if (n.parentElement.closest(".ant-launcher, .music-mobile")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n; while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) {
      const frag = document.createDocumentFragment();
      for (const part of node.nodeValue.split(/(\s+)/)) {
        if (part === "" || /^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
        else {
          const s = document.createElement("span");
          s.className = "ant-word";
          s.textContent = part;
          frag.appendChild(s);
        }
      }
      node.parentNode.replaceChild(frag, node);
    }
  }

  // pivot about centre; facing only decides initial heading + keeps text upright.
  function place(a) {
    const s = a.settle || 0;
    const bob = Math.sin(a.legPhase) * 1.2 * (1 - s);
    // Keep ants inside the page so they can't extend the scroll area.
    a.x = clamp(a.x, 0, W - a.hw * 2);
    a.y = clamp(a.y, 0, H - a.hh * 2);
    // Smooth the DRAWN angle so quick steering (e.g. veering round obstacles)
    // doesn't make the word visibly snap.
    if (a.dispHeading === undefined) a.dispHeading = a.heading;
    a.dispHeading = lerpAngle(a.dispHeading, a.heading, TURN_SMOOTH);
    const walkRot = a.facing === 1 ? a.dispHeading : a.dispHeading - Math.PI;
    const rot = lerpAngle(walkRot, 0, s);
    a.el.style.transform = "translate(" + a.x + "px," + (a.y + bob) + "px) rotate(" + rot + "rad)";
  }

  // ---- foraging: bite pieces off the images, carry them to the nest ------

  // Replace each flanking image with a same-size canvas we can chew holes in.
  // Returns descriptors carrying the grid of bite cells. (savedHTML restores
  // the original <img> tags on recall, so this is non-destructive.)
  function buildBiteImages(sx, sy) {
    // Only chew images that are fully decoded. drawImage() throws
    // InvalidStateError on a still-loading or broken image (Chrome), which
    // would abort release() partway — after the ant clones are already placed
    // over the text but before `running`/`ants-active` are set — stranding the
    // clones on the page (stuck in the wrong theme colour). An unready image is
    // simply left un-chewable, which is harmless.
    return [...page().querySelectorAll(".side-img")]
      .filter(img => img.complete && img.naturalWidth > 0)
      .map(img => {
      const r = img.getBoundingClientRect();
      const w = r.width, h = r.height;
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      cv.className = img.className; // keep side-img positioning
      const ic = cv.getContext("2d");
      ic.drawImage(img, 0, 0, w, h);
      img.replaceWith(cv);

      const gcols = Math.max(1, Math.round(w / CELL_PX));
      const grows = Math.max(1, Math.round(h / CELL_PX));
      const cw = w / gcols, ch = h / grows;
      const free = [];
      for (let i = 0; i < gcols * grows; i++) free.push(i);
      return {
        ic, src: img, free,
        x0: r.left + sx, y0: r.top + sy, w, h,
        cw, ch, gcols,
        rx: img.naturalWidth / w, ry: img.naturalHeight / h
      };
    });
  }

  function steerTo(a, tx, ty) {
    const desired = Math.atan2(ty - a.y, tx - a.x);
    a.heading = lerpAngle(a.heading, desired, 0.2);
    applyRepel(a); // curve around obstacles on the way
    const sp = FORAGE_SPEED * speedFactor(a.x, a.y); // thick terrain slows them
    a.x += Math.cos(a.heading) * sp;
    a.y += Math.sin(a.heading) * sp;
    a.legPhase += 0.6 * speedFactor(a.x, a.y);
  }
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  // Send an idle ant toward a free bite cell on some image (reserves the cell).
  function startForage(a) {
    const cands = biteImages.filter(b => b.free.length);
    if (!cands.length) return;
    const b = cands[Math.floor(Math.random() * cands.length)];
    const cell = b.free.splice(Math.floor(Math.random() * b.free.length), 1)[0];
    const col = cell % b.gcols, row = Math.floor(cell / b.gcols);
    a.state = "toImage";
    a.bite = { b, col, row, tx: b.x0 + (col + 0.5) * b.cw, ty: b.y0 + (row + 0.5) * b.ch };
  }

  // Ant has reached its cell: erase it from the image, attach a piece sprite.
  function takeBite(a) {
    const { b, col, row } = a.bite;
    const dx = col * b.cw, dy = row * b.ch;
    b.ic.clearRect(dx, dy, b.cw, b.ch);

    const pc = document.createElement("canvas");
    pc.width = b.cw; pc.height = b.ch;
    pc.className = "ant-piece";
    pc.getContext("2d").drawImage(
      b.src, dx * b.rx, dy * b.ry, b.cw * b.rx, b.ch * b.ry, 0, 0, b.cw, b.ch);
    overlay.appendChild(pc);

    a.piece = { el: pc, b, col, row, w: b.cw, h: b.ch,
                ox: b.x0 + dx + b.cw / 2, oy: b.y0 + dy + b.ch / 2, x: a.x, y: a.y };
    pieces.push(a.piece);
    placePiece(a.piece); // position it now, so it doesn't flash at (0,0) for a frame
    a.bite = null;
    a.state = "toNest";
  }

  // Drop the carried piece at the nest (it rests there until recall).
  function dropPiece(a) {
    // Scatter into a random lobe of the blobby nest (uniform within a circle).
    const b = nest.blobs[Math.floor(Math.random() * nest.blobs.length)];
    const ang = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * b.r;
    a.piece.x = nest.x + b.dx + Math.cos(ang) * rr;
    a.piece.y = nest.y + b.dy + Math.sin(ang) * rr;
    placePiece(a.piece);
    a.piece = null;
    a.state = "wander";
  }

  function placePiece(p) {
    // Clamp the drawn position to the page (keeps pieces from adding scrollbars).
    const px = clamp(p.x, p.w / 2, W - p.w / 2);
    const py = clamp(p.y, p.h / 2, H - p.h / 2);
    p.el.style.transform = "translate(" + (px - p.w / 2) + "px," + (py - p.h / 2) + "px)";
  }

  // On return: redraw the piece back into its hole, then drop the sprite.
  function refillPiece(p) {
    const dx = p.col * p.b.cw, dy = p.row * p.b.ch;
    p.b.ic.drawImage(p.b.src, dx * p.b.rx, dy * p.b.ry, p.b.cw * p.b.rx, p.b.ch * p.b.ry,
                     dx, dy, p.b.cw, p.b.ch);
    p.el.remove();
  }

  function release() {
    // Guard: on mobile the launcher is removed, so there's nothing to release.
    // (release reads the button's position for the nest, so bail if it's gone.)
    if (!document.querySelector(".action-button")) return;

    // Work in DOCUMENT coordinates and size the field to the whole page, so
    // the ants scroll with the page and bounce off the page edges (not the
    // screen edges).
    W = document.documentElement.clientWidth;  // excludes the scrollbar width
    H = document.documentElement.scrollHeight; // full page height
    cvs.width = W; cvs.height = H;
    cols = Math.ceil(W / CELL) + 1;
    rows = Math.ceil(H / CELL) + 1;
    pher = new Float32Array(cols * rows);
    tmp  = new Float32Array(cols * rows);
    seedTrails();
    buildTerrain();

    // Wrap words in place — the real text stays in normal flow (just turns
    // transparent), so the page layout never collapses or shifts.
    savedHTML = page().innerHTML;
    // Release is all-or-nothing: if any setup step throws (e.g. an image isn't
    // decodable yet), roll everything back. A half-finished release would leave
    // the ant clones stranded over the page — visible, and stuck in whatever
    // theme colour they were born with, since recolor() ignores them while
    // `running` is false.
    try {
      wrapWords();

      // Build a fixed overlay to hold the ants (a separate set of clones).
      overlay = document.createElement("div");
      overlay.id = "ant-overlay";
      document.body.appendChild(overlay);

      // Measure each word, then spawn a matching ant clone over it. The clone
      // copies the word's colour/weight so it looks identical to the text.
      // Positions are stored in DOCUMENT coords (rect + scroll offset).
      const sx = window.scrollX, sy = window.scrollY;
      const spans = [...page().querySelectorAll(".ant-word")];
      ants = spans.map(src => {
        const r = src.getBoundingClientRect();
        const cs = getComputedStyle(src);
        const clone = document.createElement("span");
        clone.className = "ant-clone";
        clone.textContent = src.textContent;
        clone.style.color = cs.color;
        clone.style.fontWeight = cs.fontWeight;
        clone.style.fontSize = cs.fontSize;
        overlay.appendChild(clone);

        const x = r.left + sx, y = r.top + sy;
        const faceRight = Math.random() < 0.5;
        // Keep a handle on the source word so the clone can be recoloured if the
        // colour theme changes mid-effect.
        // Role by source: headings -> soldiers (guard an image), links &
        // tooltip-buttons -> scouts (guard the nest), body words -> foragers.
        const tag = src.closest("h1, h2, h3, a, .tooltip-button");
        let role = "forager";
        if (tag) {
          const t = tag.tagName;
          role = (t === "H1" || t === "H2" || t === "H3") ? "soldier" : "scout";
        }
        return {
          el: clone, src,
          x, y, ox: x, oy: y,
          hw: r.width / 2, hh: r.height / 2,
          facing: faceRight ? 1 : -1,
          heading: faceRight ? 0 : Math.PI,
          legPhase: Math.random() * Math.PI * 2,
          pause: 0, settle: 0,
          role, imgIndex: Math.random() < 0.5 ? 0 : 1,
          state: "wander", bite: null, piece: null
        };
      });
      ants.forEach(place);

      // The nest sits well LEFT of (and a bit below) the action button, so the
      // ants and their growing pile of image-pieces don't cover the button.
      // Its footprint is a few overlapping circles, giving a blobby shape.
      const btn = document.querySelector(".action-button");
      const br = btn.getBoundingClientRect();
      const nx = br.left + sx - 220;
      const ny = br.top + br.height / 2 + sy + 50;
      const blobs = [{ dx: 0, dy: 0, r: 48 }]; // central lobe
      for (let i = 0; i < 5; i++) {            // surrounding overlapping lobes
        const ang = (i / 5) * Math.PI * 2 + Math.random();
        const off = 30 + Math.random() * 42;   // looser spread
        blobs.push({ dx: Math.cos(ang) * off, dy: Math.sin(ang) * off, r: 30 + Math.random() * 22 });
      }
      nest = { x: nx, y: ny, blobs };

      // Turn the flanking images into chewable canvases.
      biteImages = buildBiteImages(sx, sy);
      pieces = [];

      // Scatter obstacles for the ants to curve around.
      buildRepellors();

      running = true; goingHome = false;
      // Crossfade: text -> transparent, ant clones -> opaque. Also disables
      // every link/button except the living-document trigger.
      document.body.classList.add("ants-active");
      loop();
    } catch (err) {
      // Undo any partial setup and leave the page exactly as we found it.
      if (overlay) { overlay.remove(); overlay = null; }
      document.body.classList.remove("ants-active");
      page().innerHTML = savedHTML;
      ants = []; nest = null; biteImages = []; pieces = []; repellors = [];
      running = false; goingHome = false;
      console.error("Ant release aborted and rolled back:", err);
    }
  }

  function sense(a, ang) {
    return readPher(a.x + a.hw + Math.cos(ang) * SENSE_DIST,
                    a.y + a.hh + Math.sin(ang) * SENSE_DIST);
  }

  function loop() {
    diffuseEvaporate();
    if (nest) deposit(nest.x, nest.y, NEST_SCENT); // keep the nest scent strong
    let allHome = true;

    for (const a of ants) {
      if (goingHome) {
        const dx = a.ox - a.x, dy = a.oy - a.y, d = Math.hypot(dx, dy);
        if (d > 1.5) {
          allHome = false;
          const desired = Math.atan2(dy, dx);
          a.heading = lerpAngle(a.heading, desired, 0.35);
          const align = Math.max(0, Math.cos(a.heading - desired));
          const step = Math.min(d, 9 * SPEED_MULT) * align;
          a.x += Math.cos(a.heading) * step;
          a.y += Math.sin(a.heading) * step;
          a.legPhase += 0.5 * align;
          a.settle = 1 - clamp(d / SETTLE, 0, 1);
        } else {
          a.x = a.ox; a.y = a.oy; a.settle = 1;
        }
        place(a);
        continue;
      }

      // Foraging states override normal wandering.
      if (a.state === "toImage") {
        steerTo(a, a.bite.tx, a.bite.ty);
        if (dist(a.x, a.y, a.bite.tx, a.bite.ty) < REACH) takeBite(a);
        place(a);
        continue;
      }
      if (a.state === "toNest") {
        steerTo(a, nest.x, nest.y);
        a.piece.x = a.x; a.piece.y = a.y; placePiece(a.piece);
        if (dist(a.x, a.y, nest.x, nest.y) < NEST_REACH) dropPiece(a);
        place(a);
        continue;
      }

      // Guards don't forage: scouts circle the nest, soldiers circle an image.
      if (a.role === "scout") { patrol(a); place(a); continue; }
      if (a.role === "soldier") { soldierPatrol(a); place(a); continue; }

      // three-sensor trail following
      const fwd = sense(a, a.heading);
      const lft = sense(a, a.heading - SENSE_ANGLE);
      const rgt = sense(a, a.heading + SENSE_ANGLE);
      let turn = 0;
      if (fwd >= lft && fwd >= rgt) turn = 0;
      else if (lft > rgt) turn = -STEER;
      else turn = STEER;
      turn += (Math.random() - 0.5) * WANDER;
      a.heading += clamp(turn, -MAX_TURN, MAX_TURN);
      // Terrain flow gently bends the path into meandering curves...
      a.heading = lerpAngle(a.heading, flowAt(a.x, a.y), FLOW_TURN);
      applyRepel(a); // ...and obstacles push it firmly aside.

      if (a.pause > 0) a.pause--;
      else if (Math.random() < 0.002) a.pause = 8 + Math.random() * 18;
      const moving = a.pause === 0;
      const sp = moving ? SPEED * speedFactor(a.x, a.y) : 0; // thick terrain slows them
      a.legPhase += moving ? 0.6 : 0.12;

      a.x += Math.cos(a.heading) * sp;
      a.y += Math.sin(a.heading) * sp;

      // Bounce off ALL four page edges (no more teleporting across the page).
      const wordW = a.hw * 2, wordH = a.hh * 2;
      if (a.x < 0) { a.x = 0; a.heading = Math.PI - a.heading; }
      else if (a.x > W - wordW) { a.x = W - wordW; a.heading = Math.PI - a.heading; }
      if (a.y < 0) { a.y = 0; a.heading = -a.heading; }
      else if (a.y > H - wordH) { a.y = H - wordH; a.heading = -a.heading; }

      if (moving) deposit(a.x + a.hw, a.y + a.hh, DEPOSIT);

      // Foragers occasionally head off to bite a piece from an image.
      if (a.state === "wander" && Math.random() < FORAGE_CHANCE) startForage(a);
      place(a);
    }

    // On recall, every bitten piece flies back to its hole and refills it.
    if (goingHome) {
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        const dx = p.ox - p.x, dy = p.oy - p.y;
        if (Math.hypot(dx, dy) < 3) { refillPiece(p); pieces.splice(i, 1); }
        else { p.x += dx * 0.25; p.y += dy * 0.25; placePiece(p); allHome = false; }
      }
    }

    drawPher();
    if (goingHome && allHome && pieces.length === 0) return finishRecall();
    raf = requestAnimationFrame(loop);
  }

  function recall() {
    goingHome = true;
    for (const p of pieces) p.carried = false; // pieces head home on their own
  }
  function finishRecall() {
    cancelAnimationFrame(raf);
    running = goingHome = false;
    document.body.classList.remove("ants-active"); // text opaque again, links re-enabled
    ctx.clearRect(0, 0, W, H);
    if (overlay) { overlay.remove(); overlay = null; } // remove the ant clones + pieces
    page().innerHTML = savedHTML; // unwrap words + restore the original <img> tags
    Music.syncWord(); // the restored word may be stale — match the real music state
    nest = null; biteImages = []; pieces = []; repellors = [];
  }

  function toggle() {
    if (!running) { release(); return "released"; }
    if (!goingHome) { recall(); return "recalled"; }
    return null; // already marching home — do nothing
  }

  // Re-read each ant's colour from its source word (e.g. after a theme change).
  function recolor() {
    if (!running) return;
    for (const a of ants) if (a.src) a.el.style.color = getComputedStyle(a.src).color;
  }

  return { toggle, recolor };
})();
