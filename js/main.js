/*
  Init order matters: incoming page-transition cover must be visible
  before entry-skip logic runs (both are already synchronously handled
  by inline <head> scripts per-page — see index.html/contact.html), then
  GSAP-driven sequences take over.
*/

gsap.registerPlugin(ScrollTrigger);

// Dev-only markers (2026-10-06): the hero's video-fallback label and
// Section 2's "Mock scrub clip" badge are internal notes, hidden on the
// public site by css/home.css unless <html> carries .is-local-dev — set
// here only when running locally (localhost / 127.0.0.1 / file://).
if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:') {
  document.documentElement.classList.add('is-local-dev');
}

document.addEventListener('DOMContentLoaded', () => {
  initEntry();
  initHeader();
  initHeaderGroundTheme();
  initCursor();
  initPageTransitionOutgoing();
  initPageTransitionIncoming();
  initScrollReveals();
  initHeroVideo();
  // STALE ORDERING NOTE REMOVED 2026-09-23: this used to say
  // initDesireBeat() must run first because it listened for
  // initHeroDesireTransition()'s 'ckc:heroDissolveSettled' event to
  // start Section 2's first shuffle. That listener was removed when
  // Section 2 became scroll-driven (2026-09-23 rework, see build-log.md
  // Session 49) — initDesireBeat() no longer consumes that event at
  // all, so no ordering dependency remains between these two calls.
  // FLAGGED, not cleaned up here (out of scope for this round):
  // initHeroDesireTransition() still DISPATCHES 'ckc:heroDissolveSettled'
  // (see that function below) with no remaining consumer anywhere in the
  // codebase — dead code, worth removing in a future round.
  initDesireBeat();
  initHeroDesireTransition();
  initContactForm();
  initTrustFormulation();
  initTrustParallax();
  initTrustDocReveal();
  initCart();
  initShopProduct();

  // Self-hosted fonts use font-display: swap (variables.css), so fallback
  // fonts render first and metric-swap in — that reflows heights (headings,
  // form fields, footer stack), which can leave every ScrollTrigger start/
  // end position (data-reveal elements, header ground-theme switching)
  // computed against the pre-swap layout. Re-measure once real fonts land.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());
});

