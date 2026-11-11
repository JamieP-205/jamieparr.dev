// Line chart of the Armagh annual figures, drawn at build time as plain SVG.
// A year without a value breaks the line: the analysis keeps missing readings separate from zero, and so does the chart.

export function parseAnnual(csv) {
  const [head, ...lines] = csv.trim().split(/\r?\n/);
  const cols = head.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const row = Object.fromEntries(cols.map((c, i) => [c, cells[i] === '' ? null : Number(cells[i])]));
    return { year: row.year, max: row.tmax, min: row.tmin };
  });
}

// Consecutive years with a value become one polyline; a gap starts a new one.
export function segments(rows, key) {
  const out = [];
  let run = [];
  for (const r of rows) {
    if (r[key] === null) { if (run.length) out.push(run); run = []; }
    else run.push(r);
  }
  if (run.length) out.push(run);
  return out;
}

// Runs of years with no temperature reading at all, as [firstYear, lastYear].
export function gaps(rows) {
  const out = [];
  for (const r of rows) {
    if (r.max !== null || r.min !== null) continue;
    const last = out.at(-1);
    if (last && last[1] === r.year - 1) last[1] = r.year;
    else out.push([r.year, r.year]);
  }
  return out;
}

const W = 1000, H = 400;
const deg = (v) => (v === null ? 'no reading' : `${v.toFixed(1)}°C`);

export function annualChart(rows, { caption = '' } = {}) {
  const [y0, y1] = [rows[0].year, rows.at(-1).year];
  const values = rows.flatMap((r) => [r.max, r.min]).filter((v) => v !== null);
  const lo = Math.floor(Math.min(...values));
  let hi = Math.ceil(Math.max(...values));
  if ((hi - lo) % 2) hi += 1; // 2° ticks land exactly on the top and bottom
  const x = (year) => ((year - y0) / (y1 - y0)) * W;
  const y = (v) => (1 - (v - lo) / (hi - lo)) * H;
  const pts = (run, key) => run.map((r) => `${x(r.year).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ');
  const line = (key) => segments(rows, key).map((run) => `<polyline class="chart__line chart__line--${key}" points="${pts(run, key)}"/>`).join('');

  const ticksY = [];
  for (let v = hi; v >= lo; v -= 2) ticksY.push(v);
  const ticksX = [y0, ...[1900, 1950, 2000].filter((t) => t > y0 && t < y1), y1];
  const series = rows.map((r) => [r.year, r.max === null ? null : +r.max.toFixed(1), r.min === null ? null : +r.min.toFixed(1)]);
  const shown = rows.findLast((r) => r.max !== null && r.min !== null) ?? rows.at(-1); // pre-filled so it reads without JavaScript

  return `<figure class="chart" data-chart>
  <div class="chart__head">
    <figcaption><h2 class="title display"><span>${caption}</span></h2></figcaption>
    <output class="chart__readout" aria-live="polite">
      <span class="chart__year display">${shown.year}</span>
      <span class="chart__value chart__value--max"><span class="chart__key"></span>Daily maximum <b>${deg(shown.max)}</b></span>
      <span class="chart__value chart__value--min"><span class="chart__key"></span>Daily minimum <b>${deg(shown.min)}</b></span>
    </output>
  </div>
  <div class="chart__plot" tabindex="0" role="img" aria-label="${caption}. Daily maximum and minimum, ${y0} to ${y1}. Years without readings are left blank."
    data-series='${JSON.stringify(series)}' data-lo="${lo}" data-hi="${hi}">
    <div class="chart__y" aria-hidden="true">${ticksY.map((v) => `<span>${v}°</span>`).join('')}</div>
    <svg class="chart__lines" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      ${gaps(rows).map(([a, b]) => `<rect class="chart__gap" x="${x(a).toFixed(1)}" y="0" width="${Math.max(2, x(b) - x(a)).toFixed(1)}" height="${H}"/>`).join('')}
      ${ticksY.map((v) => `<line class="chart__grid" x1="0" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`).join('')}
      ${line('max')}${line('min')}
    </svg>
    <svg class="chart__over" aria-hidden="true">
      <line class="chart__cursor" x1="0" x2="0" y1="0" y2="100%" hidden/>
      <circle class="chart__dot chart__dot--max" r="5" hidden/>
      <circle class="chart__dot chart__dot--min" r="5" hidden/>
    </svg>
    <svg class="chart__x" aria-hidden="true">
      ${ticksX.map((t) => `<text x="${(((t - y0) / (y1 - y0)) * 100).toFixed(2)}%" y="1.15rem" text-anchor="${t === y0 ? 'start' : t === y1 ? 'end' : 'middle'}">${t}</text>`).join('')}
    </svg>
  </div>
  <p class="chart__note">Shaded years have no readings. Move across the chart, or use the arrow keys, for any year.</p>
</figure>`;
}

