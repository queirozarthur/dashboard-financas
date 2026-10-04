import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { categoriaDeTeste, contaDeTeste } from '@/testes/fabricas'

import { TelaCategorias } from './TelaCategorias'
import { TelaContas } from './TelaContas'

const CONTAS = [
  contaDeTeste({ id: 1, nome: 'Corrente', tipo: 'corrente', saldo: '3810.00' }),
  contaDeTeste({ id: 2, nome: 'Carteira', tipo: 'dinheiro', cor: 'verde', saldo: '-50.00' }),
  contaDeTeste({ id: 4, nome: 'Nubank', tipo: 'cartao', cor: 'rosa', saldo: '-1100.00' }),
]

const CATEGORIAS = [
  categoriaDeTeste({ id: 7, nome: 'Mercado', natureza: 'despesa', icone: 'carrinho' }),
  categoriaDeTeste({ id: 8, nome: 'Moradia', natureza: 'despesa', tipo: 'fixo', cor: 'azul' }),
  categoriaDeTeste({ id: 9, nome: 'Salário', natureza: 'receita', tipo: 'fixo', cor: 'verde' }),
]

const json = (corpo: unknown, status = 200) => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Pedido = { metodo: string; caminho: string; corpo: unknown }

const fetchFalso = vi.fn<typeof fetch>()

