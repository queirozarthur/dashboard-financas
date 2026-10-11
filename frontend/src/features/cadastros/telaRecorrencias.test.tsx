import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { categoriaDeTeste, contaDeTeste } from '@/testes/fabricas'

import type { Recorrencia } from './consts/esquemas'
import { TelaRecorrencias } from './TelaRecorrencias'

const CONTAS = [
  contaDeTeste({ id: 1, nome: 'Corrente', tipo: 'corrente' }),
  contaDeTeste({ id: 2, nome: 'Investimentos', tipo: 'investimento' }),
  contaDeTeste({ id: 4, nome: 'Nubank', tipo: 'cartao' }),
]

const CATEGORIAS = [
  categoriaDeTeste({ id: 8, nome: 'Moradia', natureza: 'despesa', tipo: 'fixo' }),
  categoriaDeTeste({ id: 9, nome: 'Salário', natureza: 'receita', tipo: 'fixo' }),
]

const base: Recorrencia = {
  id: 3,
  descricao: 'Aluguel',
  tipo: 'despesa',
  valor: '1800.00',
  dia: 10,
  inicio: '2026-01',
  fim: null,
  conta: 1,
  conta_nome: 'Corrente',
  conta_destino: null,
  conta_destino_nome: null,
  categoria: 8,
  categoria_nome: 'Moradia',
  categoria_cor: 'violeta',
  categoria_icone: 'casa',
}

const RECORRENCIAS: Recorrencia[] = [
  base,
  {
    ...base,
    id: 4,
    descricao: 'Salário',
    tipo: 'receita',
    valor: '5200.00',
    dia: 5,
    categoria: 9,
    categoria_nome: 'Salário',
  },
  {
    ...base,
    id: 5,
    descricao: 'Aporte',
    tipo: 'transferencia',
    valor: '500.00',
    conta_destino: 2,
    conta_destino_nome: 'Investimentos',
    categoria: null,
    categoria_nome: null,
    categoria_cor: null,
    categoria_icone: null,
  },
  { ...base, id: 6, descricao: 'Curso', fim: '2026-06' },
]

const json = (corpo: unknown, status = 200) => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Pedido = { metodo: string; caminho: string; corpo: unknown }

const fetchFalso = vi.fn<typeof fetch>()

