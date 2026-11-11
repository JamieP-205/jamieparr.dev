// The skills table: every skill is shown against the projects and modules that used it.
// A skill with nothing behind it is an error, so the page cannot list a tool without evidence.

export function skillMatrix({ groups, projects, coursework = [] }) {
  const columns = [
    ...projects.map((p) => ({ key: p.slug, label: p.short ?? p.title, tech: new Set(p.tech ?? []) })),
    ...(coursework.length
      ? [{ key: 'coursework', label: 'Coursework', tech: new Set(coursework.flatMap((m) => m.tech)), modules: coursework }]
      : []),
  ];
  const listed = new Set(groups.flatMap((g) => g.skills));
  const used = new Set(columns.flatMap((c) => [...c.tech]));

  const unbacked = [...listed].filter((s) => !used.has(s));
  if (unbacked.length) throw new Error(`Skills listed without a project or module behind them: ${unbacked.join(', ')}`);
  const unlisted = [...used].filter((s) => !listed.has(s));
  if (unlisted.length) throw new Error(`Tools used in content but missing from skillGroups in site.json: ${unlisted.join(', ')}`);

  return {
    columns: columns.map(({ key, label, modules }) => ({ key, label, modules })),
    groups: groups.map((g) => ({
      name: g.name,
      rows: g.skills.map((skill) => ({
        skill,
        cells: columns.map((c) => ({
          used: c.tech.has(skill),
          // For the coursework column, name the modules so the claim can be checked.
          where: c.modules?.filter((m) => m.tech.includes(skill)).map((m) => m.code) ?? [],
        })),
      })),
    })),
  };
}
