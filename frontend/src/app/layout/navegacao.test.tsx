import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

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
  render(<RouterProvider router={roteador} />)
  return roteador
}

describe('navegação principal', () => {
  it('mostra as cinco abas', () => {
    abrir('/')
    const nomes = screen.getAllByRole('link').map((link) => link.textContent)
    expect(nomes).toEqual(['Início', 'Lançamentos', 'Novo', 'Cartões', 'Mais'])
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
})
