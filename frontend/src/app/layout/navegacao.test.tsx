import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LayoutPrincipal } from './LayoutPrincipal'

const abrir = (caminho: string) => {
  const roteador = createMemoryRouter(
    [
      {
        element: <LayoutPrincipal />,
        children: [
          { index: true, element: <h1>Tela Início</h1> },
          { path: 'lancamentos', element: <h1>Tela Lançamentos</h1> },
          { path: 'mais', element: <h1>Tela Mais</h1> },
        ],
      },
    ],
    { initialEntries: [caminho] },
  )
  const clienteQuery = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  )
  return roteador
}

beforeEach(() => {
  // A folha de lançamento busca contas e categorias; aqui basta responder listas vazias
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('navegação principal', () => {
  it('mostra as quatro telas e o botão de novo lançamento no meio', () => {
    abrir('/')
    const nomes = screen.getAllByRole('link').map((link) => link.textContent)
    expect(nomes).toEqual(['Início', 'Lançamentos', 'Cartões', 'Mais'])
    expect(screen.getByRole('button', { name: 'Novo lançamento' })).toBeInTheDocument()
  })

  it('marca a aba da tela atual, e Início só na rota exata', () => {
    abrir('/lancamentos')
    expect(screen.getByRole('link', { name: 'Lançamentos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  it('tocar numa aba troca a tela', async () => {
    const roteador = abrir('/')
    await userEvent.setup().click(screen.getByRole('link', { name: 'Mais' }))
    expect(screen.getByRole('heading', { name: 'Tela Mais' })).toBeInTheDocument()
    expect(roteador.state.location.pathname).toBe('/mais')
  })

  it('o ＋ abre a folha por cima, sem trocar de tela', async () => {
    const roteador = abrir('/lancamentos')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Novo lançamento' }))
    expect(await screen.findByRole('dialog', { name: 'Novo lançamento' })).toBeInTheDocument()
    expect(roteador.state.location.pathname).toBe('/lancamentos')
  })
})
