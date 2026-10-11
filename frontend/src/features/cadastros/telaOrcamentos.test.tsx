import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { categoriaDeTeste } from '@/testes/fabricas'

import type { Orcamento } from './consts/esquemas'
import { TelaOrcamentos } from './TelaOrcamentos'

const CATEGORIAS = [
  categoriaDeTeste({ id: 3, nome: 'Mercado', natureza: 'despesa' }),
  categoriaDeTeste({ id: 4, nome: 'Lazer', natureza: 'despesa' }),
  categoriaDeTeste({ id: 5, nome: 'Casa', natureza: 'despesa' }),
  categoriaDeTeste({ id: 9, nome: 'Salário', natureza: 'receita' }),
]

const MERCADO: Orcamento = {
  id: 7,
  categoria: 3,
  categoria_nome: 'Mercado',
  categoria_cor: 'laranja',
  categoria_icone: 'carrinho',
  valor: '800.00',
  inicio: '2026-03',
}

const LAZER: Orcamento = {
  ...MERCADO,
  id: 8,
  categoria: 4,
  categoria_nome: 'Lazer',
  valor: '300.00',
  inicio: '2026-10',
}

const json = (corpo: unknown, status = 200) => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Pedido = { metodo: string; caminho: string; corpo: unknown }

const fetchFalso = vi.fn<typeof fetch>()

const servir = (orcamentos: Orcamento[] = [MERCADO, LAZER]) => {
  fetchFalso.mockImplementation(async (entrada, init) => {
    const caminho = new URL(String(entrada)).pathname
    const metodo = init?.method ?? 'GET'
    if (metodo === 'DELETE') {
      return new Response(null, { status: 204 })
    }
    if (metodo !== 'GET') {
      return json(MERCADO, metodo === 'POST' ? 201 : 200)
    }
    return json(caminho.endsWith('/categorias/') ? CATEGORIAS : orcamentos)
  })
}

const escritas = (): Pedido[] => {
  return fetchFalso.mock.calls
    .filter(([, init]) => {
      return init?.method && init.method !== 'GET'
    })
    .map(([entrada, init]) => {
      return {
        metodo: init?.method ?? '',
        caminho: new URL(String(entrada)).pathname,
        corpo: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      }
    })
}

const abrir = () => {
  const clienteQuery = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const roteador = createMemoryRouter([{ path: '*', element: <TelaOrcamentos /> }], {
    initialEntries: ['/mais/orcamentos?mes=2026-10'],
  })
  render(
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TelaOrcamentos', () => {
  it('lista os limites que valem no mês, com desde quando', async () => {
    servir()
    abrir()
    const mercado = (await screen.findByText('Mercado')).closest('li')
    expect(mercado).toHaveTextContent('Desde mar. de 2026')
    expect(mercado).toHaveTextContent('R$ 800,00')
    expect(screen.getByText('Lazer').closest('li')).toHaveTextContent('Começa neste mês')

    const pedido = fetchFalso.mock.calls
      .map(([entrada]) => new URL(String(entrada)))
      .find((url) => url.pathname.endsWith('/orcamentos/'))
    expect(pedido?.searchParams.get('mes')).toBe('2026-10')
  })

  it('mudar um limite que começou antes cria um novo a partir do mês', async () => {
    servir()
    const usuario = abrir()
    await usuario.click(await screen.findByRole('button', { name: /Mercado/ }))
    const folha = await screen.findByRole('dialog', { name: 'Editar limite' })
    expect(folha).toHaveTextContent('Um valor novo vale de outubro de 2026 em diante')

    const limite = within(folha).getByLabelText('Limite')
    await usuario.clear(limite)
    await usuario.type(limite, '90000')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(escritas()).toEqual([
        {
          metodo: 'POST',
          caminho: '/api/orcamentos/',
          corpo: { categoria: 3, valor: '900.00', inicio: '2026-10' },
        },
      ])
    })
  })

  it('mudar um limite que começou no próprio mês só atualiza', async () => {
    servir()
    const usuario = abrir()
    await usuario.click(await screen.findByRole('button', { name: /Lazer/ }))
    const folha = await screen.findByRole('dialog', { name: 'Editar limite' })
    const limite = within(folha).getByLabelText('Limite')
    await usuario.clear(limite)
    await usuario.type(limite, '35000')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(escritas()).toEqual([
        { metodo: 'PATCH', caminho: '/api/orcamentos/8/', corpo: { valor: '350.00' } },
      ])
    })
  })

  it('limite novo: só categorias de despesa ainda sem limite no mês', async () => {
    servir()
    const usuario = abrir()
    await screen.findByText('Mercado')
    await usuario.click(screen.getByRole('button', { name: 'Novo limite' }))
    const folha = await screen.findByRole('dialog', { name: 'Novo limite' })

    const opcoes = within(within(folha).getByLabelText('Categoria')).getAllByRole('option')
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(['Escolher', 'Casa'])

    await usuario.selectOptions(within(folha).getByLabelText('Categoria'), 'Casa')
    await usuario.type(within(folha).getByLabelText('Limite'), '120000')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(escritas()).toEqual([
        {
          metodo: 'POST',
          caminho: '/api/orcamentos/',
          corpo: { categoria: 5, valor: '1200.00', inicio: '2026-10' },
        },
      ])
    })
  })

  it('apagar explica o efeito e pede confirmação, também no celular', async () => {
    servir()
    const usuario = abrir()
    await usuario.click(await screen.findByRole('button', { name: /Mercado/ }))
    const folha = await screen.findByRole('dialog', { name: 'Editar limite' })

    await usuario.click(within(folha).getByRole('button', { name: 'Apagar limite' }))
    expect(folha).toHaveTextContent('Ele vale desde mar. de 2026')
    await usuario.click(within(folha).getByRole('button', { name: 'Apagar' }))

    await waitFor(() => {
      expect(escritas()).toEqual([{ metodo: 'DELETE', caminho: '/api/orcamentos/7/', corpo: null }])
    })
  })

  it('mês sem limites convida a definir um', async () => {
    servir([])
    abrir()
    expect(await screen.findByText(/Nenhum limite em outubro/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Definir limite' })).toBeInTheDocument()
  })
})
