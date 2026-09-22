/*
  Init order matters: incoming page-transition cover must be visible
  before entry-skip logic runs (both are already synchronously handled
  by inline <head> scripts per-page — see index.html/contact.html), then
  GSAP-driven sequences take over.
*/

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  initEntry();
  initHeader();
  initHeaderGroundTheme();
  initCursor();
  initPageTransitionOutgoing();
  initPageTransitionIncoming();
  initScrollReveals();
  initHeroVideo();
  // initDesireBeat() must run before initHeroDesireTransition(): it
  // attaches the 'ckc:heroDissolveSettled' listener that the transition
  // dispatches to start Section 2's first shuffle, and reduced-motion
  // dispatches that event synchronously (same tick) — a listener attached
  // after the dispatch would simply miss it.
  initDesireBeat();
  initHeroDesireTransition();
  initUnderstandingScrub();
  initContactForm();
  initTrustFormulation();
  initTrustParallax();
  initTrustDocReveal();
  initCart();
  initShopProduct();

  // Self-hosted fonts use font-display: swap (variables.css), so fallback
  // fonts render first and metric-swap in — that reflows heights (headings,
  // form fields, footer stack), which can leave every ScrollTrigger start/
  // end position (paradox reveal, header ground-theme switching) computed
  // against the pre-swap layout. Re-measure once real fonts land.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());
});

function initScrollReveals() {
  // Category-paradox headline — spec section 4. The word-by-word mask
  // reveal is the spec-decided interaction; this used to only run when
  // the headline was real copy (gated on NOT having `is-placeholder`),
  // which meant the decided interaction silently never fired while the
  // copy is a placeholder — exactly the state it's in now. Fixed
  // 2026-09-06: run it whenever the real .word/span structure exists,
  // regardless of placeholder status, so it's the same interaction either
  // way — only the wording changes once real copy is approved.
  const paradoxLine = document.querySelector('.paradox__line');
  if (paradoxLine) {
    const words = paradoxLine.querySelectorAll('.word > span');
    if (words.length) {
      gsap.set(words, { yPercent: 110 });
      gsap.to(words, {
        yPercent: 0,
        duration: 0.9,
        ease: 'power4.out',
        stagger: 0.06,
        scrollTrigger: { trigger: paradoxLine, start: 'top 80%' },
      });
    } else {
      // Fallback only for markup that hasn't been split into words yet.
      gsap.from(paradoxLine, {
        opacity: 0,
        y: 24,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: paradoxLine, start: 'top 80%' },
      });
    }
  }

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 30,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
}

