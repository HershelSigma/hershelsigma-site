// the founding sale on the homepage: the red bar drops in under the top of the page, anything about
// the sale opens a prompt (reserve your server, or book a demo), and each Pricing card shows the
// regular price first, slashes it, and swaps in the sale price
(() => {
  const root = document.documentElement;

  // the bar is not there on load: it drops down a moment later and stays with the sticky header
  setTimeout(() => root.classList.add('sale-down'), 1100);

  // "Reserve your server" is the Book a demo form, marked as a reservation (assets/opt-in.js reads data-intent)
  const form = document.querySelector('[data-optin]');
  const title = form && form.querySelector('[data-optin-title]');
  const sub = form && form.querySelector('[data-optin-sub]');
  const demoText = title && sub ? { title: title.textContent, sub: sub.textContent } : null;
  const setIntent = (intent) => {
    if (!form || !demoText) return;
    const reserve = intent === 'reserve';
    form.dataset.intent = reserve ? 'reserve' : 'demo';
    title.textContent = reserve ? 'Reserve your server' : demoText.title;
    sub.textContent = reserve ? 'Two quick steps, then pick a 30-minute time. Your request is marked for the founding sale.' : demoText.sub;
    form.dispatchEvent(new CustomEvent('intentchange'));
  };
  const toForm = (intent) => {
    setIntent(intent);
    const contact = document.getElementById('contact');
    if (contact) contact.scrollIntoView();
    const email = form && form.elements.email;
    if (email && !email.closest('[hidden]')) email.focus({ preventScroll: true });
  };

  const prompt = document.querySelector('[data-saleprompt]');
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-sale], [data-sale-go], [data-sale-close], [data-reserve], a[href="#contact"]');
    if (!t) {
      // a click on the dimmed page around the prompt closes it
      if (prompt && e.target === prompt) {
        const r = prompt.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) prompt.close();
      }
      return;
    }
    if (t.matches('[data-sale]')) {
      if (prompt && prompt.showModal) prompt.showModal(); else toForm('reserve');
      return;
    }
    if (t.matches('[data-sale-close]')) { prompt.close(); return; }
    if (t.matches('[data-sale-go]')) { prompt.close(); toForm(t.dataset.saleGo); return; }
    // a plan's own "Reserve your server" button goes straight to the form; any other link to the form is a demo
    setIntent(t.matches('[data-reserve]') ? 'reserve' : 'demo');
  });

  // Monthly / Annual switch over the Pricing cards. Annual has no sale (the founding sale is monthly only),
  // so the sale tags hide and the cards show the yearly price.
  const plans = document.querySelector('[data-plans]');
  const isYear = () => plans && plans.dataset.billing === 'year';
  let onMonthly = () => {};
  document.querySelectorAll('[data-bill-set]').forEach((b) => b.addEventListener('click', () => {
    if (!plans) return;
    plans.dataset.billing = b.dataset.billSet;
    document.querySelectorAll('[data-bill-set]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (!isYear()) onMonthly();
  }));

  // Pricing cards. At rest (and with no script) a card shows the sale price large and the regular
  // price slashed in its corner. Here each card is set back to the regular price before it is seen,
  // then plays once when it scrolls into view, so nobody reads the sale price before the regular one.
  if (!('IntersectionObserver' in window)) return;
  const SCALE = 0.36;   // the corner price's size, as a share of the large one (matches .plan .reg in index.html)
  const INSET_X = 24, INSET_Y = 26;
  const cards = [...document.querySelectorAll('[data-plans] [data-price]')];
  const play = (card) => {
    const num = card.querySelector('.num'), reg = card.querySelector('.reg'), sale = card.querySelector('.new');
    card.dataset.stage = 'p';   // playing: still the regular price, and never started twice
    setTimeout(() => { card.dataset.stage = '1'; }, 1000);
    setTimeout(() => {
      // where the slashed regular price will rest: the card's bottom right corner
      const box = card.getBoundingClientRect(), big = reg.getBoundingClientRect();
      card.style.setProperty('--dx', `${box.right - INSET_X - big.width * SCALE - big.left}px`);
      card.style.setProperty('--dy', `${box.bottom - INSET_Y - big.height * SCALE - big.top}px`);
      num.style.setProperty('--w', `${sale.getBoundingClientRect().width}px`);
      card.dataset.stage = '2';
    }, 1600);
    // once it has landed, hand the card back to its resting styles so it reflows normally on resize
    setTimeout(() => { card.classList.remove('anim'); delete card.dataset.stage; num.style.removeProperty('--w'); }, 2700);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    // while Annual is showing, a card's monthly price waits; it plays when the visitor switches back
    if (!entry.isIntersecting || isYear()) return;
    io.unobserve(entry.target);
    play(entry.target);
  }), { threshold: 0.6 });
  // back on Monthly: an unplayed card already in view plays now (the observer will not fire again
  // for a card that has not moved); the rest keep waiting for the observer
  onMonthly = () => cards.forEach((card) => {
    if (card.dataset.stage !== '0') return;
    const r = card.getBoundingClientRect();
    const seen = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    if (seen >= r.height * 0.6) { io.unobserve(card); play(card); }
  });
  cards.forEach((card) => {
    card.classList.add('anim');
    card.dataset.stage = '0';
    card.querySelector('.num').style.setProperty('--w', `${card.querySelector('.reg').getBoundingClientRect().width}px`);
    io.observe(card);
  });
})();
