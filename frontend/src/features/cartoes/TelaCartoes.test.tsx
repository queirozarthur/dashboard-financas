import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Conta } from '@/core/api'
import { contaDeTeste } from '@/testes/fabricas'

import type { Compra, Fatura } from './consts/esquemas'
import { TelaCartoes } from './TelaCartoes'

const CORRENTE = contaDeTeste({ id: 1, nome: 'Corrente', tipo: 'corrente' })
const CARTEIRA = contaDeTeste({ id: 2, nome: 'Carteira', tipo: 'dinheiro' })
const NUBANK = contaDeTeste({ id: 4, nome: 'Nubank', tipo: 'cartao', cor: 'violeta' })
const INTER = contaDeTeste({ id: 5, nome: 'Inter', tipo: 'cartao', cor: 'laranja' })

// Nubank fecha dia 25 e vence dia 5: a fatura de novembro fechou em 25/10
const FATURA: Fatura = {
  cartao: 4,
  cartao_nome: 'Nubank',
  mes: '2026-11',
  fechamento: '2026-10-25',
  vencimento: '2026-11-05',
  fechada: true,
  total: '83.34',
  situacao: 'pendente',
  pagamento: null,
  parcelas: [
    {
      id: 31,
      compra: 9,
      descricao: 'Geladeira',
      categoria_nome: 'Casa',
      categoria_cor: 'azul',
      categoria_icone: 'casa',
      data_compra: '2026-10-10',
      numero: '1/3',
      valor: '33.34',
    },
    {
      id: 40,
      compra: 10,
      descricao: '',
      categoria_nome: 'Farmácia',
      categoria_cor: 'verde',
      categoria_icone: 'saude',
      data_compra: '2026-10-20',
      numero: '1/1',
      valor: '50.00',
    },
  ],
}

const PAGA: Fatura = {
  ...FATURA,
  situacao: 'paga',
  pagamento: { id: 77, data: '2026-11-01', conta: 1, conta_nome: 'Corrente', valor: '83.34' },
}

const GELADEIRA: Compra = {
  id: 9,
  descricao: 'Geladeira',
  valor_total: '100.00',
  parcelas: 3,
  data_compra: '2026-10-10',
  cartao: 4,
  cartao_nome: 'Nubank',
  categoria: 7,
  categoria_nome: 'Casa',
  categoria_cor: 'azul',
  categoria_icone: 'casa',
  parcelas_geradas: [
    {
      id: 31,
      numero: '1/3',
      valor: '33.34',
      vencimento: '2026-11-05',
      situacao: 'paga',
      data_pagamento: '2026-11-01',
    },
    {
      id: 32,
      numero: '2/3',
      valor: '33.33',
      vencimento: '2026-12-05',
      situacao: 'pendente',
      data_pagamento: null,
    },
    {
      id: 33,
      numero: '3/3',
      valor: '33.33',
      vencimento: '2027-01-05',
      situacao: 'pendente',
      data_pagamento: null,
    },
  ],
}

const json = (corpo: unknown, status = 200) => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Pedido = { metodo: string; caminho: string; corpo: unknown }

type Servidor = {
  contas?: Conta[]
  fatura?: (caminho: string) => Fatura
  compra?: Compra
  escrita?: (pedido: Pedido) => Response
}

const fetchFalso = vi.fn<typeof fetch>()

