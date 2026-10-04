import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { contaDeTeste } from '@/testes/fabricas'

import type { Transacao } from './consts/esquemas'
import { LancamentoProvider } from './LancamentoProvider'
import { TelaLancamentos } from './TelaLancamentos'

const base: Transacao = {
  id: 1,
  tipo: 'despesa',
  valor: '10.00',
  data: '2026-09-15',
  descricao: '',
  conta: 1,
  conta_nome: 'Corrente',
  conta_destino: null,
  conta_destino_nome: null,
  categoria: 7,
  categoria_nome: 'Mercado',
  categoria_cor: 'laranja',
  categoria_icone: 'carrinho',
  compra: null,
  numero_parcela: null,
  fatura_paga: null,
  recorrencia: null,
  competencia: null,
}

const lancamento = (campos: Partial<Transacao>): Transacao => {
  return { ...base, ...campos }
}

const SETEMBRO = [
  lancamento({ id: 5, data: '2026-09-15', descricao: 'Feira', valor: '84.30' }),
  lancamento({
    id: 4,
    data: '2026-09-15',
    tipo: 'receita',
    categoria_nome: 'Salário',
    valor: '6200.00',
  }),
  lancamento({
    id: 3,
    data: '2026-09-11',
    tipo: 'transferencia',
    categoria: null,
    categoria_nome: null,
    categoria_cor: null,
    categoria_icone: null,
    conta_destino: 2,
    conta_destino_nome: 'Investimentos',
    valor: '500.00',
  }),
  lancamento({
    id: 2,
    data: '2026-09-05',
    descricao: 'Celular',
    conta_nome: 'Nubank',
    compra: 9,
    numero_parcela: 3,
  }),
]

const CONTAS = [
  contaDeTeste({ id: 1, nome: 'Corrente', tipo: 'corrente' }),
  contaDeTeste({ id: 2, nome: 'Investimentos', tipo: 'investimento' }),
]
const CATEGORIAS = [{ id: 7, nome: 'Mercado', natureza: 'despesa', tipo: 'variavel' }]

