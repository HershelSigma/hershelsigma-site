// the Book a demo form in #contact: posts the visitor's details to the api, which emails the team
(() => {
  const form = document.querySelector('[data-optin]');
  if (!form) return;
  const ENDPOINT = 'https://api.hershelsigma.ai/public/demo-request';
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
    try {
      const res = await fetch(ENDPOINT, {
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
    }
  });
})();