/** `escrita` responde POST, PATCH e DELETE; as listas sempre respondem com os dados acima. */
const servir = (escrita: (pedido: Pedido) => Response = () => json({}, 201)) => {
  fetchFalso.mockImplementation(async (entrada, init) => {
    const caminho = new URL(String(entrada)).pathname
    const metodo = init?.method ?? 'GET'
    if (metodo === 'GET') {
      return json(caminho.endsWith('/contas/') ? CONTAS : CATEGORIAS)
    }
    const corpo: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    return escrita({ metodo, caminho, corpo })
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

const abrir = (tela: ReactElement) => {
  const clienteQuery = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const roteador = createMemoryRouter([{ path: '*', element: tela }], {
    initialEntries: ['/mais/contas'],
  })
  render(
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const grupo = (titulo: string): HTMLElement => {
  // Nível 2: o título da página (nível 1) também pode se chamar "Contas"
  const elemento = screen.getByRole('heading', { level: 2, name: titulo }).parentElement
  if (!elemento) {
    throw new Error(`Grupo "${titulo}" não encontrado`)
  }
  return elemento
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TelaContas', () => {
  it('separa contas e cartões, com o saldo de cada uma', async () => {
    servir()
    abrir(<TelaContas />)
    await screen.findByText('Corrente')

    const contas = grupo('Contas')
    expect(within(contas).getByText('Corrente').closest('li')).toHaveTextContent('R$ 3.810,00')
    // Conta comum negativa é alerta (vermelho)
    expect(within(contas).getByText(/50,00/)).toHaveClass('text-despesa')

    const cartoes = grupo('Cartões de crédito')
    const nubank = within(cartoes).getByText('Nubank').closest('li')
    expect(nubank).toHaveTextContent('Fecha dia 25 · vence dia 5')
    // Dívida do cartão: "−" em cor normal, não vermelho
    expect(within(cartoes).getByText(/1.100,00/)).not.toHaveClass('text-despesa')
  })

  it('tem o "‹ Mais" para voltar', async () => {
    servir()
    abrir(<TelaContas />)
    expect(await screen.findByRole('link', { name: 'Mais' })).toHaveAttribute('href', '/mais')
  })

  it('criar conta: a prévia já tem a próxima cor, e o envio leva cor, ícone e saldo em texto', async () => {
    servir()
    const usuario = abrir(<TelaContas />)
    await screen.findByText('Corrente')

    await usuario.click(screen.getByRole('button', { name: 'Nova conta' }))
    const folha = await screen.findByRole('dialog', { name: 'Nova conta' })
    // Já existem 3 contas: a próxima cor da paleta é a 4ª (amarelo)
    expect(within(folha).getByRole('radio', { name: 'Amarelo' })).toBeChecked()

    await usuario.type(within(folha).getByLabelText('Nome'), 'Poupança')
    await usuario.type(within(folha).getByLabelText('Saldo inicial'), '50000')
    await usuario.click(within(folha).getByText('Cofrinho'))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(escritas()).toEqual([
        {
          metodo: 'POST',
          caminho: '/api/contas/',
          corpo: {
            nome: 'Poupança',
            tipo: 'corrente',
            saldo_inicial: '500.00',
            dia_fechamento: null,
            dia_vencimento: null,
            cor: 'amarelo',
            icone: 'cofrinho',
          },
        },
      ])
    })
  })

  it('cartão troca o saldo inicial pelos dias e exige os dois', async () => {
    servir()
    const usuario = abrir(<TelaContas />)
    await screen.findByText('Corrente')
    await usuario.click(screen.getByRole('button', { name: 'Nova conta' }))
    const folha = await screen.findByRole('dialog', { name: 'Nova conta' })

    await usuario.type(within(folha).getByLabelText('Nome'), 'Inter')
    await usuario.selectOptions(within(folha).getByLabelText('Tipo'), 'Cartão de crédito')

    expect(within(folha).queryByLabelText('Saldo inicial')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(within(folha).getByText('Escolha o dia em que a fatura fecha.')).toBeInTheDocument()
    expect(escritas()).toEqual([])
  })

  it('editar abre preenchido; erro do servidor cai embaixo do campo', async () => {
    servir(() => {
      return json(
        { tipo: ['Não é possível transformar em cartão uma conta que já tem lançamentos.'] },
        400,
      )
    })
    const usuario = abrir(<TelaContas />)
    await usuario.click(await screen.findByRole('button', { name: /Corrente/ }))
    const folha = await screen.findByRole('dialog', { name: 'Editar conta' })
    expect(within(folha).getByLabelText('Nome')).toHaveValue('Corrente')

    await usuario.selectOptions(within(folha).getByLabelText('Tipo'), 'Cartão de crédito')
    await usuario.selectOptions(within(folha).getByLabelText('Fecha dia'), '25')
    await usuario.selectOptions(within(folha).getByLabelText('Vence dia'), '5')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await within(folha).findByText(/já tem lançamentos/)).toBeInTheDocument()
    expect(within(folha).getByLabelText('Tipo')).toHaveAttribute('aria-invalid', 'true')
    expect(escritas()[0]).toMatchObject({ metodo: 'PATCH', caminho: '/api/contas/1/' })
  })

  it('apagar conta com lançamentos (pelo computador) mostra a mensagem do servidor', async () => {
    servir(() => {
      return json(
        { detail: 'Não é possível apagar: existem lançamentos ligados a este registro.' },
        409,
      )
    })
    const usuario = abrir(<TelaContas />)
    await usuario.click(await screen.findByRole('button', { name: /Carteira/ }))
    const folha = await screen.findByRole('dialog', { name: 'Editar conta' })

    await usuario.click(within(folha).getByRole('button', { name: 'Apagar conta' }))
    await usuario.click(within(folha).getByRole('button', { name: 'Apagar' }))

    expect(await within(folha).findByRole('alert')).toHaveTextContent('existem lançamentos ligados')
    expect(escritas()).toEqual([{ metodo: 'DELETE', caminho: '/api/contas/2/', corpo: null }])
  })
})

describe('TelaCategorias', () => {
  it('separa despesas e receitas, com fixa ou variável', async () => {
    servir()
    abrir(<TelaCategorias />)
    await screen.findByText('Mercado')
    expect(within(grupo('Despesas')).getByText('Moradia').closest('li')).toHaveTextContent('Fixa')
    expect(within(grupo('Despesas')).getByText('Mercado').closest('li')).toHaveTextContent(
      'Variável',
    )
    expect(within(grupo('Receitas')).getByText('Salário')).toBeInTheDocument()
  })

  it('criar categoria de receita fixa', async () => {
    servir()
    const usuario = abrir(<TelaCategorias />)
    await screen.findByText('Mercado')
    await usuario.click(screen.getByRole('button', { name: 'Nova categoria' }))
    const folha = await screen.findByRole('dialog', { name: 'Nova categoria' })

    await usuario.click(within(folha).getByText('Receita'))
    await usuario.type(within(folha).getByLabelText('Nome'), 'Freela')
    await usuario.click(within(folha).getByText('Fixa'))
    await usuario.click(within(folha).getByText('Trabalho'))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(escritas()[0]).toEqual({
        metodo: 'POST',
        caminho: '/api/categorias/',
        // 3 categorias já existem: a próxima cor é a 4ª (amarelo)
        corpo: {
          nome: 'Freela',
          natureza: 'receita',
          tipo: 'fixo',
          cor: 'amarelo',
          icone: 'trabalho',
        },
      })
    })
  })

  it('servidor recusa mudar a natureza: a mensagem aparece embaixo do controle', async () => {
    servir(() => {
      return json(
        { natureza: ['Não é possível mudar a natureza de uma categoria que já tem transações.'] },
        400,
      )
    })
    const usuario = abrir(<TelaCategorias />)
    await usuario.click(await screen.findByRole('button', { name: /Mercado/ }))
    const folha = await screen.findByRole('dialog', { name: 'Editar categoria' })

    await usuario.click(within(folha).getByText('Receita'))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await within(folha).findByRole('alert')).toHaveTextContent('já tem transações')
  })
})