const servir = ({
  contas = [CORRENTE, CARTEIRA, NUBANK],
  fatura = () => FATURA,
  compra = GELADEIRA,
  escrita = () => json(PAGA, 201),
}: Servidor = {}) => {
  fetchFalso.mockImplementation(async (entrada, init) => {
    const caminho = new URL(String(entrada)).pathname
    const metodo = init?.method ?? 'GET'
    if (metodo !== 'GET') {
      const corpo: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      return escrita({ metodo, caminho, corpo })
    }
    if (caminho.endsWith('/contas/')) {
      return json(contas)
    }
    if (caminho.includes('/faturas/')) {
      return json(fatura(caminho))
    }
    return json(compra)
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

const caminhosPedidos = (): string[] => {
  return fetchFalso.mock.calls.map(([entrada]) => {
    return new URL(String(entrada)).pathname
  })
}

const abrir = (aoNovaCompra = vi.fn()) => {
  const clienteQuery = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const roteador = createMemoryRouter(
    [{ path: '*', element: <TelaCartoes aoNovaCompra={aoNovaCompra} /> }],
    { initialEntries: ['/cartoes?mes=2026-11'] },
  )
  render(
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const resumo = async (): Promise<HTMLElement> => {
  return screen.findByRole('region', { name: 'Fatura' })
}

const hoje = (dia: Date) => {
  vi.setSystemTime(dia)
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
  vi.useFakeTimers({ toFake: ['Date'] })
  hoje(new Date(2026, 9, 26, 10, 0))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('TelaCartoes', () => {
  it('sem cartão: convida a cadastrar um', async () => {
    servir({ contas: [CORRENTE] })
    abrir()
    expect(await screen.findByRole('link', { name: 'Cadastrar cartão' })).toHaveAttribute(
      'href',
      '/mais/contas',
    )
  })

  it('mostra o total, a situação e as compras da fatura que vence no mês', async () => {
    servir()
    abrir()
    const bloco = await resumo()

    // Espaço comum: o Testing Library normaliza o espaço sem quebra do "R$"
    expect(bloco).toHaveTextContent('R$ 83,34')
    expect(bloco).toHaveTextContent('Fechada')
    expect(bloco).toHaveTextContent('Fechou em 25 de outubro · vence em 5 de novembro')
    expect(caminhosPedidos()).toContain('/api/cartoes/4/faturas/2026-11/')

    const geladeira = screen.getByText('Geladeira').closest('li')
    expect(geladeira).toHaveTextContent('Casa · 10 de out.')
    expect(geladeira).toHaveTextContent('parcela 1/3')
    // Sem descrição, a categoria vira o título; à vista, sem número de parcela
    const farmacia = screen.getByText('Farmácia').closest('li')
    expect(farmacia).toHaveTextContent('20 de out.')
    expect(farmacia).not.toHaveTextContent('parcela')
  })

  it('vencida: alerta com texto, e ainda dá para pagar', async () => {
    hoje(new Date(2026, 10, 10))
    servir()
    abrir()
    const bloco = await resumo()
    expect(bloco).toHaveTextContent('Vencida')
    expect(bloco).toHaveTextContent('Venceu em 5 de novembro')
    expect(within(bloco).getByRole('button', { name: 'Pagar fatura' })).toBeInTheDocument()
  })

  it('aberta: ainda não dá para pagar', async () => {
    servir({ fatura: () => ({ ...FATURA, fechada: false }) })
    abrir()
    const bloco = await resumo()
    expect(bloco).toHaveTextContent('Fecha em 25 de outubro · vence em 5 de novembro')
    expect(within(bloco).queryByRole('button', { name: 'Pagar fatura' })).not.toBeInTheDocument()
  })

  it('pagar manda a conta e a data (o valor é com o backend) e fecha a folha', async () => {
    servir()
    const usuario = abrir()
    await usuario.click(within(await resumo()).getByRole('button', { name: 'Pagar fatura' }))
    const folha = await screen.findByRole('dialog', { name: 'Pagar fatura' })
    expect(folha).toHaveTextContent('R$ 83,34')
    expect(folha).toHaveTextContent('Fatura de novembro · Nubank')
    expect(within(folha).getByLabelText('Data')).toHaveValue('2026-10-26')
    // Cartão não paga cartão
    const contas = within(within(folha).getByLabelText('Pagar com')).getAllByRole('option')
    expect(contas.map((opcao) => opcao.textContent)).toEqual(['Escolher', 'Corrente', 'Carteira'])

    await usuario.selectOptions(within(folha).getByLabelText('Pagar com'), 'Corrente')
    await usuario.click(within(folha).getByRole('button', { name: 'Pagar' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(escritas()).toEqual([
      {
        metodo: 'POST',
        caminho: '/api/cartoes/4/faturas/2026-11/pagar/',
        corpo: { conta: 1, data: '2026-10-26' },
      },
    ])
  })

  it('pagamento recusado mostra a mensagem do backend na folha', async () => {
    servir({
      escrita: () => {
        return json({ detail: 'A fatura só fecha em 25/10/2026; pague a partir dessa data.' }, 400)
      },
    })
    const usuario = abrir()
    await usuario.click(within(await resumo()).getByRole('button', { name: 'Pagar fatura' }))
    const folha = await screen.findByRole('dialog', { name: 'Pagar fatura' })
    await usuario.selectOptions(within(folha).getByLabelText('Pagar com'), 'Carteira')
    await usuario.click(within(folha).getByRole('button', { name: 'Pagar' }))

    expect(await within(folha).findByRole('alert')).toHaveTextContent('A fatura só fecha em')
  })

  it('paga: diz quando e com qual conta; cancelar pede confirmação', async () => {
    servir({ fatura: () => PAGA, escrita: () => json(FATURA) })
    const usuario = abrir()
    const bloco = await resumo()
    expect(bloco).toHaveTextContent('Paga')
    expect(bloco).toHaveTextContent('Paga em 1 de novembro · Corrente')
    expect(within(bloco).queryByRole('button', { name: 'Pagar fatura' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Cancelar pagamento' }))
    expect(screen.getByText('Cancelar o pagamento desta fatura?')).toBeInTheDocument()
    expect(escritas()).toEqual([])

    await usuario.click(screen.getByRole('button', { name: 'Cancelar pagamento' }))
    await waitFor(() => {
      expect(escritas()).toEqual([
        { metodo: 'DELETE', caminho: '/api/cartoes/4/faturas/2026-11/pagar/', corpo: null },
      ])
    })
  })

  it('com dois cartões, escolher o outro busca a fatura dele', async () => {
    servir({
      contas: [CORRENTE, NUBANK, INTER],
      fatura: (caminho) => {
        return caminho.includes('/cartoes/5/')
          ? { ...FATURA, cartao: 5, cartao_nome: 'Inter', parcelas: [], total: '0.00' }
          : FATURA
      },
    })
    const usuario = abrir()
    await resumo()
    expect(screen.getByRole('radio', { name: 'Nubank' })).toBeChecked()

    await usuario.click(screen.getByText('Inter'))

    expect(await screen.findByText('Nenhuma compra nesta fatura.')).toBeInTheDocument()
    expect(caminhosPedidos()).toContain('/api/cartoes/5/faturas/2026-11/')
    expect(screen.getByRole('radio', { name: 'Inter' })).toBeChecked()
  })

  it('tocar numa compra mostra todas as parcelas; com parcela paga, não apaga', async () => {
    servir()
    const usuario = abrir()
    await resumo()
    await usuario.click(screen.getByRole('button', { name: /Geladeira/ }))
    const folha = await screen.findByRole('dialog', { name: 'Compra' })

    expect(await within(folha).findByText('Parcela 1/3')).toBeInTheDocument()
    expect(within(folha).getByText('Parcela 1/3').closest('li')).toHaveTextContent(
      'Paga em 01/11/2026',
    )
    expect(within(folha).getByText('Parcela 2/3').closest('li')).toHaveTextContent(
      'Vence em 05/12/2026',
    )
    expect(within(folha).queryByRole('button', { name: 'Apagar compra' })).not.toBeInTheDocument()
    expect(folha).toHaveTextContent('não pode ser apagada')
    expect(caminhosPedidos()).toContain('/api/compras/9/')
  })

  it('apagar uma compra sem parcela paga pede confirmação e manda DELETE', async () => {
    const semPagas: Compra = {
      ...GELADEIRA,
      parcelas_geradas: GELADEIRA.parcelas_geradas.map((parcela) => {
        return { ...parcela, situacao: 'pendente' as const, data_pagamento: null }
      }),
    }
    servir({ compra: semPagas, escrita: () => new Response(null, { status: 204 }) })
    const usuario = abrir()
    await resumo()
    await usuario.click(screen.getByRole('button', { name: /Geladeira/ }))
    const folha = await screen.findByRole('dialog', { name: 'Compra' })

    await usuario.click(await within(folha).findByRole('button', { name: 'Apagar compra' }))
    expect(within(folha).getByText(/As 3 parcelas saem das faturas/)).toBeInTheDocument()
    await usuario.click(within(folha).getByRole('button', { name: 'Apagar' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(escritas()).toEqual([{ metodo: 'DELETE', caminho: '/api/compras/9/', corpo: null }])
  })

  it('o ＋ abre uma compra nova no cartão escolhido', async () => {
    servir()
    const aoNovaCompra = vi.fn()
    const usuario = abrir(aoNovaCompra)
    await resumo()
    await usuario.click(screen.getByRole('button', { name: 'Nova compra' }))
    expect(aoNovaCompra).toHaveBeenCalledWith(4)
  })
})
