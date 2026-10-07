// the Book a demo form in #contact: posts the visitor's details to the api, which emails the team
(() => {
  const form = document.querySelector('[data-optin]');
  if (!form) return;
  const API = 'https://api.hershelsigma.ai/public';
  const ENDPOINT = `${API}/demo-request`;
  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;
  const done = form.querySelector('[data-optin-done]');
  const oops = form.querySelector('[data-optin-oops]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (name) => form.elements[name].value.trim();
    const body = {
      firstName: v('firstName'),
      lastName: v('lastName'),
      email: v('email'),
      page: location.pathname,
      company_website: v('company_website'),
    };
    if (v('phone')) body.phone = v('phone');

    button.disabled = true;
    button.textContent = 'Sending...';
    oops.hidden = true;
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`demo request failed: ${res.status}`);
      form.querySelectorAll('[data-optin-hide]').forEach((el) => { el.hidden = true; });
      done.hidden = false;
    } catch (err) {
      oops.hidden = false;
      button.disabled = false;
      button.textContent = label;
      return;
    }
    // booking is optional: no token or no open times leaves just the thank-you
    try {
      const { bookingToken } = await res.json();
      if (bookingToken) await offerTimes(bookingToken);
    } catch (err) {}
  });

  // the optional booking step, shown under the thank-you
  const book = form.querySelector('[data-book]');
  const pick = book.querySelector('[data-book-pick]');
  const days = book.querySelector('[data-book-days]');
  const times = book.querySelector('[data-book-times]');
  const note = book.querySelector('[data-book-note]');
  const go = book.querySelector('[data-book-go]');
  const bookOops = book.querySelector('[data-book-oops]');
  const booked = book.querySelector('[data-book-done]');
  const eastern = (opts) => new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'America/New_York' });
  const dayLabel = eastern({ weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = eastern({ hour: 'numeric', minute: '2-digit' });
  let token = null;
  let picked = null;

  const chip = (text, onPick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = text;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      onPick();
    });
    return b;
  };

  const showDay = (slots) => {
    picked = null;
    go.hidden = true;
    times.replaceChildren(...slots.map((s) => chip(timeLabel.format(new Date(s.start)), () => {
      picked = s;
      go.textContent = `Book ${s.label}`;
      go.hidden = false;
    })));
  };

  const finish = (text) => {
    pick.hidden = true;
    booked.textContent = text;
    booked.hidden = false;
  };

  async function offerTimes(bookingToken, message) {
    token = bookingToken;
    const res = await fetch(`${API}/website/demo-slots`);
    const { slots = [] } = res.ok ? await res.json() : {};
    if (!slots.length) {
      // a time just went and nothing else is open: point them at email instead
      if (!book.hidden) {
        times.replaceChildren();
        days.replaceChildren();
        go.hidden = true;
        note.hidden = true;
        bookOops.hidden = false;
      }
      return;
    }
    const byDay = new Map();
    for (const s of slots) {
      const day = dayLabel.format(new Date(s.start));
      byDay.set(day, [...(byDay.get(day) || []), s]);
    }
    days.replaceChildren(...[...byDay].map(([day, list]) => chip(day, () => showDay(list))));
    days.firstElementChild.click();
    note.textContent = message || '';
    note.hidden = !message;
    bookOops.hidden = true;
    book.hidden = false;
  }

  go.addEventListener('click', async () => {
    const slot = picked;
    go.disabled = true;
    go.textContent = 'Booking...';
    bookOops.hidden = true;
    try {
      const res = await fetch(`${API}/website/demo-book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingToken: token, start: slot.start }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok || out.error === 'already_booked') return finish(`Booked: ${out.label}`);
      if (out.error === 'slot_taken') return await offerTimes(token, 'That time just went. Pick another.');
      throw new Error(`demo booking failed: ${res.status}`);
    } catch (err) {
      bookOops.hidden = false;
      go.textContent = `Book ${slot.label}`;
    } finally {
      go.disabled = false;
    }
  });
})();
