import test from 'node:test';
import assert from 'node:assert/strict';
import { skillMatrix } from '../src/lib/skills.mjs';
import { parseAnnual, segments, gaps, annualChart } from '../src/lib/chart.mjs';
import { loadContent } from '../src/render.mjs';

const projects = [
  { slug: 'radio', title: 'Radio site', short: 'Radio', tech: ['Python', 'Flask'] },
  { slug: 'desk', title: 'Helpdesk', tech: ['Java'] },
];
const coursework = [{ code: 'ABC123', title: 'Programming', tech: ['Java', 'Python'] }];
const groups = [{ name: 'Languages', skills: ['Python', 'Java'] }, { name: 'Frameworks', skills: ['Flask'] }];

test('each skill is marked against the projects and modules that used it', () => {
  const m = skillMatrix({ groups, projects, coursework });
  assert.deepEqual(m.columns.map((c) => c.label), ['Radio', 'Helpdesk', 'Coursework']);
  const [python, java] = m.groups[0].rows;
  assert.deepEqual(python.cells.map((c) => c.used), [true, false, true]);
  assert.deepEqual(java.cells.map((c) => c.used), [false, true, true]);
  assert.deepEqual(python.cells[2].where, ['ABC123']);
});

test('a skill with no project or module behind it is refused', () => {
  assert.throws(() => skillMatrix({ groups: [{ name: 'Languages', skills: ['Python', 'Rust'] }], projects, coursework }), /Rust/);
});

test('a tool used in a project cannot be left off the table', () => {
  assert.throws(() => skillMatrix({ groups: [{ name: 'Languages', skills: ['Python', 'Java'] }], projects, coursework }), /Flask/);
});

test('the real content passes both rules', () => {
  const { site, projects: real } = loadContent();
  const m = skillMatrix({ groups: site.skillGroups, projects: real, coursework: site.coursework });
  assert.ok(m.groups.every((g) => g.rows.every((r) => r.cells.some((c) => c.used))));
});

const csv = 'year,tmax_months,tmax,tmin_months,tmin\n1853,0,,0,\n1854,0,,0,\n1855,12,13.2,12,5.9\n1856,12,12.8,12,\n1857,0,,0,\n1858,12,13.5,12,6.1\n';

test('a missing reading stays missing: it is never read as zero', () => {
  const rows = parseAnnual(csv);
  assert.equal(rows[0].max, null);
  assert.equal(rows[3].min, null);
  assert.equal(rows[2].max, 13.2);
});

test('the line breaks at a gap instead of joining across it', () => {
  const rows = parseAnnual(csv);
  assert.deepEqual(segments(rows, 'max').map((run) => run.map((r) => r.year)), [[1855, 1856], [1858]]);
  assert.deepEqual(segments(rows, 'min').map((run) => run.map((r) => r.year)), [[1855], [1858]]);
  assert.deepEqual(gaps(rows), [[1853, 1854], [1857, 1857]]);
});

test('the chart carries its own description and data for the readout', () => {
  const svg = annualChart(parseAnnual(csv), { caption: 'Test chart' });
  assert.match(svg, /role="img" aria-label="Test chart\./);
  assert.equal((svg.match(/<polyline/g) ?? []).length, 4);
  const series = JSON.parse(svg.match(/data-series='([^']+)'/)[1]);
  assert.deepEqual(series[0], [1853, null, null]);
  assert.deepEqual(series[2], [1855, 13.2, 5.9]);
  assert.equal((svg.match(/class="chart__gap"/g) ?? []).length, 2);
  assert.doesNotMatch(svg, /style=/);
});

test('the readout starts on the last year with both readings, and says so when one is missing', () => {
  const svg = annualChart(parseAnnual(csv), { caption: 'Test chart' });
  assert.match(svg, /chart__year display">1858</);
  assert.match(svg, /Daily maximum <b>13\.5°C<\/b>/);
  assert.match(svg, /Daily minimum <b>6\.1°C<\/b>/);
  const noMin = annualChart(parseAnnual('year,tmax_months,tmax,tmin_months,tmin\n1855,12,13.2,12,5.9\n1856,12,12.8,12,\n'), {});
  assert.match(noMin, /chart__year display">1855</);
});
