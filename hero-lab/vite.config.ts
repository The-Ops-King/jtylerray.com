import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * One source, three builds. Each target ships to its own folder under the
 * site's public/ directory, so each needs its own base path — the default
 * '/' would have the card asking for /assets/... from the site root.
 *
 * In dev the base is '/' instead, and one server carries all three: main.tsx
 * picks the root off the pathname, so /card and /brand-1 are the same server
 * as /new-home. A base per target would have meant a port per target.
 */
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const card = Boolean(env.VITE_CARD)
  const lab = Boolean(env.VITE_LAB)
  const serve = command === 'serve'

  return {
    plugins: [react()],
    base: serve ? '/' : card ? '/card/' : lab ? '/brand-1/' : '/new-home/',
    build: {
      outDir: card ? 'dist-card' : lab ? 'dist-lab' : 'dist-new-home',
      emptyOutDir: true,
    },
    server: {
      /* the form posts to /api/book, which only exists on the site's Vercel
         functions. Point dev at a `vercel dev` running in ~/Projects/
         jtylerray.com and the card's form works locally too; without it the
         form reports the failure rather than pretending to send. */
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
