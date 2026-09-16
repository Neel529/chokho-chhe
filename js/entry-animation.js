/*
  Entry / loading animation — spec section 1.
  Phase 1+2 (English wordmark assembles -> crossfades to Hindi) is adapted
  from the working prototype at
  file_compilations/CKC_hindi_to_english_load_transition.html, rebuilt as a
  GSAP timeline to match this project's motion stack. Per Nilesh (2026-09-04):
  timing values are a rough reference, not locked — adjust freely.

  Phase 3 (curtain lift) is new. Per Nilesh (2026-09-04): the wordmark
  settles into its header position first, THEN the curtain lifts.

  Plays once per browser session (sessionStorage flag) so repeat homepage
  loads in the same tab don't replay the full sequence — see build-log.md.

  Restructured 2026-09-06 (build-log.md, "one wordmark node" fix): there is
  only ever one wordmark element, #headerWordmark, permanently parented in
  .site-header__wordmark-wrap. It is never removed, recreated, or swapped.
  During the sequence it gets a temporary scale + vertical-offset transform
  (computed from its own resting rect, not from a second element) so it
  visually reads as assembling inside the curtain; its wrap's z-index is
  raised above the curtain's for the same reason. "Settle" (Phase 3) is
  just that transform relaxing back to identity — which IS the node's
  natural header position, since it never actually left it. The curtain
  lift needs no detach step: the wordmark was never its DOM descendant, so
  the curtain's own translateY never touches it.
*/

function initEntry() {
  const screen = document.getElementById('entryScreen');
  const wordmark = document.getElementById('headerWordmark');
  if (!screen || !wordmark) return;

  const wrap = wordmark.closest('.site-header__wordmark-wrap');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const alreadyPlayed = sessionStorage.getItem('ckc-entry-played') === '1';

  if (alreadyPlayed || reduced) {
    // No animation at all — the wordmark is already sitting in its
    // resting CSS state (entry.css: Hindi groups + dot visible, English
    // hidden, identity transform). Nothing to set, nothing to swap.
    screen.remove();
    document.body.classList.remove('entry-active');
    return;
  }

  sessionStorage.setItem('ckc-entry-played', '1');
  document.body.classList.add('entry-active');

  const ids = ['entry-en-cho', 'entry-en-kho', 'entry-en-chhe', 'entry-hi-cho', 'entry-hi-kho', 'entry-hi-chhe'];
  const hiIds = ['entry-hi-cho', 'entry-hi-kho', 'entry-hi-chhe'];
  const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const dot = document.getElementById('entry-dot');

  // From-state set via GSAP, not CSS (see entry.css comment on .entry-glyph) —
  // GSAP misparses a pre-existing CSS `transform: scale(...)` on an SVG
  // shape and renders it wildly off-position (verified live: the dot
  // landed ~150-230px outside the wordmark's own <svg>). Setting the
  // from-state through gsap.set() with an explicit transformOrigin avoids
  // that parse step entirely — confirmed fixed via isolated test before
  // landing here.
  gsap.set(ids.map((id) => els[id]), { y: 6, scale: 0.94, transformOrigin: '50% 50%' });
  // entry.css's resting default makes the Hindi groups + dot opacity:1
  // (the finished state, correct for skip/reduced-motion pages) — pull
  // them back to a blank slate here since the sequence is about to
  // actually assemble the English word first.
  gsap.set(hiIds.map((id) => els[id]), { opacity: 0 });
  gsap.set(dot, { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });

  // Measure the wordmark's own natural (resting/header) rect BEFORE
  // touching its transform — this is the geometry Phase 3 settles back
  // to, and the only rect this animation ever reasons about.
  const naturalRect = wordmark.getBoundingClientRect();
  const introWidth = Math.min(window.innerWidth * 0.7, 480);
  const introScale = naturalRect.width > 0 ? introWidth / naturalRect.width : 1;
  const naturalCenterY = naturalRect.top + naturalRect.height / 2;
  const introY = (window.innerHeight / 2) - naturalCenterY;

  if (wrap) wrap.classList.add('is-entry-lifted');
  gsap.set(wordmark, { y: introY, scale: introScale, transformOrigin: '50% 50%' });

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out', transformOrigin: '50% 50%' },
    onComplete: () => {
      // The wordmark needs nothing done to its geometry here — the settle
      // tween below already left it at scale 1 / y 0, its natural header
      // transform. Colour is different: entry.css/header.css force it to
      // parchment for as long as `entry-skip` is absent from <html> (see
      // header.css's "Bug fixed 2026-09-06" comment) — that's what kept it
      // readable against the dark curtain for the whole sequence. Adding
      // `entry-skip` here, in the same tick the curtain is removed, is
      // what lets it crossfade to this page's real header colour (ink on
      // contact/trust) only now that the sequence is actually over —
      // exactly the same class the head inline script sets synchronously
      // for the genuine skip cases, just applied at the other end this
      // time.
      document.documentElement.classList.add('entry-skip');
      if (wrap) wrap.classList.remove('is-entry-lifted');
      screen.remove();
      document.body.classList.remove('entry-active');
    },
  });

  // ---- Phase 1: English wordmark assembles, left to right ----
  tl.to(els['entry-en-cho'], { opacity: 1, y: 0, scale: 1, duration: 0.4 }, 0.1)
    .to(els['entry-en-kho'], { opacity: 1, y: 0, scale: 1, duration: 0.4 }, 0.42)
    .to(dot, { opacity: 1, scale: 1, duration: 0.3 }, 0.62)
    .to(els['entry-en-chhe'], { opacity: 1, y: 0, scale: 1, duration: 0.4 }, 0.82)
    // hold complete English word
    .to({}, { duration: 0.7 })

    // ---- Phase 2: translate to Hindi, one syllable at a time, dot stays ----
    // Crossfade sped up 2026-09-06 (motion pass): each fade 0.35s -> 0.22s
    // and the between-syllable gap 0.25s -> 0.16s (same ratio, scaled
    // together — both are "the crossfade," not separate timings). Per
    // Nilesh: speed up only this, leave Phase 1, the holds, the settle,
    // and the curtain lift untouched.
    .to(els['entry-en-cho'], { opacity: 0, duration: 0.22 }, '+=0')
    .to(els['entry-hi-cho'], { opacity: 1, duration: 0.22 }, '<')
    .to(els['entry-en-kho'], { opacity: 0, duration: 0.22 }, '+=0.16')
    .to(els['entry-hi-kho'], { opacity: 1, duration: 0.22 }, '<')
    .to(els['entry-en-chhe'], { opacity: 0, duration: 0.22 }, '+=0.16')
    .to(els['entry-hi-chhe'], { opacity: 1, duration: 0.22 }, '<')
    // hold complete Hindi word — end state of the referenced prototype
    // (untouched — not part of the crossfade itself)
    .to({}, { duration: 1.1 })

    // ---- Phase 3: settle into resting header transform, then curtain lifts ----
    // Not a rect-match against a second element — this node's own
    // temporary intro transform simply relaxes back to identity, which is
    // already its natural header position/size.
    .to(wordmark, { y: 0, scale: 1, duration: 0.7, ease: 'power2.inOut' })
    // Curtain lifts away. The wordmark was never its DOM descendant (it
    // lives in .site-header__wordmark-wrap, a sibling), so this transform
    // never touches it — no detach step needed.
    .to(screen, { yPercent: -100, duration: 0.8, ease: 'power3.inOut' }, '+=0.1');
}