/*
  Hero video behaviour — spec section 3, Hero gate (2026-09-06). Real
  playback logic, currently inert because no real footage exists yet (see
  the HTML comment in index.html and gaps.md) — the moment a real <source>
  is added, this starts working without any other change needed.
*/
function initHeroVideo() {
  const video = document.querySelector('.hero__video');
  if (!video) return;

  // Guard stays even now that a (mock) <source> exists, 2026-09-10 — still
  // correct no-op if a future edit strips it back out. Checked via
  // <source>, not a src attribute (see index.html comment).
  if (!video.querySelector('source')) return;

  const media = video.closest('.hero__media');
  const placeholder = media ? media.querySelector('.hero__media-label') : null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Once the video actually starts playing, the placeholder text (which
  // sits on top of it, see home.css stacking order) can go away.
  video.addEventListener('playing', () => {
    if (placeholder) placeholder.style.display = 'none';
  }, { once: true });

  if (reduced) {
    // Respect reduced motion: leave it on its first frame, don't autoplay.
    return;
  }

  // Mobile autoplays too, same as desktop (Nilesh, 2026-09-06) — gated
  // only by whether the hero is actually in view, not by viewport size,
  // so it doesn't run while scrolled away.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Autoplay can still be blocked by the browser even when muted;
        // fail silently rather than an unhandled rejection — the
        // placeholder simply stays visible if that happens.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.25 });
  io.observe(media || video);
}

/*
  Hero -> Desire dissolve (2026-09-13, fifth pass — "feather the edge
  itself" round). Replaces the hard cut Nilesh flagged between the
  cinematic hero and Section 2. Four earlier same-day passes are logged
  in build-log.md; the short version:
    Pass 1 — dissolve colour was the hero's own private overlay, could
      mismatch Section 2's separately-set background outright.
    Pass 2 — same shared colour variable for both (pixel-identical,
      verified) — but a hard line still showed.
    Pass 3 — traced that to the video's own clipped bounding-box edge
      staying sharp regardless of blur, added a video-opacity fade —
      fixed the RESTING state, but a seam remained mid-scroll, since
      Section 2's colour is a static, already-"finished" value the
      instant any of it is visible, while the hero's tail was still
      mid-tween.
    Pass 4 — pinned .hero for a scroll distance so the dissolve is
      structurally forced to finish before Section 2 can appear at all.
      Verified working exactly as designed (Section 2 provably off-screen
      for the entire pin) — but Nilesh's next read was that a hard line
      was STILL visible, at every scroll depth including 10% — because
      the underlying shape was still two flat blocks meeting at a line;
      pinning controlled WHEN that line could appear on screen, it never
      made the line itself soft. His direction this round: stop trying to
      hide or time around the edge — feather the edge itself so there is
      no line to hide, and go back to a plain, direct scroll mapping
      (10% scrolled = 10% dissolved) rather than a pinned hold.

  Fixed this pass: `.hero__video` now carries a permanent CSS mask
  (mask-image/-webkit-mask-image, see css/home.css) — a linear gradient
  down its lower portion fading from fully opaque to fully transparent at
  its very bottom edge. This is a STATIC property of the video's shape,
  not scroll-animated: at every scroll position, whatever amount of video
  is currently showing (per the opacity/blur tweens below) already has a
  softly feathered bottom, not a sharp rectangle — so there is no instant
  where "video" and "not video" meet at a hard line, by construction,
  regardless of how far through the dissolve the scroll position is. The
  scroll-tied blur/video-opacity/overlay-opacity tweens are otherwise
  unchanged from Pass 3 (same staggered durations, same reasoning for
  the stagger — see the tween comments below) — the mask governs the
  EDGE's shape, the tweens still govern how much of the video remains
  overall. .hero is no longer pinned; the scroll trigger is back to a
  plain 'bottom bottom' -> 'bottom top' span (no pin, no end-point
  buffer) — exactly the "10% scroll = 10% dissolved" mapping asked for,
  spanning the one-viewport-height distance .hero takes to scroll fully
  off-screen.

  MAX_BLUR (20px) is a build-time starting value — retune freely.

  SIXTH PASS (2026-09-14, product-jar round) — CSS-ONLY fix, nothing in
  this function changed: the fifth pass's video-only mask still left a
  real, screenshot-confirmed seam mid-scroll (roughly the first 60% of
  the range), because .hero__media's own texture and .hero__dissolve
  (both unmasked) sat underneath the video at that same edge. Fixed by
  moving the mask from `.hero__video` to its parent `.hero__media` in
  css/home.css — see that file's comment for the full root-cause. The
  tweens below still target the same elements, unchanged.

  Fires 'ckc:heroDissolveSettled' once the dissolve completes (scroll
  crossing the end point going forward), or immediately if reduced-motion
  is on (no scroll-tied ramp at all, same policy as initHeroVideo/
  initDesireBeat) or if the page loads/refreshes already scrolled past the
  zone. initDesireBeat() listens for this to start Section 2's first
  shuffle only after a short settle beat — see that function.
*/
function initHeroDesireTransition() {
  const hero = document.querySelector('.hero');
  const video = document.querySelector('.hero__video');
  const overlay = document.querySelector('.hero__dissolve');
  if (!hero || !video || !overlay) return;

  // Product jar (2026-09-14 round) — optional: querySelector returns null
  // harmlessly if this markup isn't present, same defensive pattern as the
  // required elements above. Tweened on this SAME timeline (below), not a
  // second scrollTrigger, so it resolves into focus in exact lockstep with
  // the video's own dissolve/blur — never a separately-timed animation.
  const jarMedia = document.querySelector('.desire__jar-media');
  const jarId = document.querySelector('.desire__jar-id');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_BLUR = 20;

  function fireSettled() {
    document.dispatchEvent(new CustomEvent('ckc:heroDissolveSettled'));
  }

  if (reduced) {
    fireSettled();
    return;
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'bottom bottom',
      end: 'bottom top',
      scrub: 0.6,
      onLeave: fireSettled,
    },
  })
    // Explicit `duration` on every tween (GSAP's unstated default is
    // 0.5s, not 1 — leaving it implicit would make the total timeline
    // length whatever the longest tween happens to default to, silently
    // shifting how the others map onto the scroll range). Deliberately
    // staggered, not all equal: .hero__dissolve reaches full opacity
    // FIRST (0.6) — fully covering the video/placeholder/scrim stack
    // regardless of their own state — just before the video itself
    // finishes fading to invisible (0.7), so there's no window where a
    // still-forming, partially-transparent overlay could let the
    // placeholder texture underneath peek through unblended. Blur runs
    // the full range (1) since it's purely cosmetic once the video is
    // already hidden behind the overlay either way.
    .fromTo(video, { filter: 'blur(0px)' }, { filter: 'blur(' + MAX_BLUR + 'px)', duration: 1, ease: 'power1.in' }, 0)
    .fromTo(video, { opacity: 1 }, { opacity: 0, duration: 0.7, ease: 'power1.in' }, 0)
    .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.in' }, 0);

  // Jar resolves into focus over roughly the same span the overlay takes
  // to fully cover the video (0.6) — "reaching full opacity as the video
  // fades," not before or after it. Deceleration (power1.out) is the
  // opposite curve from the video's own accelerating blur (power1.in) on
  // purpose: the video is disappearing (speeds up going), the jar is
  // arriving (settles in) — "quiet and inevitable," not a snap into
  // place. Opacity AND blur only — no x/y/scale anywhere in this tween,
  // per the brief ("does NOT move, spin, settle-aside, or perform").
  if (jarMedia) {
    tl.fromTo(jarMedia, { opacity: 0, filter: 'blur(28px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.65, ease: 'power1.out' }, 0);
  }
  // Identity label trails the jar itself very slightly (0.1) — same
  // "arrives after, not with" logic as the CTA-after-shuffle beats
  // elsewhere on this page, just much smaller here.
  if (jarId) {
    tl.fromTo(jarId, { opacity: 0 }, { opacity: 0.65, duration: 0.6, ease: 'power1.out' }, 0.1);
  }

  // Cold-load edge case: page opened/refreshed already scrolled past the
  // dissolve zone. onLeave only fires on a live crossing, so on its own it
  // would never fire here — check the resolved progress right after
  // creation and fire the same signal if the scroll position is already
  // past it.
  if (tl.scrollTrigger.progress >= 1) fireSettled();
}

/*
  Desire beat — homepage section 2 (feel/bugfix round, 2026-09-12 round
  4). See index.html/home.css for the full context. The rising-mask
  "reel" mechanic, the two-layer overlap approach, and the scramble
  ORDER system (buildFiringOrder/isTooSequential, below — unchanged,
  still correct per Nilesh) all carry over untouched. This round reworks
  only: (a) how much TIME sits between each firing-order beat — no
  longer a fixed step, see buildBeatTimes() — and (b) the easing/
  duration of each word's own rise. It also drops the wrap's height-
  tween entirely, now that css/home.css locks that height — see this
  file's shuffle() and that file's .desire__line-wrap comment for why
  the tween itself was the real cause of the CTA moving every shuffle,
  not a separate bug needing a separate fix.

  IRREGULAR TIMING (this round's core change): round 3 assigned each
  firing-order position a delay of `position * BASE_STAGGER + small
  jitter` — a fixed step size with only minor wobble. Nilesh's read,
  correct: even with the WORD ORDER scrambled, evenly-spaced beats still
  read as a sequence, because the ear/eye tracks rhythm independently of
  content. buildBeatTimes() replaces the fixed step with genuinely
  irregular gaps: each of the (maxCount-1) gaps between beats gets an
  independently randomized raw weight across a wide range
  (GAP_WEIGHT_MIN..GAP_WEIGHT_MAX, a 6x spread), THEN all weights are
  scaled so they sum to exactly BEAT_SPAN — this is what keeps the ~1s-
  ish overall bound exact every time regardless of word count, while the
  RELATIVE spacing between individual beats stays irregular (some gaps
  end up small — two words firing almost back-to-back — others large).
  Freshly generated every shuffle, same as the order itself.

  OVERLAP-BUG FIX from round 3 (ENTRY_OFFSET: entry starts slightly
  after its paired exit, not simultaneously) is unchanged in mechanism,
  just retuned slightly alongside the slower rise below.

  GRANDPARENT ANCHOR — REMOVED 2026-09-14 (Nilesh, this round): the
  tappable word-0 name-cycling feature (Nani -> Dadi -> Nana -> Dada),
  its persistence-across-shuffles behaviour, and the typographic
  differentiation built for it are gone outright, not disabled — see
  build-log.md Session 40 for the full removal and gaps.md for the
  now-resolved gendered-conjugation limitation that only existed because
  of this feature. Word 0 is a plain word again, same as every other
  word in the line, rendered from the statement's own text — no special
  case in buildLine() below anymore. Incidental effect: this also fixes
  the "auto-shuffle doesn't seem to cycle" report — auto-shuffle itself
  was never broken (confirmed firing every ~5s via direct testing before
  this change — the interval was 5000ms at the time; changed to 3000ms
  2026-09-15, see AUTO_INTERVAL_MS below), but the anchor's persistence
  meant the single most visually prominent word (bold/coloured) never
  changed across a shuffle, which read as "nothing is happening" at a
  glance even though the rest of the line was advancing correctly
  underneath it.
*/
function initDesireBeat() {
  const wrap = document.getElementById('desireLineWrap');
  const shuffleBtn = document.getElementById('desireShuffle');
  if (!wrap || !shuffleBtn) return;

  // Real (proofing-pending) Hinglish statements — given directly by
  // Nilesh 2026-09-13, verbatim, in this exact order (not a build-time
  // arc-ordering call anymore — see index.html comment). All Latin
  // script, no Devanagari in this section. "sense" in statement 4 is
  // intentional English code-switching, not a typo — do not "fix" it.
  // Spelling/exact wording is pending native-Hindi-reader proofing (see
  // gaps.md) — built exactly as given, not corrected or normalized.
  const STATEMENTS = [
    'Nani ko ye pasand aata',
    'Dadi iske liye haan kar detin',
    'Nani ne toh pehle hi bola tha',
    'Dadi ki baat ab sense bana rahi hai',
    'Dada toh kehte hi the!',
  ];
  const AUTO_INTERVAL_MS = 3000; // 3s auto-shuffle, changed from 5s 2026-09-15 (Nilesh). Manual shuffleBtn click still works unchanged — both paths share resetTimer().
  // BEAT_SPAN: total budget (s) for the irregular gaps between firing-
  // order beats — see buildBeatTimes() below. GAP_WEIGHT_MIN/MAX set the
  // spread of raw randomness BEFORE it's scaled to fit that budget; a
  // wide min/max ratio (6x) is what makes gaps actually irregular rather
  // than evenly jittered.
  const BEAT_SPAN = 0.3;
  const GAP_WEIGHT_MIN = 0.3;
  const GAP_WEIGHT_MAX = 1.8;
  // ENTRY_OFFSET: entry starts this long after its paired exit (overlap
  // fix, round 3 — unchanged mechanism). RISE_DUR: a single word's own
  // rise duration — slowed from round 3's 0.6s per Nilesh ("err
  // slower"); BEAT_SPAN was trimmed from round 3's effective ~0.4-0.5s
  // spread to make room for the slower rise while keeping the total
  // shuffle close to the same ~1s-ish ballpark rather than letting it
  // balloon — a deliberate trade, not an oversight (see report).
  const ENTRY_OFFSET = 0.09;
  const RISE_DUR = 0.7;
  const SEQUENTIAL_THRESHOLD = 0.7; // reshuffle if >=70% of adjacent pairs are ascending
  const MAX_SHUFFLE_ATTEMPTS = 8;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let index = 0;
  let animating = false;
  let timer = null;

  // Elizeth's Trial .otf is missing glyphs for these — confirmed by
  // direct isolated test 2026-09-13 while checking an unrelated
  // screenshot (statement 5's "!" rendered as tofu). Same underlying gap
  // logged in gaps.md for the hero/Trust pages (apostrophe/em-dash);
  // this is a wider-scoped instance of it, found incidentally this
  // round, not something this round's task asked for. Mitigation is the
  // same established pattern: wrap just the broken character in a span
  // set to the body font, Elizeth for everything else in the word.
  // Resolves itself once the licensed (non-Trial) Elizeth files land.
  const ELIZETH_BROKEN_GLYPHS = /[!?;:'"()&]/;

  function appendWordContent(el, word) {
    let buffer = '';
    for (const ch of word) {
      if (ELIZETH_BROKEN_GLYPHS.test(ch)) {
        if (buffer) {
          el.appendChild(document.createTextNode(buffer));
          buffer = '';
        }
        const fallback = document.createElement('span');
        fallback.className = 'desire__glyph-fallback';
        fallback.textContent = ch;
        el.appendChild(fallback);
      } else {
        buffer += ch;
      }
    }
    if (buffer) el.appendChild(document.createTextNode(buffer));
  }

  function buildLine(text, extraClass) {
    const p = document.createElement('p');
    p.className = 'desire__line' + (extraClass ? ' ' + extraClass : '');
    p.setAttribute('lang', 'hi-Latn');
    const words = text.split(' ');
    words.forEach((w, i) => {
      const mask = document.createElement('span');
      mask.className = 'word';
      const inner = document.createElement('span');
      appendWordContent(inner, w);
      mask.appendChild(inner);
      p.appendChild(mask);
      if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
    });
    return p;
  }

  // Fisher-Yates — fresh call site inside buildFiringOrder() each
  // shuffle, never memoized, so every shuffle gets its own permutation.
  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // "Too close to sequential" = mostly-ascending adjacent pairs, not
  // merely "not the exact sorted order" — a near-miss (e.g. one swap
  // away from sorted) would still read as boring left-to-right motion.
  function isTooSequential(order) {
    if (order.length < 2) return false;
    let ascending = 0;
    for (let i = 0; i < order.length - 1; i++) {
      if (order[i] < order[i + 1]) ascending++;
    }
    return ascending / (order.length - 1) >= SEQUENTIAL_THRESHOLD;
  }

  // Slot 0 is a fixed anchor (always fires first); every other slot
  // (1..maxCount-1) gets a freshly-randomized order, regenerated if it
  // comes out too close to ascending. Returns the full firing order,
  // e.g. [0, 4, 2, 5, 3, 1] for a 6-word statement.
  function buildFiringOrder(maxCount) {
    if (maxCount <= 1) return [0];
    const rest = [];
    for (let i = 1; i < maxCount; i++) rest.push(i);
    let order = shuffleArray(rest);
    let attempts = 0;
    while (isTooSequential(order) && attempts < MAX_SHUFFLE_ATTEMPTS) {
      order = shuffleArray(rest);
      attempts += 1;
    }
    return [0].concat(order);
  }

  // Irregular gap timing — see the file-level comment for why this
  // replaced a fixed step. Returns beatTimes[] where beatTimes[k] is
  // when the beat at firing-order POSITION k fires (beatTimes[0] is
  // always 0 — the anchor fires immediately). Raw gap weights are
  // randomized independently per shuffle across a wide range, then
  // scaled so they sum to exactly BEAT_SPAN — irregular relative
  // spacing, exact total budget every time.
  function buildBeatTimes(count) {
    if (count <= 1) return [0];
    const rawGaps = [];
    for (let i = 0; i < count - 1; i++) {
      rawGaps.push(GAP_WEIGHT_MIN + Math.random() * (GAP_WEIGHT_MAX - GAP_WEIGHT_MIN));
    }
    const rawTotal = rawGaps.reduce((a, b) => a + b, 0);
    const scale = BEAT_SPAN / rawTotal;
    const times = [0];
    let acc = 0;
    rawGaps.forEach((g) => {
      acc += g * scale;
      times.push(acc);
    });
    return times;
  }

  function shuffle() {
    if (animating) return;
    index = (index + 1) % STATEMENTS.length;
    const nextText = STATEMENTS[index];
    const currentLine = wrap.querySelector('.desire__line');
    if (!currentLine) return;

    if (reduced) {
      wrap.replaceChildren(buildLine(nextText));
      return;
    }

    animating = true;
    const incoming = buildLine(nextText, 'desire__line--incoming');
    wrap.appendChild(incoming);

    const oldWords = currentLine.querySelectorAll('.word > span');
    const newWords = incoming.querySelectorAll('.word > span');
    gsap.set(newWords, { yPercent: 110 });

    // No wrap-height measurement/tween anymore — #desireLineWrap's
    // height is fixed in CSS (css/home.css) to fit the tallest 2-line
    // case, so the CTA below never moves between shuffles. That height
    // tween (removed here, not disabled) was the actual cause of the
    // CTA visibly shifting every shuffle, not a separate layout bug.
    const maxCount = Math.max(oldWords.length, newWords.length);
    const firingOrder = buildFiringOrder(maxCount); // fresh every shuffle — see file note
    const beatTimes = buildBeatTimes(maxCount);     // fresh, irregular gaps — see file note
    const orderPosition = new Array(maxCount);
    firingOrder.forEach((slot, pos) => { orderPosition[slot] = pos; });

    const tl = gsap.timeline({
      onComplete: () => {
        currentLine.remove();
        incoming.classList.remove('desire__line--incoming');
        animating = false;
      },
    });

    for (let i = 0; i < maxCount; i++) {
      // Both words at this slot share the same firing-order beat — still
      // coupled, per the brief — but entry starts ENTRY_OFFSET later
      // than exit (overlap fix, round 3), not at the exact same instant.
      // sine easing (softened from round 3's power2/power3) for a
      // gentler, more considered rise, per Nilesh — "err slower."
      const beat = beatTimes[orderPosition[i]];
      if (oldWords[i]) {
        tl.to(oldWords[i], { yPercent: -120, duration: RISE_DUR, ease: 'sine.in' }, beat);
      }
      if (newWords[i]) {
        tl.to(newWords[i], { yPercent: 0, duration: RISE_DUR, ease: 'sine.out' }, beat + ENTRY_OFFSET);
      }
    }
  }

  function resetTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(shuffle, AUTO_INTERVAL_MS);
  }

  shuffleBtn.addEventListener('click', () => {
    shuffle();
    resetTimer();
  });

  // First-arrival settle beat — SHORTENED + RETARGETED 2026-09-15
  // (Nilesh: captions should be shuffling by the time they enter view,
  // catching the eye during the scroll, not after it stops). Two
  // changes from the prior version:
  // (1) Arming now comes directly from the captions' OWN visibility —
  // the IntersectionObserver below, retargeted to `wrap` with
  // threshold:0 — instead of the unrelated 'ckc:heroDissolveSettled'
  // hero-scroll event. That event is still dispatched by
  // initHeroDesireTransition() (untouched, out of scope this round) but
  // no longer consumed here.
  // (2) SETTLE_MS trimmed 1100 -> 300, and armFirstShuffle()'s timeout
  // now calls shuffle() directly instead of only resetTimer() — the
  // FIRST shuffle no longer waits a full extra AUTO_INTERVAL_MS on top
  // of the settle delay. resetTimer() right after just starts the
  // RECURRING 3s cadence for every shuffle after that first one.
  // Net effect: first shuffle now lands ~300ms after the captions
  // become visible, not ~4.1s after an unrelated scroll event.
  const SETTLE_MS = 300;
  let firstArmed = false;
  let settleTimeoutId = null;

  function armFirstShuffle() {
    if (firstArmed) return;
    firstArmed = true;
    settleTimeoutId = setTimeout(() => {
      settleTimeoutId = null;
      shuffle();
      resetTimer();
    }, SETTLE_MS);
  }

  // Bug found and fixed while verifying auto-shuffle timing (2026-09-14,
  // Session 40) — not shipped silently, unchanged this round: leaving
  // the section during the settle window used to leak a background
  // timer, because the settleTimeoutId cleanup was nested inside a
  // `timer` check that isn't true yet during that window. Fix (splitting
  // the two cleanups so the settle-timeout one is unconditional on
  // leaving) still applies below.
  //
  // firstArmed still only ever gets set once (never reset back to
  // false) — only the very first arrival gets this beat, scrolling away
  // and back later just resumes normally (immediate resetTimer() below)
  // — that's the established Session 38 design intent, not revisited
  // this round.
  //
  // RETARGETED 2026-09-15: observes `wrap` (the captions themselves),
  // not `.desire` (the whole section — much taller now, with the bigger
  // jar above it) — and threshold 0, not 0.25 — so both the arming
  // (isIntersecting -> armFirstShuffle()) and the resume-on-return
  // (isIntersecting -> resetTimer()) fire the instant any part of the
  // captions is on screen, per Nilesh's explicit "as soon as they enter
  // the viewport, even partially" instruction — not once a quarter of a
  // much taller section has scrolled past.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (firstArmed) resetTimer();
        else armFirstShuffle();
      } else {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        if (settleTimeoutId) {
          clearTimeout(settleTimeoutId);
          settleTimeoutId = null;
        }
      }
    });
  }, { threshold: 0 });
  io.observe(wrap);
}

