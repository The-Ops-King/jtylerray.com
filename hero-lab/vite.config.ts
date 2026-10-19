import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * One source, five builds. Each target ships to its own folder under the
 * site's public/ directory, so each needs its own base path — the default
 * '/' would have the card asking for /assets/... from the site root.
 *
 * In dev the base is '/' instead, and one server carries all five: main.tsx
 * picks the root off the pathname, so /card, /apply, /research and /brand-1
 * are the same server as /new-home. A base per target would have meant a port
 * per target.
 *
 * The targets are a table rather than a chain of ternaries. At four it was
 * readable; the fifth is what made the nesting cost more than the lookup.
 */
const TARGETS = [
  { flag: 'VITE_CARD', dir: 'card' },
  { flag: 'VITE_APPLY', dir: 'apply' },
  { flag: 'VITE_RESEARCH', dir: 'research' },
  { flag: 'VITE_LAB', dir: 'brand-1' },
] as const

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const hit = TARGETS.find((t) => Boolean(env[t.flag]))
  const serve = command === 'serve'

  /* the lab ships to /brand-1/ but builds into dist-lab, which is the one
     place the folder and the route disagree */
  const out = !hit ? 'new-home' : hit.dir === 'brand-1' ? 'lab' : hit.dir

  return {
    plugins: [react()],
    base: serve ? '/' : `/${hit ? hit.dir : 'new-home'}/`,
    build: {
      outDir: `dist-${out}`,
      emptyOutDir: true,
    },
    server: {
      /* the forms post to /api/*, which only exists on the site's Vercel
         functions. Point dev at a `vercel dev` running in ~/Projects/
         jtylerray.com and the forms work locally too; without it they report
         the failure rather than pretending to send. */
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
