/*
  Custom cursor swap on nav-link hover — spec section 3.
  "Normal cursor -> ChoKho Chhe emblem/brand mark" when hovering a button
  that navigates to another page. Real asset wired in 2026-09-06
  (assets/svg/CKC_EMBLEM_PARCHMENT.svg, same paths used in the page
  transition — see index.html/contact.html) — inlined the same way as the
  wordmarks, not an <img>/<use> reference. Fill is overridden to ink here
  specifically: the source asset's own fill is parchment, which would be
  invisible on this cursor's parchment background (see header.css).
*/

function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = `<svg class="custom-cursor__emblem" viewBox="0 0 865.2 876.7" xmlns="http://www.w3.org/2000/svg">
    <path d="M375.3,542.5c-87.2-27.3-142.8-109-148.2-197.9c-0.1-2.4,0.6-4.2,0-6.6c0.7-1.5,2.3-3.2,4.4-3.2l88.1,0.6
		c3.2-34.9,21.6-66.7,50.3-86c45.8-31.1,106.8-22.6,142.3,19.9c17.4,20.8,26.8,47.3,26.6,75l91.2,0.4c2.8,0,4.8,0.5,6,3.2l0.4,5.9
		C641.7,425.9,533,591.8,375.3,542.5L375.3,542.5z M448.3,387c-11,5.3-12.9,17.5-8.9,20.5c11.9,9.1,27.8,7.7,38.6-2.3
		c7.4-6.9,11.6-15.6,13.5-25.7c3.8-24.1-6.9-55.1-31.2-64.2c6.4-9.9,13.2-18.5,18.6-28.2c1.3-2.4-0.2-5.4-2.1-6.1
		c-2-0.7-3.7-0.3-5.2,1.9l-20.9,29.5c-1.5,2.1-1.9,3.8-1.1,6.3c2.1,6.6,9,1.9,19.4,12.8c12.6,13.2,17.5,32.3,12.3,49.9
		c-1.9,6.5-5.1,12-9.9,16.4C469.2,388.9,454.7,384,448.3,387L448.3,387z M426.2,405.4l5.6-50.4l8.4-75.7c0.3-3.1-1.2-4.6-3.7-5
		c-2.4-0.3-3.6,1.1-4,4l-14.5,123.9c-0.4,3,0.5,4.8,2.9,6.1C422.5,409.1,426,408.1,426.2,405.4L426.2,405.4z M415.4,379.4
		c-1.6-3.1-4.1-4-7.1-3.5c-7.3,1-13.8-2.6-17-9.4c-8.6-18.6-1.6-48.4,4.8-67.2c0.8-2.4,1.1-4.5-0.2-6.3c-1.2-1.6-2.8-2.6-5.1-2.9
		c-5.6-0.8-11-2.5-16.6-2.7c-2,0-4.2,2-4.5,3.5c-1,7,10.8,5.6,17.1,7.8c-7.6,22.9-14,53.8-1.1,75.3c9.5,15.8,27.7,10.9,28.7,9.3
		C415.1,382.2,416.1,380.7,415.4,379.4L415.4,379.4z M235.7,342.7c4.8,63,33.7,121.8,84,159.9c27.6,20.8,59.9,33.9,94.2,37.3
		c72.2,7.2,136.5-28.5,176.2-87.7c19.7-29.7,32-63.3,36.3-98.9l-55.9-0.5c-4.4,30.2-16.4,58.5-35.5,82.3
		c-12.5,15.3-27.2,28.1-44.4,37.7c-62.3,34.5-136.6,12.9-176.5-44.4c-17.6-25.2-27.3-54.8-29.1-85.3L235.7,342.7L235.7,342.7z
		 M348.6,451.5c38.2,31.5,87.9,37.8,132.3,15.5c43.9-22,72.5-66.1,79.5-114.1l-21.9-0.1c-3,35.4-21.3,67-49.9,86.6
		c-45.7,31.3-106.9,23.1-142.5-19.3c-17.9-21.2-27.4-48.2-26.8-76.6l-24.7-0.2C297.9,385.4,316,424.6,348.6,451.5L348.6,451.5z"/>
    <path d="M463.4,402.9c-5.5,2.2-11.4,1.4-16.5-1.3c1.2-2.1,3-5,5.6-5.6C457.3,394.9,462.6,398.3,463.4,402.9
		L463.4,402.9z"/>
  </svg>`;
  document.body.appendChild(cursor);

  // Bug found and fixed 2026-09-06: position + hover-scale used to be
  // split between GSAP (x/y on mousemove) and a CSS class (`.is-active`'s
  // `transform: ...scale(1)`). GSAP's x/y tween writes its own inline
  // `transform` on every mousemove, which silently overwrites the CSS
  // class's transform entirely (inline style always beats a class
  // selector) — confirmed via computed style: the cursor was permanently
  // stuck at its resting scale(0.6), the pop-to-full-size on hover never
  // actually rendered, from the very first build. Same category of bug as
  // the Entry-gate SVG transform conflict (see build-log.md) — GSAP and
  // CSS both trying to own the same `transform` property. Fix: GSAP owns
  // the whole transform now (position via xPercent/yPercent + x/y, scale
  // via its own tween); CSS only handles opacity.
  gsap.set(cursor, { xPercent: -50, yPercent: -50, scale: 0.6 });

  window.addEventListener('mousemove', (e) => {
    gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: 'power2.out' });
  });

  document.querySelectorAll('[data-nav-hover]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-active');
      gsap.to(cursor, { scale: 1, duration: 0.25, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-active');
      gsap.to(cursor, { scale: 0.6, duration: 0.25, ease: 'power2.out' });
    });
  });
}
