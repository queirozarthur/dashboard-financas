import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // '@/core/ui' em vez de '../../../core/ui'
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testes/configurar.ts'],
    // Endereço fixo nos testes: não depende do .env de quem roda (e nada chama a API de verdade)
    env: { VITE_API_URL: 'http://api.teste/api' },
    // Testes de tela com digitação simulada passam de 5s quando todos rodam em paralelo
    testTimeout: 10_000,
  },
})
