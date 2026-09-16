/*
  Header menu trigger + navigation overlay — spec sections 2 & 6.
*/

function initHeader() {
  const trigger = document.getElementById('menuTrigger');
  const overlay = document.getElementById('menuOverlay');
  if (!trigger || !overlay) return;

  // Bug fixed 2026-09-06: this used to be the only place `.is-open` was
  // toggled for the icon, and it landed on `trigger` (the <button>) — but
  // header.css's dice-5 rules target `.menu-trigger` (the <svg> one level
  // in), so the icon never actually animated. Toggle it on the real
  // target instead. See header.css for the full note.
  const triggerIcon = trigger.querySelector('.menu-trigger');
  const navItems = overlay.querySelectorAll('.menu-overlay__nav li');
  const divider = overlay.querySelector('.menu-overlay__divider');
  const meta = overlay.querySelector('.menu-overlay__meta');

  let open = false;
  let tl = null;

  // Menu open/close motion — spec section 6, Menu gate (2026-09-06).
  // Nilesh: staggered nav reveal, not a simple simultaneous fade.
  function animateOverlay(opening) {
    if (tl) tl.kill();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      overlay.style.visibility = opening ? 'visible' : 'hidden';
      overlay.style.pointerEvents = opening ? 'auto' : 'none';
      gsap.set(overlay, { opacity: opening ? 1 : 0 });
      gsap.set(navItems, { opacity: 1, y: 0 });
      gsap.set([divider, meta], { opacity: 1 });
      return;
    }

    if (opening) {
      // Set the "from" state via GSAP, not a resting CSS transform — a
      // static CSS transform here is exactly what caused the Entry-gate
      // SVG transform-origin bug (see build-log.md); not repeating it.
      gsap.set(navItems, { opacity: 0, y: 24 });
      gsap.set([divider, meta], { opacity: 0 });
      overlay.style.visibility = 'visible';
      overlay.style.pointerEvents = 'auto';
      tl = gsap.timeline();
      tl.to(overlay, { opacity: 1, duration: 0.35, ease: 'power2.out' })
        .to(navItems, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.07 }, '-=0.15')
        .to([divider, meta], { opacity: 1, duration: 0.4, ease: 'power2.out' }, '-=0.25');
    } else {
      // Close is a quick simple fade, no reverse-stagger — spec only asks
      // for "fades in"; a slow reverse cascade on close would just add
      // friction to getting back to the page.
      tl = gsap.timeline({
        onComplete: () => {
          overlay.style.visibility = 'hidden';
          overlay.style.pointerEvents = 'none';
        },
      });
      tl.to(overlay, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    }
  }

  function setOpen(next) {
    open = next;
    if (triggerIcon) triggerIcon.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    overlay.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    // Menu overlay's own background is ink; header renders above it
    // (z-index) so it must force parchment while open, regardless of
    // whatever section theme was active underneath — see header.css.
    document.documentElement.classList.toggle('menu-is-open', open);
    animateOverlay(open);
  }

  trigger.addEventListener('click', () => setOpen(!open));

  overlay.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
  });
}

/*
  Header ground-colour switching — spec section 2, Header gate (2026-09-05).
  Replaces the removed mix-blend-mode trick with real, explicit colours:
  each major section declares its own ground via `data-header-theme="dark"`
  or `"light"` on itself, and whichever one currently sits behind the fixed
  header band decides `html.header-on-light` (see header.css for the actual
  colour values and the menu-open override, which takes precedence over
  this). Uses ScrollTrigger (already loaded globally) rather than a second
  scroll-observation mechanism.
*/
function initHeaderGroundTheme() {
  const header = document.querySelector('.site-header');
  const sections = gsap.utils.toArray('[data-header-theme]');
  if (!header || !sections.length) return;

  function headerBand() {
    // A point roughly mid-way down the header band, in viewport px.
    return header.getBoundingClientRect().height / 2;
  }

  function setGroundTheme(theme) {
    document.documentElement.classList.toggle('header-on-light', theme === 'light');
  }

  // Initial state, before any scroll/ScrollTrigger event fires: whichever
  // themed section currently spans the header band.
  const band = headerBand();
  const initial = sections.find((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= band && r.bottom >= band;
  });
  if (initial) setGroundTheme(initial.dataset.headerTheme);

  sections.forEach((el) => {
    const theme = el.dataset.headerTheme;
    ScrollTrigger.create({
      trigger: el,
      start: () => 'top top+=' + headerBand(),
      end: () => 'bottom top+=' + headerBand(),
      onEnter: () => setGroundTheme(theme),
      onEnterBack: () => setGroundTheme(theme),
    });
  });
}
