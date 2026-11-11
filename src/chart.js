// Reads out one year of the Armagh chart: the year under the pointer, or the one chosen with the arrow keys.
// The lines are drawn at build time (src/lib/chart.mjs); this only moves the cursor and dots and fills in the text.
for (const figure of document.querySelectorAll('[data-chart]')) {
  const plot = figure.querySelector('.chart__plot');
  const lines = plot.querySelector('.chart__lines');
  const cursor = plot.querySelector('.chart__cursor');
  const dots = { max: plot.querySelector('.chart__dot--max'), min: plot.querySelector('.chart__dot--min') };
  const year = figure.querySelector('.chart__year');
  const nums = { max: figure.querySelector('.chart__value--max b'), min: figure.querySelector('.chart__value--min b') };
  const series = JSON.parse(plot.dataset.series);
  const lo = Number(plot.dataset.lo), hi = Number(plot.dataset.hi);
  const last = series.length - 1;
  let index = last;

  const pct = (n) => `${n.toFixed(2)}%`;
  const place = (key, v, x) => {
    const dot = dots[key];
    dot.toggleAttribute('hidden', v === null);
    nums[key].textContent = v === null ? 'no reading' : `${v.toFixed(1)}°C`;
    if (v === null) return;
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', pct(((hi - v) / (hi - lo)) * 100));
  };
  const show = (i) => {
    index = Math.min(last, Math.max(0, i));
    const [y, max, min] = series[index];
    const x = pct((index / last) * 100);
    cursor.setAttribute('x1', x);
    cursor.setAttribute('x2', x);
    cursor.removeAttribute('hidden');
    year.textContent = y;
    place('max', max, x);
    place('min', min, x);
  };

  plot.addEventListener('pointermove', (e) => {
    const box = lines.getBoundingClientRect();
    show(Math.round(((e.clientX - box.left) / box.width) * last));
  });
  plot.addEventListener('focus', () => show(index));
  plot.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, PageDown: -10, PageUp: 10 }[e.key];
    if (step) show(index + step);
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(last);
    else return;
    e.preventDefault();
  });
}
