/* CHEI — small, dependency-free interactions.
   Every feature is optional: if JS fails, the page still works (in English) and reads well. */
(function () {
  'use strict';

  const root = document.documentElement;

  /* Anti-clickjacking: never run inside another site's frame.
     (The frame-ancestors header in _headers does this at server level where the host supports it;
     this covers hosts like GitHub Pages that can't send headers.) */
  if (window.top !== window.self) {
    root.hidden = true;
    try { window.top.location.replace(window.location.href); } catch (e) { /* cross-origin: stay hidden */ }
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Contact used by the cart to send orders */
  const ORDER_PHONE = '258842273769';          // WhatsApp, international format without "+"
  const ORDER_EMAIL = 'chei.purse@gmail.com';

  /* Safe localStorage (private mode / blocked storage must never break the page) */
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
  };

  /* =========================================================
     Language (EN / PT)
     ========================================================= */
  const I18N = window.CHEI_I18N || { pt: {}, messages: {} };
  const LANGS = { en: 'en', pt: 'pt-MZ' };
  let lang = 'en';

  // English originals are read from the HTML once, so they never need to be duplicated in JS.
  const textNodes = Array.from(document.querySelectorAll('[data-i18n]')).map((el) => ({
    el,
    key: el.dataset.i18n,
    en: el.textContent
  }));

  const attrNodes = [];
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) attrNodes.push({ el, attr, key, en: el.getAttribute(attr) || '' });
    });
  });

  // Runtime message, with {placeholders} filled in
  function t(name, vars) {
    const messages = I18N.messages || {};
    let msg = (messages[lang] && messages[lang][name]) || (messages.en && messages.en[name]) || '';
    Object.keys(vars || {}).forEach((k) => { msg = msg.replace('{' + k + '}', vars[k]); });
    return msg;
  }

  function applyLanguage(next) {
    lang = LANGS[next] ? next : 'en';
    const dict = lang === 'en' ? {} : (I18N[lang] || {});

    textNodes.forEach(({ el, key, en }) => { el.textContent = dict[key] || en; });
    attrNodes.forEach(({ el, attr, key, en }) => { el.setAttribute(attr, dict[key] || en); });

    root.lang = LANGS[lang];
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });

    // Refresh everything that is built from translated pieces
    updateFavLabels();
    renderCart();
    refreshNewsletterStatus();

    store.set('chei-lang', lang);
  }

  function initialLanguage() {
    const saved = store.get('chei-lang');
    if (saved && LANGS[saved]) return saved;
    return (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
  }

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
  });

  /* =========================================================
     Header: solid on scroll, hides when scrolling down
     ========================================================= */
  const header = document.querySelector('[data-header]');
  let lastY = window.scrollY;
  let ticking = false;

  function updateHeader() {
    const y = window.scrollY;
    const menuOpen = root.classList.contains('menu-open');
    header.classList.toggle('is-scrolled', y > 24);
    header.classList.toggle('is-hidden', !menuOpen && y > 400 && y > lastY + 4);
    if (Math.abs(y - lastY) > 4) lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });
  updateHeader();

  // Show the header whenever keyboard focus moves into it
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* Keep Tab focus inside an open panel */
  function trapFocus(e, container) {
    const items = Array.from(container.querySelectorAll('a[href], button:not([disabled]), input'))
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* =========================================================
     Mobile menu
     ========================================================= */
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');

  function openMenu() {
    menu.hidden = false;
    root.classList.add('menu-open');
    document.body.classList.add('is-locked');
    toggle.setAttribute('aria-expanded', 'true');
    header.classList.remove('is-hidden');
    requestAnimationFrame(() => menu.classList.add('is-open'));
    const first = menu.querySelector('a');
    if (first) first.focus();
  }

  function closeMenu(returnFocus) {
    root.classList.remove('menu-open');
    document.body.classList.remove('is-locked');
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    window.setTimeout(() => { menu.hidden = true; }, reduceMotion ? 0 : 450);
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    toggle.getAttribute('aria-expanded') === 'true' ? closeMenu(false) : openMenu();
  });

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu(false);
  });

  // Close the menu if the viewport grows to desktop size
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
    if (e.matches && root.classList.contains('menu-open')) closeMenu(false);
  });

  /* =========================================================
     Reveal on scroll
     ========================================================= */
  if ('IntersectionObserver' in window && !reduceMotion) {
    root.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  /* =========================================================
     Favourites (heart) — front-end only
     ========================================================= */
  const favButtons = document.querySelectorAll('[data-fav]');

  function updateFavLabels() {
    favButtons.forEach((btn) => btn.setAttribute('aria-label', t('save', { item: btn.dataset.name })));
  }

  favButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    });
  });

  /* =========================================================
     Cart
     Items: [{ name, img, qty }] — saved in this browser.
     Checkout = a pre-filled WhatsApp message (or email) to CHEI.
     ========================================================= */
  const cartEl = document.querySelector('[data-cart]');
  const cartList = cartEl.querySelector('[data-cart-items]');
  const cartEmpty = cartEl.querySelector('[data-cart-empty]');
  const cartFoot = cartEl.querySelector('[data-cart-foot]');
  const cartCount = cartEl.querySelector('[data-cart-count]');
  const cartSubtotal = cartEl.querySelector('[data-cart-subtotal]');
  const whatsappLink = cartEl.querySelector('[data-cart-whatsapp]');
  const emailLink = cartEl.querySelector('[data-cart-email]');
  const bagButton = document.querySelector('[data-bag]');
  const bagCount = document.querySelector('[data-bag-count]');
  let lastFocus = null;

  // Prices come from the product cards in the HTML (data-price, in meticais) — one source of truth.
  const prices = {};
  document.querySelectorAll('.product[data-price]').forEach((card) => {
    const name = card.querySelector('[data-add]').dataset.add;
    prices[name] = Number(card.dataset.price) || 0;
  });

  // 4500 → "4 500 MT" (Mozambican format, non-breaking spaces)
  function formatPrice(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' MT';
  }

  let cart = [];
  try {
    const saved = JSON.parse(store.get('chei-cart') || '[]');
    if (Array.isArray(saved)) {
      cart = saved.filter((i) => i && typeof i.name === 'string' && i.name in prices && Number.isInteger(i.qty) && i.qty > 0)
        .map((i) => ({
          name: i.name.slice(0, 60),
          img: /^assets\/img\/[\w.-]+$/.test(i.img) ? i.img : '',   // only our own images
          qty: Math.min(i.qty, 20)
        }));
    }
  } catch (e) { cart = []; }

  const totalQty = () => cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = () => cart.reduce((sum, i) => sum + prices[i.name] * i.qty, 0);

  function saveCart() {
    store.set('chei-cart', JSON.stringify(cart));
  }

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function orderMessage() {
    const lines = cart.map((i) => '- ' + i.name + ' × ' + i.qty + ' — ' + formatPrice(prices[i.name] * i.qty));
    return t('orderIntro') + '\n' + lines.join('\n') +
      '\n' + t('total') + ': ' + formatPrice(totalPrice()) +
      '\n\n' + t('orderOutro');
  }

  function renderCart() {
    const n = totalQty();

    // Header bag icon
    bagCount.textContent = String(n);
    bagButton.classList.toggle('has-items', n > 0);
    bagButton.setAttribute('aria-label', n === 1 ? t('bagLabelOne') : t('bagLabel', { n }));

    cartCount.textContent = n ? '(' + n + ')' : '';
    cartSubtotal.textContent = formatPrice(totalPrice());
    cartEmpty.hidden = n > 0;
    cartFoot.hidden = n === 0;

    // Items (built with DOM methods — no innerHTML)
    cartList.replaceChildren(...cart.map((item, index) => {
      const li = el('li', 'cart-item');

      const img = el('img', 'cart-item__img');
      img.src = item.img;
      img.alt = '';
      img.width = 88;
      img.height = 110;

      const info = el('div');
      info.append(el('p', 'cart-item__name', item.name), el('p', 'cart-item__price', formatPrice(prices[item.name] * item.qty)));

      const qty = el('div', 'qty');
      qty.setAttribute('role', 'group');
      qty.setAttribute('aria-label', t('qty'));
      const minus = el('button', '', '−');
      minus.type = 'button';
      minus.disabled = item.qty <= 1;
      minus.setAttribute('aria-label', t('decrease', { item: item.name }));
      minus.dataset.cartAction = 'dec';
      minus.dataset.index = String(index);
      const value = el('span', 'qty__value', String(item.qty));
      value.setAttribute('aria-live', 'polite');
      const plus = el('button', '', '+');
      plus.type = 'button';
      plus.disabled = item.qty >= 20;
      plus.setAttribute('aria-label', t('increase', { item: item.name }));
      plus.dataset.cartAction = 'inc';
      plus.dataset.index = String(index);
      qty.append(minus, value, plus);
      info.append(qty);

      const remove = el('button', 'cart-item__remove', t('remove'));
      remove.type = 'button';
      remove.setAttribute('aria-label', t('removeLabel', { item: item.name }));
      remove.dataset.cartAction = 'remove';
      remove.dataset.index = String(index);

      li.append(img, info, remove);
      return li;
    }));

    // Checkout links with the order already written
    const message = orderMessage();
    whatsappLink.href = 'https://wa.me/' + ORDER_PHONE + '?text=' + encodeURIComponent(message);
    emailLink.href = 'mailto:' + ORDER_EMAIL +
      '?subject=' + encodeURIComponent(t('orderSubject')) +
      '&body=' + encodeURIComponent(message);
  }

  function openCart() {
    lastFocus = document.activeElement;
    cartEl.hidden = false;
    document.body.classList.add('is-locked');
    bagButton.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => cartEl.classList.add('is-open'));
    cartEl.querySelector('.cart__close').focus();
  }

  function closeCart() {
    cartEl.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    bagButton.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => { cartEl.hidden = true; }, reduceMotion ? 0 : 500);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  bagButton.addEventListener('click', openCart);

  cartEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-close]')) { closeCart(); return; }

    const action = e.target.closest('[data-cart-action]');
    if (!action) return;
    const item = cart[Number(action.dataset.index)];
    if (!item) return;

    if (action.dataset.cartAction === 'inc') item.qty = Math.min(item.qty + 1, 20);
    if (action.dataset.cartAction === 'dec') item.qty = Math.max(item.qty - 1, 1);
    if (action.dataset.cartAction === 'remove') cart.splice(cart.indexOf(item), 1);

    saveCart();
    renderCart();
    // Keep keyboard focus somewhere sensible after re-rendering
    const same = cartList.querySelector('[data-cart-action="' + action.dataset.cartAction + '"][data-index="' + action.dataset.index + '"]');
    (same && !same.disabled ? same : cartEl.querySelector('.cart__close')).focus();
  });

  document.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.add;
      const img = button.closest('.product').querySelector('img').getAttribute('src');
      const existing = cart.find((i) => i.name === name);
      if (existing) existing.qty = Math.min(existing.qty + 1, 20);
      else cart.push({ name, img, qty: 1 });
      saveCart();
      renderCart();
      openCart();
    });
  });

  /* Keyboard: Esc closes, Tab stays inside whichever panel is open */
  document.addEventListener('keydown', (e) => {
    const cartOpen = !cartEl.hidden;
    const menuOpen = root.classList.contains('menu-open');
    if (!cartOpen && !menuOpen) return;

    if (e.key === 'Escape') {
      if (cartOpen) closeCart();
      else closeMenu(true);
    }
    if (e.key === 'Tab') {
      if (cartOpen) trapFocus(e, cartEl);
      else trapFocus(e, { querySelectorAll: (sel) => [toggle, ...menu.querySelectorAll(sel)] });
    }
  });

  /* =========================================================
     Newsletter
     ========================================================= */
  const form = document.querySelector('[data-newsletter]');
  let statusKey = '';
  let statusIsError = false;

  function setStatus(key, isError) {
    if (!form) return;
    const input = form.querySelector('input[type="email"]');
    const status = form.querySelector('.newsletter__status');
    statusKey = key;
    statusIsError = isError;
    status.textContent = key ? t(key) : '';
    status.classList.toggle('is-error', isError);
    form.classList.toggle('is-invalid', isError);
    input.setAttribute('aria-invalid', isError ? 'true' : 'false');
  }

  function refreshNewsletterStatus() {
    if (statusKey) setStatus(statusKey, statusIsError);
  }

  if (form) {
    const input = form.querySelector('input[type="email"]');
    const honeypot = form.querySelector('input[name="company"]');
    const submit = form.querySelector('button[type="submit"]');
    // Conservative email check (letters, digits and . _ % + - only; real domain with a TLD)
    const emailPattern = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;

    // Sanitize: strip control characters and all whitespace, cap the length
    const cleanEmail = (value) => String(value).replace(/[\u0000-\u001F\u007F\s]+/g, '').slice(0, 254);

    input.addEventListener('input', () => {
      if (form.classList.contains('is-invalid')) setStatus('', false);
    });

    form.addEventListener('submit', (e) => {
      const email = cleanEmail(input.value);
      input.value = email;

      // No action configured yet: handle entirely in the browser.
      if (!form.getAttribute('action')) e.preventDefault();

      if (honeypot.value) return; // silently ignore bots

      if (!emailPattern.test(email)) {
        e.preventDefault();
        setStatus('emailInvalid', true);
        input.focus();
        return;
      }

      if (!form.getAttribute('action')) {
        submit.disabled = true;
        setStatus('subscribed', false);
        form.reset();
        window.setTimeout(() => { submit.disabled = false; }, 4000);
      }
    });
  }

  /* ---------- Footer year ---------- */
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Start in the visitor's language (also renders the cart) ---------- */
  applyLanguage(initialLanguage());
})();
