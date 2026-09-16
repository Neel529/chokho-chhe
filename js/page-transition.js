/*
  Page transition — spec section 7.
  Status: FIRST PASS, UNREVIEWED. No reference material existed for this
  moment; built now per Nilesh's direction (2026-09-04) so Home<->Contact
  navigation isn't jarring, reusing the entry screen's visual language
  deliberately rather than inventing a second one. Expect this to change
  once it's actually seen. See gaps.md.

  Because this is a plain multi-page site (no client-side routing), the
  transition covers the outgoing page, a real browser navigation happens
  underneath, then the destination page lifts the same panel away on load.
  The lift-away trigger is a sessionStorage flag read synchronously in
  each page's <head> (see the inline script in index.html/contact.html)
  so the panel is already covering on first paint — no flash of the
  destination page underneath.

  Bug found and fixed 2026-09-06 (motion pass — direction/size): the
  outgoing panel was supposed to rise from below (translateY(100%) ->
  0%) but never visibly moved at all — confirmed by real per-frame
  getBoundingClientRect() sampling, not assumed. Root cause: same class
  of bug already hit twice elsewhere in this codebase (entry wordmark
  dot placement, custom cursor scale) — GSAP animating a `transform`
  property that already carries a raw CSS percentage value it never set
  itself. `translateY(0%)` (the incoming side's resting state) is a
  zero matrix, so GSAP's first-touch parse of it lands on y:0/yPercent:0
  with nothing to go wrong — that's why incoming already worked.
  `translateY(100%)` (CSS's default hidden-below-viewport state,
  transition.css) is a non-zero matrix: GSAP's parser resolves it to
  *pixels* (900px on a 900px-tall viewport) and stores that as a plain
  `y` offset, completely separate from its own `yPercent` tracking
  (confirmed by inspecting the live inline `transform` GSAP was writing
  frame by frame: a `yPercent`-driven translate correctly animating
  100%->0%, composed with a SECOND, never-changing
  `translate3d(0px, 900px, 0px)` — that leftover 900px pixel component,
  not the percentage, is what was actually pinning the panel below the
  viewport the entire time). First attempt only reset `yPercent`
  explicitly and left that leftover `y` alone, so it didn't fix
  anything. Real fix: `gsap.set(panel, { y: 0, yPercent: 100 })` — zeroing
  the stray pixel component AND giving GSAP an authoritative yPercent
  from-state, so the .to({yPercent:0}) tween has nothing left to fight.
*/

function initPageTransitionOutgoing() {
  const panel = document.getElementById('pageTransition');
  const emblem = panel ? panel.querySelector('.page-transition__emblem') : null;
  if (!panel) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.hasAttribute('data-unavailable') || link.target === '_blank') return;
    let url;
    try { url = new URL(href, window.location.href); } catch (e) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (reduced) {
        window.location.href = href;
        return;
      }
      sessionStorage.setItem('ckc-transition-incoming', '1');
      gsap.timeline({ onComplete: () => { window.location.href = href; } })
        .set(panel, { pointerEvents: 'auto', y: 0, yPercent: 100 })
        .to(panel, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' })
        .to(emblem, { opacity: 1, duration: 0.3 }, '-=0.15');
    });
  });
}

function initPageTransitionIncoming() {
  const panel = document.getElementById('pageTransition');
  if (!panel || sessionStorage.getItem('ckc-transition-incoming') !== '1') return;
  sessionStorage.removeItem('ckc-transition-incoming');

  const emblem = panel.querySelector('.page-transition__emblem');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  gsap.timeline({ delay: 0.15 })
    .to(emblem, { opacity: 0, duration: 0.2 })
    .to(panel, { yPercent: -100, duration: 0.6, ease: 'power3.inOut' }, '-=0.05')
    .set(panel, { pointerEvents: 'none' });
}
