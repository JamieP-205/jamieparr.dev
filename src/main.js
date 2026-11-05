import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';

// Only confirm success after the server has accepted the email for delivery.
const form = document.getElementById('contact-form');
if (form) {
  const status = form.querySelector('.form__status');
  const button = form.querySelector('button');
  button.disabled = false;
  let sending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    sending = true;
    button.disabled = true;
    status.classList?.remove('is-sent');
    status.textContent = 'Sending your message...';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'Your message could not be sent.');
      form.reset();
      status.textContent = 'Thanks, your message has been sent.';
      status.classList?.add('is-sent');
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error.name === 'TypeError' || error.name === 'SyntaxError'
        ? `I couldn't confirm delivery. Your message is still here; you can email ${form.dataset.email} directly.`
        : error.message;
    } finally {
      sending = false;
      button.disabled = false;
    }
  });
}
