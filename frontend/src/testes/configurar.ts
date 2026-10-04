// Adiciona matchers como toBeInTheDocument() ao expect do Vitest
import '@testing-library/jest-dom/vitest'

import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// findBy* espera 1s por padrão; com todos os arquivos rodando em paralelo a tela às vezes
// demora mais que isso para aparecer, e o teste falhava por lentidão, não por erro
configure({ asyncUtilTimeout: 3000 })

// O jsdom não tem ResizeObserver, que o ResponsiveContainer do Recharts usa para medir a largura.
// Nos testes o gráfico fica com largura zero (não desenha); os dados são conferidos pela tabela.
class ResizeObserverDeTeste {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverDeTeste

// Sem `globals: true` no Vitest, o Testing Library não desmonta a tela sozinho entre os testes
afterEach(() => {
  cleanup()
  localStorage.clear()
})
