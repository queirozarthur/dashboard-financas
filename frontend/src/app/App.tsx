import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { FC } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'

import { ErroDaApi, ErroDeSessao } from '@/core/api'
import { SessaoProvider } from '@/features/auth'

import { rotas } from './rotas'

const MAXIMO_DE_TENTATIVAS = 2

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      // Repetir só falha de rede; erro da API (400, 404) ou sessão vencida não melhoram tentando de novo
      retry: (falhas, erro) => {
        const definitivo = erro instanceof ErroDaApi || erro instanceof ErroDeSessao
        return !definitivo && falhas < MAXIMO_DE_TENTATIVAS
      },
    },
  },
})

const roteador = createBrowserRouter(rotas)

export const App: FC = () => {
  return (
    <QueryClientProvider client={clienteQuery}>
      <SessaoProvider>
        <RouterProvider router={roteador} />
      </SessaoProvider>
    </QueryClientProvider>
  )
}
