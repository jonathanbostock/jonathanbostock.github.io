# Mobile-friendly mode + link tooltip colour fix

Date: 2026-06-04

## Goal

Make the personal site usable on narrow / touch screens without changing the
desktop (>1380px) experience at all. Also bring the URL-link hover tooltip into
visual line with the other two tooltip variants.

## Part 1 — Link tooltip colours (done)

The three tooltip variants share a spirit: **mid-tone accent background + light
text**.

- tooltip-button: blue bg `#4087a2` + light `#e6f0f5`
- ant/action: purple bg `#a40043` + pale `#f6dce8`
- link (was): dark bg `#241f1c` + mid orange `#ef9a5b` — out of spirit

Fix: link tooltip now uses the link orange as background with pale text:
`background:#b44e24; color:#f7e4d6;`.

## Part 2 — Mobile mode

CSS-first. Desktop HTML/JS unchanged. A single `@media (max-width: 1380px)`
block plus minimal JS guards.

### Breakpoint
`max-width: 1380px` — the width below which the 300px side gutters no longer
fit. Below it: stacked layout. This also fixes the pre-existing medium-width
overflow (images spilling off-screen between ~720 and ~1380px).

### Layout (inside the media block)
- `.side-img`: `position: static; width: min(300px, 100%); margin: 0 auto 1rem;
  display: block;` and drop the `left/right` gutter offsets. Each image is
  already the first child of its section, so it flows in above the heading →
  sequential images + paragraphs. Images constrained to ~300px and centred.
- `.align-left/.align-right/.align-center`: `max-width: 100%`, drop auto margins
  so text uses the full reading column.
- `body`: keep `max-width: 720px` centring (already correct once gutters gone).

### Living document + ant effect
- `.ant-launcher { display: none }` in the media block → button not tappable,
  so the effect never triggers.
- JS guard: `release()` early-returns if `.action-button` is absent, so nothing
  throws even if reached.

### Tooltips on touch
- Link href tooltips: gate `showLinkTooltip` behind
  `matchMedia("(hover: hover)").matches` — hover devices keep them, touch
  devices skip. Device-based signal (correct for this), not width-based.
- Definition buttons: unchanged. Existing tap-to-pin click handler already works
  on touch.
- `positionTooltipUnder`: clamp horizontally to the viewport (with a small
  margin) so a pinned definition near a screen edge can't overflow on narrow
  viewports. No-op on desktop in practice.

### Unchanged
Desktop (>1380px) pixel-for-pixel identical. Dark mode, fonts, colours, Part-1
fix untouched.

## Risk
The `(hover: hover)` gate is device- rather than width-based: a touch device on
a wide screen also drops link tooltips — which is the desired behaviour.
