import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  server:{
    open: true,
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    minify: 'oxc',
    sourcemap: false,
    emptyOutDir: true,
  },
})
