import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cs-label-tool/',
  publicDir: false,
  build: {
    outDir: 'demo-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        demo: 'demo/index.html',
      },
    },
  },
})
