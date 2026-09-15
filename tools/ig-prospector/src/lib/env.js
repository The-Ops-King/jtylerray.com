import dotenv from 'dotenv';
import path from 'node:path';
import { ROOT } from './paths.js';

dotenv.config({ path: path.join(ROOT, '.env') });

/** Fail fast with a clear message naming the missing variable(s). */
export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n] || !process.env[n].trim());
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}. Put them in ${path.join(ROOT, '.env')} (see .env.example).`);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n].trim()]));
}
