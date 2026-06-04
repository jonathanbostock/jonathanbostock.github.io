// ============================================================
//  ACTION BUTTON DEFINITIONS  ← EDIT THIS PART
//  Add one entry per action button. The key on the left must
//  match the button's  data-define="..."  value in index.html.
// ============================================================
const actionButtonDefinitions = {
  "living-document": "A living document is one which is updated over time, as opposed to being written once and kept static.",
  "ai-alignment": "The AI Alignment problem is the technical and philosophical problem of producing artificially intelligent systems which are aligned to human values.",
  "ai-control": "The field of AI Control studies how to prevent AI systems from causing harm, even if they attempt to do so. I investigated a sub-field called untrusted montoring.",
  "bio-nanotech": "Bio-nanotech is a field of science which attempts to build nanometer-scale structures out of biological molecules, like lipids, DNA, and proteins.",
  // "another-key": "Another definition goes here.",
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
  tooltip.style.left = centerX - tooltip.offsetWidth / 2 + "px";
  tooltip.style.top = rect.bottom + window.scrollY + 6 + "px";
}

// Build a tooltip element for a button, place it under the button, return it.
function createTooltip(button) {
  const key = button.dataset.define;
  const text = actionButtonDefinitions[key] || `(No definition set for "${key}")`;
  const tooltip = document.createElement("span");
  tooltip.className = "action-tooltip";
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
  document.querySelectorAll(".action-button.pinned")
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

document.addEventListener("mouseover", (e) => {
  const button = e.target.closest(".action-button");
  if (button) showHoverTooltip(button);
});

document.addEventListener("mouseout", (e) => {
  const button = e.target.closest(".action-button");
  if (!button) return;
  if (button.contains(e.relatedTarget)) return; // still inside the same button
  hideHoverTooltip();
});

// Delegated click handler: works even after the ant effect rebuilds the page.
document.addEventListener("click", (e) => {
  const button = e.target.closest(".action-button");
  const hadTooltips = pinnedTooltips.size > 0;

  // A click ANYWHERE cancels any active tooltip.
  if (hadTooltips) dismissAllTooltips();

  if (button) {
    if (button.dataset.define === "living-document") {
      // Pin the tooltip only when this click RELEASES the ants. On a recall
      // click (or while already marching home) the tooltip stays down — even
      // if it was already dismissed by an earlier click somewhere random.
      if (Ants.toggle() === "released") pinTooltip(button);
    } else {
      // Plain action buttons: pin unless this same click just dismissed one
      // (so clicking an open button reads as "close", not "reopen").
      if (!hadTooltips) pinTooltip(button);
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
  const SPEED       = 0.9;      // forward px per frame
  const SETTLE      = 80;       // within this distance of home, rotate upright
  // ------------------------------------------------------------------------

  const cvs = document.getElementById("pher");
  const ctx = cvs.getContext("2d");

  let ants = [], raf = null;
  let running = false, goingHome = false, savedHTML = null;
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
        // Leave action buttons (and anything inside them) static — they
        // shouldn't dissolve into ants when clicked.
        if (n.parentElement.closest(".action-button")) return NodeFilter.FILTER_REJECT;
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
    const walkRot = a.facing === 1 ? a.heading : a.heading - Math.PI;
    const rot = lerpAngle(walkRot, 0, s);
    a.el.style.transform = "translate(" + a.x + "px," + (a.y + bob) + "px) rotate(" + rot + "rad)";
  }

  function release() {
    W = innerWidth; H = innerHeight;
    cvs.width = W; cvs.height = H;
    cols = Math.ceil(W / CELL) + 1;
    rows = Math.ceil(H / CELL) + 1;
    pher = new Float32Array(cols * rows);
    tmp  = new Float32Array(cols * rows);
    seedTrails();

    savedHTML = page().innerHTML;
    wrapWords();

    // PASS 1: measure every word while all are still in normal flow
    const spans = [...page().querySelectorAll(".ant-word")];
    const rects = spans.map(el => el.getBoundingClientRect());

    // Also measure the static action buttons, so we can pin them in place.
    // Otherwise, once the words around them detach, the page collapses and
    // the buttons jump to the top.
    const staticEls = [...page().querySelectorAll(".action-button")];
    const staticRects = staticEls.map(el => el.getBoundingClientRect());

    // PASS 2: now detach them all (no reflow can corrupt the stored positions)
    ants = spans.map((el, i) => {
      const r = rects[i];
      const faceRight = Math.random() < 0.5;
      el.classList.add("loose");
      return {
        el,
        x: r.left, y: r.top, ox: r.left, oy: r.top,
        hw: r.width / 2, hh: r.height / 2,
        facing: faceRight ? 1 : -1,
        heading: faceRight ? 0 : Math.PI,
        legPhase: Math.random() * Math.PI * 2,
        pause: 0, settle: 0
      };
    });
    ants.forEach(place);

    // Pin each action button at the spot it occupied before the collapse.
    // (finishRecall() rebuilds the page from savedHTML, which clears these.)
    staticEls.forEach((el, i) => {
      const r = staticRects[i];
      el.style.position = "fixed";
      el.style.boxSizing = "border-box";
      el.style.left = r.left + "px";
      el.style.top = r.top + "px";
      el.style.width = r.width + "px";   // preserve width so centered content stays centered
      el.style.height = r.height + "px";
      el.style.margin = "0";
      el.style.zIndex = "20";
    });

    running = true; goingHome = false;
    document.body.classList.add("ants-active"); // boxed buttons fill while ants are out
    loop();
  }

  function sense(a, ang) {
    return readPher(a.x + a.hw + Math.cos(ang) * SENSE_DIST,
                    a.y + a.hh + Math.sin(ang) * SENSE_DIST);
  }

  function loop() {
    diffuseEvaporate();
    let allHome = true;

    for (const a of ants) {
      if (goingHome) {
        const dx = a.ox - a.x, dy = a.oy - a.y, d = Math.hypot(dx, dy);
        if (d > 1.5) {
          allHome = false;
          const desired = Math.atan2(dy, dx);
          a.heading = lerpAngle(a.heading, desired, 0.35);
          const align = Math.max(0, Math.cos(a.heading - desired));
          const step = Math.min(d, 9) * align;
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

      if (a.pause > 0) a.pause--;
      else if (Math.random() < 0.002) a.pause = 8 + Math.random() * 18;
      const moving = a.pause === 0;
      const sp = moving ? SPEED : 0;
      a.legPhase += moving ? 0.6 : 0.12;

      a.x += Math.cos(a.heading) * sp;
      a.y += Math.sin(a.heading) * sp;

      if (a.x < -80) a.x = W + 60; else if (a.x > W + 80) a.x = -60;
      if (a.y < -40) a.y = H + 40; else if (a.y > H + 60) a.y = -40;

      if (moving) deposit(a.x + a.hw, a.y + a.hh, DEPOSIT);
      place(a);
    }

    drawPher();
    if (goingHome && allHome) return finishRecall();
    raf = requestAnimationFrame(loop);
  }

  function recall() { goingHome = true; }
  function finishRecall() {
    cancelAnimationFrame(raf);
    running = goingHome = false;
    document.body.classList.remove("ants-active"); // back to transparent box
    ctx.clearRect(0, 0, W, H);
    page().innerHTML = savedHTML;
  }

  function toggle() {
    if (!running) { release(); return "released"; }
    if (!goingHome) { recall(); return "recalled"; }
    return null; // already marching home — do nothing
  }

  return { toggle };
})();
