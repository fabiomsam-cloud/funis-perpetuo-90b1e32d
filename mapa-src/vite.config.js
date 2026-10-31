import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// build sai em ../mapa (publicado no GitHub Pages do painel); o protótipo da Fase 0 (prototipo-tjam.html) fica lá dentro
export default defineConfig({ plugins: [react()], base: './', build: { outDir: '../mapa', emptyOutDir: false, assetsDir: 'assets' } })
