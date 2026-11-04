import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';

// Contact form: posts to /api/contact once email is wired up (guide chapter 08).
// Until then, or if that fails, it opens the visitor's email app with the message filled in.
const form = document.getElementById('contact-form');
if (form) {
  const status = form.querySelector('.form__status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector('button');
    button.disabled = true;
    status.textContent = 'Sending…';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.textContent = 'Thanks, your message was sent. I’ll reply soon.';
    } catch {
      const subject = encodeURIComponent(`Message from ${data.name}`);
      const body = encodeURIComponent(`${data.message}\n\n${data.name} (${data.email})`);
      window.location.href = `mailto:${form.dataset.email}?subject=${subject}&body=${body}`;
      status.textContent = 'Your email app should open with the message ready to send.';
    } finally {
      button.disabled = false;
    }
  });
}