const servir = (escrita: (pedido: Pedido) => Response = () => json(base, 201)) => {
  fetchFalso.mockImplementation(async (entrada, init) => {
    const caminho = new URL(String(entrada)).pathname
    const metodo = init?.method ?? 'GET'
    if (metodo !== 'GET') {
      const corpo: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      return escrita({ metodo, caminho, corpo })
    }
    if (caminho.endsWith('/contas/')) {
      return json(CONTAS)
    }
    if (caminho.endsWith('/categorias/')) {
      return json(CATEGORIAS)
    }
    return json(RECORRENCIAS)
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
  const roteador = createMemoryRouter([{ path: '*', element: <TelaRecorrencias /> }], {
    initialEntries: ['/mais/recorrencias'],
  })
  render(
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const grupo = (titulo: string): HTMLElement => {
  const elemento = screen.getByRole('heading', { level: 2, name: titulo }).parentElement
  if (!elemento) {
    throw new Error(`Grupo "${titulo}" não encontrado`)
  }
  return elemento
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 11, 9, 0))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('TelaRecorrencias', () => {
  it('separa por tipo, e as que já terminaram vão para "Encerradas"', async () => {
    servir()
    abrir()
    await screen.findByText('Aluguel')

    const aluguel = within(grupo('Despesas')).getByText('Aluguel').closest('li')
    expect(aluguel).toHaveTextContent('Corrente')
    expect(aluguel).toHaveTextContent('dia 10')
    expect(within(grupo('Receitas')).getByText('Salário').closest('li')).toHaveTextContent(
      '+R$ 5.200,00',
    )
    expect(within(grupo('Transferências')).getByText('Aporte').closest('li')).toHaveTextContent(
      'Corrente → Investimentos',
    )
    expect(within(grupo('Encerradas')).getByText('Curso').closest('li')).toHaveTextContent(
      'dia 10 · até 06/2026',
    )
  })

  it('nova recorrência: começa no mês e no dia de hoje; com último mês, ele vai junto', async () => {
    servir()
    const usuario = abrir()
    await screen.findByText('Aluguel')
    await usuario.click(screen.getByRole('button', { name: 'Nova recorrência' }))
    const folha = await screen.findByRole('dialog', { name: 'Nova recorrência' })

    expect(within(folha).getByLabelText('Começa em')).toHaveValue('2026-10')
    expect(within(folha).getByLabelText('Todo dia')).toHaveValue('11')
    // Recorrência nunca é no cartão
    await within(folha).findByRole('option', { name: 'Corrente' })
    expect(within(folha).queryByRole('option', { name: 'Nubank' })).not.toBeInTheDocument()

    await usuario.type(within(folha).getByLabelText('Nome'), 'Academia')
    await usuario.type(within(folha).getByLabelText('Valor'), '9990')
    await usuario.selectOptions(within(folha).getByLabelText('Conta'), 'Corrente')
    await usuario.selectOptions(within(folha).getByLabelText('Categoria'), 'Moradia')

    expect(within(folha).queryByLabelText('Último mês')).not.toBeInTheDocument()
    await usuario.click(within(folha).getByRole('switch', { name: 'Tem um último mês' }))
    // Já vem com o mês de início, para não aparecer vazio
    expect(within(folha).getByLabelText('Último mês')).toHaveValue('2026-10')
    fireEvent.change(within(folha).getByLabelText('Último mês'), {
      target: { value: '2026-12' },
    })
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(escritas()).toEqual([
        {
          metodo: 'POST',
          caminho: '/api/recorrencias/',
          corpo: {
            tipo: 'despesa',
            valor: '99.90',
            descricao: 'Academia',
            dia: 11,
            conta: 1,
            conta_destino: null,
            categoria: 8,
            inicio: '2026-10',
            fim: '2026-12',
          },
        },
      ])
    })
  })

  it('salvar sem o básico aponta os campos e não chama a API', async () => {
    servir()
    const usuario = abrir()
    await screen.findByText('Aluguel')
    await usuario.click(screen.getByRole('button', { name: 'Nova recorrência' }))
    const folha = await screen.findByRole('dialog', { name: 'Nova recorrência' })
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(within(folha).getByLabelText('Nome')).toHaveAccessibleDescription(
      'Dê um nome, como "Aluguel" ou "Salário".',
    )
    expect(within(folha).getByText('Informe o valor.')).toBeInTheDocument()
    expect(escritas()).toEqual([])
  })

  it('editar abre preenchido; erro do backend cai embaixo do campo', async () => {
    servir(() => json({ fim: ['O fim não pode ser antes do início.'] }, 400))
    const usuario = abrir()
    await usuario.click(await screen.findByRole('button', { name: /Curso/ }))
    const folha = await screen.findByRole('dialog', { name: 'Editar recorrência' })

    expect(within(folha).getByLabelText('Nome')).toHaveValue('Curso')
    expect(within(folha).getByRole('switch', { name: 'Tem um último mês' })).toBeChecked()
    expect(within(folha).getByLabelText('Último mês')).toHaveValue('2026-06')

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await within(folha).findByText('O fim não pode ser antes do início.'),
    ).toBeInTheDocument()
    expect(escritas()[0]).toMatchObject({ metodo: 'PATCH', caminho: '/api/recorrencias/6/' })
  })

  it('transferência troca categoria por "Para"', async () => {
    servir()
    const usuario = abrir()
    await screen.findByText('Aluguel')
    await usuario.click(screen.getByRole('button', { name: 'Nova recorrência' }))
    const folha = await screen.findByRole('dialog', { name: 'Nova recorrência' })
    await usuario.click(within(folha).getByText('Transferência'))

    expect(within(folha).getByLabelText('De')).toBeInTheDocument()
    expect(within(folha).getByLabelText('Para')).toBeInTheDocument()
    expect(within(folha).queryByLabelText('Categoria')).not.toBeInTheDocument()
  })
})
