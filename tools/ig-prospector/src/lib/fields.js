/** Read the first non-empty value at any of several dotted paths ("snapshot.cards.0.link_url"). Actor outputs differ; the paths live in config/actors.json. */
export function pick(obj, paths) {
  for (const p of paths) {
    let cur = obj;
    for (const seg of p.split('.')) {
      if (cur == null) break;
      cur = cur[seg];
    }
    if (cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return null;
}

/** Fill "{{name}}" placeholders in an input template. A value that is exactly "{{name}}" is replaced by the raw (non-string) value. */
export function fillTemplate(template, vars) {
  if (typeof template === 'string') {
    const whole = template.match(/^\{\{(\w+)\}\}$/);
    if (whole) return vars[whole[1]];
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
  }
  if (Array.isArray(template)) return template.map((t) => fillTemplate(t, vars));
  if (template && typeof template === 'object') return Object.fromEntries(Object.entries(template).map(([k, v]) => [k, fillTemplate(v, vars)]));
  return template;
}
