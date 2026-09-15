import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');
/** IG_PROSPECTOR_HOME overrides where config/, data/ and cache/ live (used by tests; defaults to the package root). */
const HOME = process.env.IG_PROSPECTOR_HOME ? path.resolve(process.env.IG_PROSPECTOR_HOME) : ROOT;
export const CONFIG_DIR = path.join(HOME, 'config');
export const DATA_DIR = path.join(HOME, 'data');
export const CACHE_DIR = path.join(HOME, 'cache');
export const RAW_DIR = path.join(DATA_DIR, 'raw');

export const FILES = {
  resolved: path.join(DATA_DIR, 'resolved.ndjson'),
  unresolved: path.join(DATA_DIR, 'unresolved.ndjson'),
  profiles: path.join(DATA_DIR, 'profiles.ndjson'),
  funnels: path.join(DATA_DIR, 'funnels.ndjson'),
  classified: path.join(DATA_DIR, 'classified.ndjson'),
  classifyFailures: path.join(DATA_DIR, 'classify-failures.ndjson'),
  qualified: path.join(DATA_DIR, 'qualified.ndjson'),
  rejects: path.join(DATA_DIR, 'rejects.ndjson'),
  exportCsv: path.join(DATA_DIR, 'export.csv'),
  ghlSync: path.join(DATA_DIR, 'ghl-sync.ndjson'),
  costs: path.join(DATA_DIR, 'costs.ndjson'),
};

export function ensureDirs() {
  for (const d of [DATA_DIR, CACHE_DIR, RAW_DIR]) fs.mkdirSync(d, { recursive: true });
}

export function readConfig(name) {
  const file = path.join(CONFIG_DIR, name);
  if (!fs.existsSync(file)) throw new Error(`Missing config file: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