const json = (corpo: unknown) => {
  return new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const pagina = (results: Transacao[], next: string | null = null) => {
  return { count: results.length, next, previous: null, results }
}

const fetchFalso = vi.fn<typeof fetch>()

type Paginas = Record<string, ReturnType<typeof pagina>>

/** Responde contas, categorias e as páginas de transações (a chave é o número da página). */
const servir = (paginas: Paginas = { '1': pagina(SETEMBRO) }) => {
  fetchFalso.mockImplementation(async (entrada) => {
    const url = new URL(String(entrada))
    if (url.pathname.endsWith('/contas/')) {
      return json(CONTAS)
    }
    if (url.pathname.endsWith('/categorias/')) {
      return json(CATEGORIAS)
    }
    return json(paginas[url.searchParams.get('page') ?? '1'] ?? pagina([]))
  })
}

const pedidosDeTransacoes = (): URL[] => {
  return fetchFalso.mock.calls
    .map(([entrada]) => {
      return new URL(String(entrada))
    })
    .filter((url) => {
      return url.pathname.endsWith('/transacoes/')
    })
}

const abrir = (caminho = '/lancamentos?mes=2026-09') => {
  const clienteQuery = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const roteador = createMemoryRouter([{ path: '/lancamentos', element: <TelaLancamentos /> }], {
    initialEntries: [caminho],
  })
  render(
    <QueryClientProvider client={clienteQuery}>
      <LancamentoProvider>
        <RouterProvider router={roteador} />
      </LancamentoProvider>
    </QueryClientProvider>,
  )
  return roteador
}

// Observador falso: o teste decide quando o fim da lista "aparece" na tela
let avisarQueApareceu: (() => void) | null = null
class ObservadorDeTeste {
  constructor(aviso: (entradas: { isIntersecting: boolean }[]) => void) {
    avisarQueApareceu = () => {
      aviso([{ isIntersecting: true }])
    }
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  vi.stubGlobal('IntersectionObserver', ObservadorDeTeste)
  fetchFalso.mockReset()
  avisarQueApareceu = null
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TelaLancamentos', () => {
  it('agrupa por dia, mais recente primeiro', async () => {
    servir()
    abrir()
    await screen.findByText('Feira')
    const dias = screen.getAllByRole('heading', { level: 2 }).map((titulo) => {
      return titulo.textContent
    })
    expect(dias).toEqual([
      'Terça-feira, 15 de setembro',
      'Sexta-feira, 11 de setembro',
      'Sábado, 5 de setembro',
    ])
  })

  it('cada linha diz o que é, de onde e quanto', async () => {
    servir()
    abrir()
    const feira = (await screen.findByText('Feira')).closest('li')
    expect(feira).toHaveTextContent('Mercado · Corrente')
    expect(feira).toHaveTextContent('−R$ 84,30')

    const salario = screen.getByText('Salário').closest('li')
    expect(salario).toHaveTextContent('+R$ 6.200,00')

    const transferencia = screen.getByText('Transferência').closest('li')
    expect(transferencia).toHaveTextContent('Corrente → Investimentos')

    const parcela = screen.getByText('Celular').closest('li')
    expect(parcela).toHaveTextContent('Mercado · Nubank · parcela 3')
  })

  it('pede o mês da URL', async () => {
    servir()
    abrir('/lancamentos?mes=2026-09')
    await screen.findByText('Feira')
    expect(pedidosDeTransacoes()[0]?.searchParams.get('mes')).toBe('2026-09')
  })

  it('carrega a próxima página quando o fim da lista aparece', async () => {
    servir({
      '1': pagina(SETEMBRO, 'http://api.teste/api/transacoes/?mes=2026-09&page=2'),
      '2': pagina([lancamento({ id: 1, data: '2026-09-01', descricao: 'Padaria' })]),
    })
    abrir()
    await screen.findByText('Feira')
    expect(screen.queryByText('Padaria')).not.toBeInTheDocument()

    avisarQueApareceu?.()

    expect(await screen.findByText('Padaria')).toBeInTheDocument()
    expect(pedidosDeTransacoes().at(-1)?.searchParams.get('page')).toBe('2')
  })

  it('filtrar por conta vai para a URL e para o pedido', async () => {
    servir()
    const roteador = abrir()
    await screen.findByText('Feira')

    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText('Filtrar por conta'), 'Investimentos')

    expect(new URLSearchParams(roteador.state.location.search).get('conta')).toBe('2')
    await vi.waitFor(() => {
      expect(pedidosDeTransacoes().at(-1)?.searchParams.get('conta')).toBe('2')
    })
  })

  it('sem resultado com filtro, oferece limpar os filtros', async () => {
    servir({ '1': pagina([]) })
    const roteador = abrir('/lancamentos?mes=2026-09&conta=2&categoria=7')

    const vazio = await screen.findByText('Nenhum lançamento com estes filtros em setembro.')
    await userEvent
      .setup()
      .click(within(vazio.parentElement!).getByRole('button', { name: 'Limpar filtros' }))

    const busca = new URLSearchParams(roteador.state.location.search)
    expect(busca.get('conta')).toBeNull()
    expect(busca.get('categoria')).toBeNull()
    expect(busca.get('mes')).toBe('2026-09')
  })

  it('tocar numa linha abre a folha de edição preenchida', async () => {
    servir()
    abrir()
    await userEvent.setup().click(await screen.findByRole('button', { name: /Feira/ }))

    const folha = await screen.findByRole('dialog', { name: 'Editar lançamento' })
    expect(within(folha).getByLabelText('Valor')).toHaveValue('R$ 84,30')
    expect(within(folha).getByLabelText('Descrição')).toHaveValue('Feira')
    expect(within(folha).getByRole('radio', { name: 'Despesa' })).toBeChecked()
  })

  it('parcela abre só para leitura, explicando onde mudar', async () => {
    servir()
    abrir()
    await userEvent.setup().click(await screen.findByRole('button', { name: /Celular/ }))

    const folha = await screen.findByRole('dialog', { name: 'Lançamento' })
    expect(folha).toHaveTextContent('Esta é a parcela 3 de uma compra no cartão')
    expect(within(folha).queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  })

  it('mês vazio sem filtro só avisa', async () => {
    servir({ '1': pagina([]) })
    abrir()
    expect(await screen.findByText('Nenhum lançamento em setembro.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument()
  })
})