function initScrollReveals() {
  // Category-paradox headline reveal REMOVED 2026-09-23, per Nilesh's
  // direct instruction — `.paradox` itself (dead-concept content, spec
  // section 4 calls it explicitly dead) is removed from index.html/
  // home.css this same round; see build-log.md Session 50. This
  // function's generic [data-reveal] loop below is untouched — it's
  // shared by other real sections sitewide, not paradox-specific.

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

  // Guard stays even now that a (provisional) <source> exists — still
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
  // RETARGETED 2026-09-23: was `.desire__jar-media` (a small still-image
  // wrapper), now `.desire__media` (the full-bleed video wrapper) — same
  // resolve-into-focus behaviour, new element, since Section 2's static
  // jar was replaced by a scroll-scrubbed video this round (see
  // css/home.css and initDesireBeat() below).
  const jarMedia = document.querySelector('.desire__media');
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
  Desire beat — homepage section 2. REWORKED 2026-09-23 (Nilesh's direct
  brief): the static centred jar-image composition is gone — Section 2 is
  now a full-bleed scroll-scrubbed video (same mechanism the now-removed
  Section 3 prototype, initUnderstandingScrub(), proved out — see build-
  log.md Sessions 48/50 — applied here as the section's actual ground),
  with the 5 existing Hinglish statements' rising-mask "reel" transition
  now driven by scroll position instead of a 3s auto-timer/manual click.

  WHAT CARRIES OVER UNCHANGED from the pre-rework version: the rising-
  mask reel mechanic itself (buildLine/appendWordContent, the per-word
  yPercent choreography), the scramble ORDER system (buildFiringOrder/
  isTooSequential), the irregular per-beat timing (buildBeatTimes), the
  Elizeth broken-glyph fallback, and RISE_DUR/ENTRY_OFFSET's easing. None
  of that motion language changes — only WHAT TRIGGERS one transition to
  play, and what decides which statement is next.

  WHAT'S NEW this round:
  1. `.desire` pins (GSAP ScrollTrigger, same portable pin:true+scrub:true
     pattern the now-removed Section 3 prototype used — native browser
     scroll via transform, not a wheel/touch-intercepting hijack) for a multi-
     viewport scroll distance, split into 5 equal zones (one per
     statement, STATEMENTS.length zones).
  2. The video's currentTime is a direct linear function of the pin's
     overall progress (0..1) — continuous, every scroll tick.
  3. The statement transition is a DISCRETE trigger: every scroll tick,
     the current zone index is computed from that same progress; the
     moment it differs from the currently-displayed statement, the exact
     same reel-transition tween plays, targeting the new zone's
     statement — "retriggered by scroll instead of a timer," not a
     continuously-scrubbed word interpolation (a taste call made
     explicitly this round — see gaps.md for why: the irregular per-word
     timing model isn't built for continuous scrubbing, and this keeps
     the section on the same proven pattern the removed Section 3
     prototype used). Works scrolling forward OR backward — same trigger check runs either way,
     it only cares whether the target zone differs from what's showing.
  4. The manual shuffle button (dice icon) is removed — see index.html's
     comment on this section for why.

  VIDEO SOURCE — DESIRE_SCRUB_SOURCES / DESIRE_ACTIVE_SOURCE below is the
  ONE-LINE SWAP Nilesh asked for (spec-discovery experiment, item 4 of
  this round's brief): the original mock clip plus 3 ffmpeg-re-encoded
  variants, built specifically to A/B scrub smoothness on phone and
  desktop. Exact specs of each (probed/measured directly, not assumed):

    original       assets/video/Scroll_scrub_try2.mp4
                    1280x720, 8.0s, 24fps/192 frames, H.264, 3 keyframes
                    total for the whole clip, 2.78MB (~2.8Mbps).
                    NOTE: this is DIFFERENT from what an earlier session's
                    comment (the now-removed Section 3 prototype,
                    initUnderstandingScrub()) recorded for this same filename (640x360, single keyframe) —
                    the file on disk was replaced/re-exported by Nilesh
                    between sessions (confirmed: current mtime is newer
                    than that comment). These specs are freshly re-probed
                    this round, not copied from the stale comment.

    allintra720     assets/video/try2_allintra_720.mp4
                    1280x720 (native res, untouched), every-frame-keyframe
                    (ffmpeg -g 1 -keyint_min 1 -sc_threshold 0, CRF 20),
                    6.08MB (~6.1Mbps). The "best possible scrub" variant —
                    largest file, should stutter least.

    kf5_720         assets/video/try2_kf5_720.mp4
                    1280x720, keyframe every 5 frames (-g 5), CRF 20,
                    3.08MB (~3.1Mbps). Middle ground — much better
                    keyframe density than the original's 3-for-the-whole-
                    clip, roughly half allintra720's file size.

    allintra360     assets/video/try2_allintra_360.mp4
                    640x360 (downscaled), every-frame-keyframe, CRF 20,
                    2.11MB (~2.1Mbps). Tests whether a smaller frame
                    (less to decode per seek) matters as much as keyframe
                    density for scrub smoothness, particularly on phone.

  Flip DESIRE_ACTIVE_SOURCE's value to switch live — nothing else in this
  function needs to change. Whichever one feels smooth on real devices is
  the spec to brief the FINAL footage's export at (resolution + keyframe
  interval), not necessarily any of these four exactly.
*/
function initDesireBeat() {
  const section = document.getElementById('desireSection');
  const video = document.getElementById('desireVideo');
  const wrap = document.getElementById('desireLineWrap');
  if (!section || !video || !wrap) return;

  const DESIRE_SCRUB_SOURCES = {
    original: 'assets/video/Scroll_scrub_try2.mp4',
    allintra720: 'assets/video/try2_allintra_720.mp4',
    kf5_720: 'assets/video/try2_kf5_720.mp4',
    allintra360: 'assets/video/try2_allintra_360.mp4',
  };
  const DESIRE_ACTIVE_SOURCE = 'allintra720'; // <-- ONE-LINE SWAP: 'original' | 'allintra720' | 'kf5_720' | 'allintra360' | a real asset path once one exists

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

  // transitionTo() — the exact same reel tween shuffle() used to build,
  // now taking an explicit target index instead of always "next" — the
  // scroll-driven trigger below decides which statement is next, this
  // just plays the same rising-mask transition to reach it. Unchanged:
  // firing-order scramble, irregular beat timing, ENTRY_OFFSET, RISE_DUR,
  // easing.
  function transitionTo(nextIndex) {
    if (animating || nextIndex === index) return;
    index = nextIndex;
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

    const maxCount = Math.max(oldWords.length, newWords.length);
    const firingOrder = buildFiringOrder(maxCount); // fresh every transition
    const beatTimes = buildBeatTimes(maxCount);     // fresh, irregular gaps
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
      const beat = beatTimes[orderPosition[i]];
      if (oldWords[i]) {
        tl.to(oldWords[i], { yPercent: -120, duration: RISE_DUR, ease: 'sine.in' }, beat);
      }
      if (newWords[i]) {
        tl.to(newWords[i], { yPercent: 0, duration: RISE_DUR, ease: 'sine.out' }, beat + ENTRY_OFFSET);
      }
    }
  }

  if (reduced) {
    // Same policy as initHeroVideo(): no pin, no
    // scrub, nothing scroll-tied. Section unpins to normal flow height
    // (.desire--static, css/home.css); video stays on its first loaded
    // frame ("shows a static frame," per the brief) — no autoplay, no
    // currentTime writes. Only the FIRST statement is ever shown, fully
    // readable, no reel animation ever plays.
    section.classList.add('desire--static');
    video.src = DESIRE_SCRUB_SOURCES[DESIRE_ACTIVE_SOURCE] || DESIRE_ACTIVE_SOURCE;
    return;
  }

  // Eager small-metadata load: unlike the removed Section 3 prototype
  // (deliberately lazy — it was deep in the scroll), Desire is the second section on the page,
  // and its opacity/blur resolve tween (initHeroDesireTransition(),
  // above in this file) starts firing while the visitor is still
  // scrolling THROUGH the hero, i.e. before Desire's own lazy-load
  // IntersectionObserver would realistically have fired. Setting src
  // directly here, with preload="metadata" in the markup (not "auto"),
  // keeps the initial page load light while avoiding that race.
  video.src = DESIRE_SCRUB_SOURCES[DESIRE_ACTIVE_SOURCE] || DESIRE_ACTIVE_SOURCE;
  video.load();

  let duration = 0;
  let primed = false;
  video.addEventListener('loadedmetadata', () => {
    duration = video.duration || 0;
    // Same iOS Safari seek-priming the removed Section 3 prototype used —
    // a video that's never played won't reliably seek on some mobile browsers.
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
    if (Math.abs(target - lastTarget) < 1 / 60) return;
    lastTarget = target;
    try {
      if (canFastSeek) video.fastSeek(target);
      else video.currentTime = target;
    } catch (e) {
      // Safe to ignore — not yet seekable, next scroll tick retries.
    }
  }

  // Copy zone: 5 equal zones across the pin's 0..1 progress, one per
  // statement — deliberately uniform (unlike the removed Section 3
  // prototype's weighted STATE_WEIGHTS), since the brief here doesn't call for differential
  // dwell time per statement. currentZone() finds which zone a given
  // progress falls in; the ScrollTrigger below only calls transitionTo()
  // when that zone actually CHANGES from what's currently shown, which
  // is what makes this a discrete, threshold-triggered swap rather than
  // a continuous scrub, even though it's read from a continuous value.
  const zoneCount = STATEMENTS.length;
  function currentZone(progress) {
    return Math.min(zoneCount - 1, Math.floor(progress * zoneCount));
  }

  // SEGMENT_VH: scroll distance (vh) per statement zone — raise/lower to
  // slow/speed the whole pin uniformly. Same tunable-constant pattern the
  // removed Section 3 prototype's SEGMENT_VH used; not a spec-frozen value, adjust freely.
  const SEGMENT_VH = 85;

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + Math.round((window.innerHeight * SEGMENT_VH * zoneCount) / 100),
    pin: true,
    scrub: true,
    onUpdate: (self) => {
      updateVideo(self.progress);
      const zone = currentZone(self.progress);
      if (zone !== index) transitionTo(zone);
    },
  });
}

// Homepage Section 3 ("Understanding/Proposition" — initUnderstandingScrub())
// REMOVED 2026-09-23, per Nilesh's direct instruction: its concept
// merged into the upgraded initDesireBeat() above (full-bleed
// scroll-scrubbed video + the same 5 statements, now scroll-synced) —
// see build-log.md Session 50 for the removal and Session 48 for the
// original build. Clean removal, not disabled: the function, its
// ScrollTrigger, and its DOM hooks are all gone, not dormant.

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
