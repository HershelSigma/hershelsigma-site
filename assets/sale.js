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

  // Monthly / Annual switch over the Pricing cards. Monthly shows the founding sale; Annual shows its
  // own deal: the regular monthly price slashed, the annual price (per seat a month) in its place.
  const plans = document.querySelector('[data-plans]');
  const mode = () => (plans && plans.dataset.billing === 'year' ? 'year' : 'month');
  let onSwitch = () => {};
  document.querySelectorAll('[data-bill-set]').forEach((b) => b.addEventListener('click', () => {
    if (!plans || plans.dataset.billing === b.dataset.billSet) return;
    plans.dataset.billing = b.dataset.billSet;
    document.querySelectorAll('[data-bill-set]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onSwitch();
  }));

  // Pricing cards. At rest (and with no script) a card shows the lower price large and the regular
  // price slashed in its corner. Here each card is set back to the regular price before it is seen,
  // then plays once when it scrolls into view, so nobody reads the lower price before the regular one.
  // Monthly and Annual each play once per card: Annual plays the first time the visitor switches to it.
  if (!('IntersectionObserver' in window)) return;
  const SCALE = 0.36;   // the corner price's size, as a share of the large one (matches .plan .reg in index.html)
  const INSET_X = 24, INSET_Y = 26;
  const cards = [...document.querySelectorAll('[data-plans] [data-price]')];
  const played = new Map(cards.map((c) => [c, new Set()]));
  const timers = new Map(cards.map((c) => [c, []]));
  const parts = (card) => {
    const amt = card.querySelector(`.amt[data-bill="${mode()}"]`);
    return { num: amt.querySelector('.num'), reg: amt.querySelector('.reg'), sale: amt.querySelector('.new') };
  };
  // back to the resting styles, stopping any animation still running
  const rest = (card) => {
    timers.get(card).forEach(clearTimeout);
    timers.set(card, []);
    card.classList.remove('anim');
    delete card.dataset.stage;
    card.querySelectorAll('.num').forEach((n) => n.style.removeProperty('--w'));
  };
  // the regular price, large, ready to play
  const prep = (card) => {
    rest(card);
    card.classList.add('anim');
    card.dataset.stage = '0';
    const { num, reg } = parts(card);
    num.style.setProperty('--w', `${reg.getBoundingClientRect().width}px`);
  };
  const play = (card) => {
    const m = mode(), { num, reg, sale } = parts(card), t = timers.get(card);
    card.dataset.stage = 'p';   // playing: still the regular price, and never started twice
    t.push(setTimeout(() => { card.dataset.stage = '1'; }, 1000));
    t.push(setTimeout(() => {
      // where the slashed regular price will rest: the card's bottom right corner
      const box = card.getBoundingClientRect(), big = reg.getBoundingClientRect();
      card.style.setProperty('--dx', `${box.right - INSET_X - big.width * SCALE - big.left}px`);
      card.style.setProperty('--dy', `${box.bottom - INSET_Y - big.height * SCALE - big.top}px`);
      num.style.setProperty('--w', `${sale.getBoundingClientRect().width}px`);
      card.dataset.stage = '2';
      played.get(card).add(m);
    }, 1600));
    // once it has landed, hand the card back to its resting styles so it reflows normally on resize
    t.push(setTimeout(() => rest(card), 2700));
  };
  const inView = (card) => {
    const r = card.getBoundingClientRect();
    return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) >= r.height * 0.6;
  };
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting && entry.target.dataset.stage === '0') play(entry.target);
  }), { threshold: 0.6 });
  // on a switch, a card that has not played this mode yet resets to the regular price; if it is
  // already in view it plays now (the observer only fires when a card moves in or out of view)
  onSwitch = () => cards.forEach((card) => {
    if (played.get(card).has(mode())) { rest(card); return; }
    prep(card);
    if (inView(card)) play(card);
  });
  cards.forEach((card) => { prep(card); io.observe(card); });
})();
