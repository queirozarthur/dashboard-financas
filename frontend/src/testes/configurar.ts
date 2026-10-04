// Adiciona matchers como toBeInTheDocument() ao expect do Vitest
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sem `globals: true` no Vitest, o Testing Library não desmonta a tela sozinho entre os testes
afterEach(() => {
  cleanup()
  localStorage.clear()
})