/*
  Homepage Section 3 — Understanding/Proposition, spec section 5. Full
  concept given directly by Nilesh, 2026-09-22 (the spec file itself
  still says "NOT YET DESIGNED" — see gaps.md and the big index.html
  comment above this section's markup): a scroll-scrubbed product beat.
  `.understanding` pins for a multi-viewport scroll distance; EVERY
  visible change across that whole pin — the jar video's currentTime,
  each of the five stacked copy lines' own opacity, the closing scrim —
  is computed fresh, every scroll tick, as a pure function of that one
  pin's progress (0..1). Nothing here is a discrete triggered swap; nothing
  waits for a previous tween to finish. That's what makes video motion and
  copy transitions read as one continuous timeline instead of two
  separately-timed systems that happen to overlap — and what the brief's
  "must never feel the site stopped responding" is actually asking for.

  SCRUB_SOURCES / ACTIVE_SOURCE — the ONE-LINE SWAP Nilesh asked for, to
  A/B which mock clip scrubs more smoothly, and later to drop in the real
  asset. Change ACTIVE_SOURCE's value (or add a new key) — nothing else
  in this function needs to change.

  Both current mock files were probed directly before building this (not
  assumed): try1 is 1280x720, 10.0s, 24fps/240 frames; try2 is 640x360,
  8.0s, 24fps/192 frames. Both are H.264 with exactly ONE keyframe for
  the ENTIRE clip (a normal "optimize for file size" export, not one
  built for scrubbing) — every seek mid-clip means the browser decodes
  forward from that single keyframe, which is exactly the encode shape
  that stutters on scrub, worst on mobile. Flagged in gaps.md: the FINAL
  video should be re-exported with frequent keyframes (ideally every
  1-5 frames, "all-intra"/"every frame a keyframe" if the export tool
  offers it) specifically for this use — a normal export, however good
  it looks, will not scrub as smoothly as this technique needs.
*/
function initUnderstandingScrub() {
  const section = document.getElementById('understandingSection');
  const video = document.getElementById('understandingVideo');
  const linesWrap = document.getElementById('understandingLines');
  if (!section || !video || !linesWrap) return;

  const SCRUB_SOURCES = {
    try1: 'assets/video/Scroll_Scrub_try1mp4.mp4',
    try2: 'assets/video/Scroll_scrub_try2.mp4',
  };
  const ACTIVE_SOURCE = 'try1'; // <-- ONE-LINE SWAP: 'try1' | 'try2' | a real asset path once one exists

  const lines = Array.from(linesWrap.querySelectorAll('.understanding__line'));
  // Per-state scroll weight, in the same order as the data-state markup
  // (0 Morning .. 3 Night, 4 the closing line) — editable independently;
  // "timings adjustable, not necessarily equal" per the brief. Raise a
  // single value to give that state more scroll distance/dwell time.
  const STATE_WEIGHTS = [1, 1, 1, 1, 0.8];
  const SEGMENT_VH = 90; // scroll distance (vh) per weight=1 state — raise/lower to slow/speed the WHOLE timeline uniformly
  const CROSSFADE_FRACTION = 0.3; // portion of a state's own span spent fading in/out; the rest is a flat, fully-opaque hold

  const totalWeight = STATE_WEIGHTS.reduce((a, b) => a + b, 0);
  const bounds = []; // [start, end) in overall 0..1 pin progress, one pair per state, same order as `lines`
  let acc = 0;
  STATE_WEIGHTS.forEach((w) => {
    const start = acc / totalWeight;
    acc += w;
    bounds.push([start, acc / totalWeight]);
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadVideo() {
    if (video.src) return;
    video.src = SCRUB_SOURCES[ACTIVE_SOURCE] || ACTIVE_SOURCE;
    video.load();
  }

  if (reduced) {
    // Same policy as initHeroVideo(): leave it on its first frame, don't
    // autoplay, don't scroll-tie anything. All five lines become normal,
    // stacked, fully-opaque flow via the .understanding--static class
    // (css/home.css) — fully readable with zero animation.
    section.classList.add('understanding--static');
    loadVideo();
    return;
  }

  // Lazy-load: the clip isn't fetched until the section is getting
  // close, not on page load — slower-connection requirement (brief +
  // CLAUDE.md §11). rootMargin gives it an 800px head start so it's
  // ready by the time the pin actually engages.
  const lazyIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadVideo();
        lazyIo.disconnect();
      }
    });
  }, { rootMargin: '800px 0px' });
  lazyIo.observe(section);

  let duration = 0;
  let primed = false;
  video.addEventListener('loadedmetadata', () => {
    duration = video.duration || 0;
    // Some mobile browsers (notably iOS Safari) won't seek reliably on a
    // video that has never actually played. Muted autoplay is allowed;
    // immediately pausing keeps it on frame 0 until scroll drives it.
    // Fails silently if the browser still blocks it — currentTime
    // scrubbing still works either way, just possibly less smoothly on
    // whichever browser that happens on.
    if (!primed) {
      primed = true;
      video.play().then(() => video.pause()).catch(() => {});
    }
  });

  const canFastSeek = typeof video.fastSeek === 'function';
  let lastTarget = -1;

  function updateVideo(progress) {
    if (!duration) return;
    const target = progress * duration;
    if (Math.abs(target - lastTarget) < 1 / 60) return; // skip sub-frame no-op seeks
    lastTarget = target;
    try {
      // fastSeek trades frame-accuracy for seek speed — the right trade
      // here (a continuously-scrubbed background clip, not a player
      // where the exact frame matters), and it measurably helps seek
      // latency on Safari in particular.
      if (canFastSeek) video.fastSeek(target);
      else video.currentTime = target;
    } catch (e) {
      // Seeking can throw if called before the video is seekable yet;
      // safe to ignore, the next scroll tick just retries.
    }
  }

  // Trapezoid opacity: ramps in over the first CROSSFADE_FRACTION of the
  // state's own span, holds at 1, ramps out over the last
  // CROSSFADE_FRACTION — except the very first state (no fade-in, it's
  // already the one showing at progress 0) and the very last state (no
  // fade-out, it just holds once reached, all the way to progress 1).
  // Adjacent states' ramps overlap in scroll-progress terms (one state's
  // fade-out IS the next one's fade-in window), which is what makes the
  // whole thing read as continuous crossfading rather than sequential
  // blackouts.
  function crossfadeOpacity(progress, stateBounds, isFirst, isLast) {
    const [start, end] = stateBounds;
    const span = end - start;
    if (span <= 0) return 1;
    const t = Math.max(0, Math.min(1, (progress - start) / span));
    if (progress < start) return isFirst ? 1 : 0;
    if (progress >= end) return isLast ? 1 : 0;
    const fadeIn = isFirst ? 1 : Math.min(1, t / CROSSFADE_FRACTION);
    const fadeOut = isLast ? 1 : Math.min(1, (1 - t) / CROSSFADE_FRACTION);
    return Math.min(fadeIn, fadeOut);
  }

  function updateCopy(progress) {
    const lastIndex = lines.length - 1;
    lines.forEach((el, i) => {
      const opacity = crossfadeOpacity(progress, bounds[i], i === 0, i === lastIndex);
      el.style.opacity = opacity;
      if (i === lastIndex) section.style.setProperty('--understanding-resolve', opacity);
    });
  }

  // Correct initial paint immediately (progress 0), rather than waiting
  // on ScrollTrigger's own first onUpdate — matches every other section
  // on this page rendering its real starting state straight from load.
  updateCopy(0);

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    // Function-based, not a bare 'vh' string (ScrollTrigger's shorthand
    // doesn't resolve vh units) — recomputed from the live viewport
    // height on every refresh (orientation change, URL-bar resize, font-
    // swap reflow), same pattern as initHeaderGroundTheme()'s headerBand().
    end: () => '+=' + Math.round((window.innerHeight * SEGMENT_VH * totalWeight) / 100),
    pin: true,
    scrub: true,
    onUpdate: (self) => {
      updateVideo(self.progress);
      updateCopy(self.progress);
    },
  });
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = document.getElementById('contactFormStatus');
    if (status) {
      status.textContent = 'This form is not connected to anything yet — nothing was sent.';
    }
  });
}

