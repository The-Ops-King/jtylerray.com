/** Minimal flag parser: --force, --limit N, plus any --flag or --flag value (camelCased onto the result). */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { force: false, limit: Infinity, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') out.force = true;
    else if (a === '--limit') { out.limit = Number(argv[++i]); if (!Number.isFinite(out.limit) || out.limit <= 0) throw new Error('--limit needs a positive number'); }
    else if (a.startsWith('--')) { out[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; }
    else out.positional.push(a);
  }
  return out;
}
