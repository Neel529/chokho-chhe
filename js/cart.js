/*
  Cart drawer — spec section 9. Genuinely working (open/close, add, update
  quantity, remove, running subtotal) — only checkout is stubbed, marked
  not-connected the same way the contact form's submit is (initContactForm,
  main.js).

  This is a static multi-page site, not an SPA (CLAUDE.md §2/§3) — the
  drawer markup and this script live on every page (see index/contact/
  trust/shop.html) so the header cart icon opens the same cart everywhere,
  not just on Shop. Without persistence the drawer would always render
  empty off the Shop page, which isn't "genuinely working." State lives in
  localStorage under one key, read/written by every page.

  No real prices exist yet — placeholders bind at Shopify translation
  (spec section 9). Nilesh's call (2026-09-06): the running subtotal is
  item count + total weight, both real computed values from the three
  confirmed SKU weights (data/product.json), never an invented currency
  figure.
*/

const CART_KEY = 'ckc-cart';

function cartRead() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function cartWrite(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage unavailable — cart just won't persist */ }
}

function cartFormatWeight(grams) {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return (Number.isInteger(kg) ? String(kg) : kg.toFixed(1)) + 'kg';
  }
  return grams + 'g';
}

function cartAdd(variant, qty) {
  const cart = cartRead();
  const line = cart.find((l) => l.id === variant.id);
  if (line) {
    line.qty += qty;
  } else {
    cart.push({ id: variant.id, label: variant.label, weightGrams: variant.weightGrams, qty });
  }
  cartWrite(cart);
  cartRender();
}

function cartSetQty(id, qty) {
  let cart = cartRead();
  if (qty < 1) {
    cart = cart.filter((l) => l.id !== id);
  } else {
    const line = cart.find((l) => l.id === id);
    if (line) line.qty = qty;
  }
  cartWrite(cart);
  cartRender();
}

function cartRemove(id) {
  cartWrite(cartRead().filter((l) => l.id !== id));
  cartRender();
}

function cartRender() {
  const list = document.getElementById('cartItems');
  if (!list) return; // drawer isn't on this page (shouldn't happen — it's global — but guard anyway)

  const cart = cartRead();
  const empty = document.getElementById('cartEmpty');
  const subtotal = document.getElementById('cartSubtotal');
  const checkout = document.getElementById('cartCheckout');
  const badges = document.querySelectorAll('.site-header__cart-count');
  const totalItems = cart.reduce((sum, l) => sum + l.qty, 0);

  list.innerHTML = '';
  cart.forEach((line) => {
    const li = document.createElement('li');
    li.className = 'cart-drawer__item';
    li.dataset.id = line.id;

    const info = document.createElement('div');
    info.className = 'cart-drawer__item-info';
    const name = document.createElement('span');
    name.className = 'cart-drawer__item-name';
    name.textContent = 'Amlaprash — ' + line.label;
    const price = document.createElement('span');
    price.className = 'is-placeholder cart-drawer__item-price';
    price.textContent = 'Price — TBD';
    info.append(name, price);

    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'cart-drawer__item-qty';
    qtyWrap.innerHTML =
      '<button type="button" class="cart-drawer__qty-btn" data-action="decrease" aria-label="Decrease quantity">−</button>' +
      '<span class="cart-drawer__qty-value">' + line.qty + '</span>' +
      '<button type="button" class="cart-drawer__qty-btn" data-action="increase" aria-label="Increase quantity">+</button>';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'cart-drawer__remove';
    remove.setAttribute('aria-label', 'Remove ' + line.label + ' from cart');
    remove.textContent = 'Remove';

    li.append(info, qtyWrap, remove);
    list.appendChild(li);
  });

  if (empty) empty.hidden = cart.length > 0;
  if (checkout) checkout.disabled = cart.length === 0;

  if (subtotal) {
    if (totalItems) {
      const totalWeight = cart.reduce((sum, l) => sum + l.weightGrams * l.qty, 0);
      subtotal.textContent = totalItems + ' item' + (totalItems === 1 ? '' : 's') + ' · ' + cartFormatWeight(totalWeight) + ' total — price shown once Shopify binds real prices';
    } else {
      subtotal.textContent = '';
    }
  }

  badges.forEach((el) => {
    el.textContent = String(totalItems);
    el.hidden = totalItems === 0;
  });
}

function initCart() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;

  const triggers = document.querySelectorAll('.site-header__cart');
  const scrim = document.getElementById('cartScrim');
  const closeBtn = document.getElementById('cartClose');
  const list = document.getElementById('cartItems');
  const checkout = document.getElementById('cartCheckout');
  const status = document.getElementById('cartStatus');

  function setOpen(open) {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    triggers.forEach((t) => t.setAttribute('aria-expanded', String(open)));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  triggers.forEach((t) => t.addEventListener('click', () => setOpen(true)));
  if (scrim) scrim.addEventListener('click', () => setOpen(false));
  if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
  });

  if (list) {
    list.addEventListener('click', (e) => {
      const item = e.target.closest('.cart-drawer__item');
      if (!item) return;
      const id = item.dataset.id;
      const line = cartRead().find((l) => l.id === id);
      if (e.target.matches('[data-action="increase"]') && line) {
        cartSetQty(id, line.qty + 1);
      } else if (e.target.matches('[data-action="decrease"]') && line) {
        cartSetQty(id, line.qty - 1);
      } else if (e.target.matches('.cart-drawer__remove')) {
        cartRemove(id);
      }
    });
  }

  // Same treatment as the contact form's submit (initContactForm) — real,
  // clickable button; the click itself is intercepted and a status message
  // explains checkout isn't wired up. Never silently pretends to check out.
  if (checkout) {
    checkout.addEventListener('click', () => {
      if (status) status.textContent = "Checkout isn't connected to anything yet — Shopify handles real checkout at translation.";
    });
  }

  // Keeps the header badge/drawer in sync if the cart changes in another
  // tab (localStorage's own cross-tab event) — not required by spec, but
  // "genuinely behave" shouldn't mean "goes stale the moment you have two
  // tabs open."
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) cartRender();
  });

  cartRender();

  window.CKCCart = { add: cartAdd, open: () => setOpen(true) };
}