/*
  Trust page — full 45-ingredient formulation, spec section 10. The list
  lives in /data/ingredients.json and must not be hardcoded into markup
  (CLAUDE.md §9), so it's fetched at runtime. Order is preserved from the
  file (label-matched, not alphabetised). Collapsed to the first few by
  default with a toggle to reveal the rest (Nilesh, 2026-09-06) — the
  beyond-fold group now lives in its own container (#trustFormMore) and
  unfolds slowly via GSAP height/opacity rather than an instant display
  swap, per this page's 2026-09-15 motion brief ("unhurried, nothing to
  hide"). The ingredient count animates up once, the first time it
  scrolls into view — this page's single, sparing count-up moment (the
  brief: used once, not everywhere). Both the count-up and the unfold
  skip straight to their end state under prefers-reduced-motion. If the
  fetch fails, a visible fallback line points to the product label
  rather than leaving an empty section or an unhandled rejection.
*/
function initTrustFormulation() {
  const list = document.getElementById('trustFormList');
  if (!list) return;

  const more = document.getElementById('trustFormMore');
  const toggle = document.getElementById('trustFormToggle');
  const countEl = document.getElementById('trustFormCount');
  const errorEl = document.getElementById('trustFormError');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLLAPSED_COUNT = 8;

  function makeItem(ing) {
    const item = document.createElement('div');
    item.className = 'trust__form-item';
    const name = document.createElement('span');
    name.className = 'trust__form-name';
    name.textContent = ing.name || '';
    const bot = document.createElement('span');
    bot.className = 'trust__form-botanical';
    bot.textContent = ing.botanical || '';
    item.append(name, bot);
    return item;
  }

  function animateCount(target) {
    if (!countEl) return;
    if (reduced) {
      countEl.textContent = String(target);
      return;
    }
    const counter = { val: 0 };
    gsap.to(counter, {
      val: target,
      duration: 1.4,
      ease: 'power1.out',
      onUpdate: () => { countEl.textContent = String(Math.round(counter.val)); },
      scrollTrigger: { trigger: countEl, start: 'top 85%', once: true },
    });
  }

  function toggleMore(open) {
    if (!more) return;
    if (reduced) {
      more.style.height = open ? 'auto' : '0';
      more.style.opacity = open ? '1' : '0';
      return;
    }
    if (open) {
      const target = more.scrollHeight;
      gsap.fromTo(more,
        { height: 0, opacity: 0 },
        {
          height: target,
          opacity: 1,
          duration: 0.9,
          ease: 'power2.inOut',
          onComplete: () => { more.style.height = 'auto'; },
        }
      );
    } else {
      gsap.to(more, { height: 0, opacity: 0, duration: 0.7, ease: 'power2.inOut' });
    }
  }

  fetch('data/ingredients.json')
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      const items = (data && Array.isArray(data.ingredients)) ? data.ingredients : [];
      if (!items.length) throw new Error('empty ingredient list');

      animateCount(items.length);

      items.slice(0, COLLAPSED_COUNT).forEach((ing) => list.appendChild(makeItem(ing)));
      const rest = items.slice(COLLAPSED_COUNT);
      if (rest.length && more) {
        rest.forEach((ing) => more.appendChild(makeItem(ing)));
      }

      if (toggle && rest.length) {
        const collapsedLabel = 'Show all ' + items.length + ' ingredients';
        toggle.hidden = false;
        toggle.textContent = collapsedLabel;
        toggle.addEventListener('click', () => {
          const expanded = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!expanded));
          toggle.textContent = expanded ? collapsedLabel : 'Show fewer';
          toggleMore(!expanded);
        });
      }
    })
    .catch(() => {
      list.innerHTML = '';
      if (more) more.innerHTML = '';
      if (toggle) toggle.hidden = true;
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = 'The formulation list could not be loaded here — the full list is printed on the product label.';
      }
    });
}

