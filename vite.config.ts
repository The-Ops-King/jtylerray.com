import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * One source, three builds. Each target ships to its own folder under the
 * site's public/ directory, so each needs its own base path — the default
 * '/' would have the card asking for /assets/... from the site root.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const card = Boolean(env.VITE_CARD)
  const lab = Boolean(env.VITE_LAB)

  return {
    plugins: [react()],
    base: card ? '/card/' : lab ? '/brand-1/' : '/new-home/',
    build: {
      outDir: card ? 'dist-card' : lab ? 'dist-lab' : 'dist-new-home',
      emptyOutDir: true,
    },
  }
})