/*
  Trust page — the single subtle parallax moment for this round's motion
  brief ("a whisper of dimensional depth, not spectacle"): each layer's
  background index numeral (01/02/03) drifts a small amount against the
  reading column as its layer scrolls through, scrubbed directly to
  scroll position rather than time-based. No-op on every other page
  (guarded on [data-layer] not existing) and skipped entirely under
  prefers-reduced-motion — this is a continuous scroll-linked transform,
  exactly what that setting exists to suppress.
*/
function initTrustParallax() {
  const layers = gsap.utils.toArray('[data-layer]');
  if (!layers.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  layers.forEach((layer) => {
    const index = layer.querySelector('.trust__layer-index');
    if (!index) return;
    gsap.to(index, {
      yPercent: -18,
      ease: 'none',
      scrollTrigger: { trigger: layer, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  });
}

/*
  Trust page — certificate/document cards get a slower, more deliberate
  reveal than the sitewide [data-reveal] workhorse used for everything
  else on this page: a soft unfold (scale up from a slightly collapsed
  state + fade, transform-origin: top per trust.css), staggered card by
  card, per this round's "unhurried, nothing to hide" brief. No-op on
  every other page (guarded on #trustDocCards not existing).
*/
function initTrustDocReveal() {
  const wrap = document.getElementById('trustDocCards');
  if (!wrap) return;
  const cards = wrap.querySelectorAll('.trust__doc-card');
  if (!cards.length) return;

  gsap.from(cards, {
    opacity: 0,
    scaleY: 0.92,
    duration: 1.1,
    ease: 'power2.out',
    stagger: 0.18,
    scrollTrigger: { trigger: wrap, start: 'top 85%' },
  });
}

/*
  Shop page — product hero, spec section 9. Variants (200g/500g/1kg) are
  real, confirmed SKUs but live in /data/product.json rather than hardcoded
  markup (CLAUDE.md §9/§2 — commerce shapes stay Shopify-compatible data,
  same reasoning as initTrustFormulation's ingredient fetch). No-ops on
  every other page (guarded on #shopProductForm not existing).

  Price is never rendered as a number — none exist yet and none are
  invented (Nilesh, 2026-09-06) — just a static placeholder tag next to
  the size picker, regardless of which size is selected.
*/
function initShopProduct() {
  const form = document.getElementById('shopProductForm');
  if (!form) return;

  const variantsFieldset = document.getElementById('shopVariants');
  const qtyValue = document.getElementById('shopQtyValue');
  const errorEl = document.getElementById('shopFormError');
  const addBtn = form.querySelector('.shop__add');
  let qty = 1;

  form.querySelector('[data-qty="decrease"]').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyValue.textContent = String(qty);
  });
  form.querySelector('[data-qty="increase"]').addEventListener('click', () => {
    qty += 1;
    qtyValue.textContent = String(qty);
  });

  fetch('data/product.json')
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      const variants = (data && data.product && Array.isArray(data.product.variants)) ? data.product.variants : [];
      if (!variants.length) throw new Error('no variants');

      variants.forEach((v, i) => {
        const label = document.createElement('label');
        label.className = 'shop__variant';
        label.innerHTML =
          '<input type="radio" name="variant" value="' + v.id + '" data-label="' + v.label + '" data-weight="' + v.weightGrams + '"' + (i === 0 ? ' checked' : '') + '>' +
          '<span>' + v.id + '</span>';
        variantsFieldset.appendChild(label);
      });

      addBtn.disabled = false;
    })
    .catch(() => {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = 'Sizes could not be loaded here — nothing to add to cart until this is fixed.';
      }
    });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const checked = form.querySelector('input[name="variant"]:checked');
    if (!checked || !window.CKCCart) return;
    window.CKCCart.add({ id: checked.value, label: checked.dataset.label, weightGrams: Number(checked.dataset.weight) }, qty);
    window.CKCCart.open();
    qty = 1;
    qtyValue.textContent = '1';
  });
}
