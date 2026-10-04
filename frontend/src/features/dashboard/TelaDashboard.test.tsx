import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dashboard, MesDaEvolucao } from './consts/esquemas'
import { TelaDashboard } from './TelaDashboard'

const OUTUBRO: Dashboard = {
  mes: '2026-10',
  receitas: '6200.00',
  despesas: '2150.40',
  resultado: '4049.60',
  saldo_total: '15320.10',
  gastos_por_categoria: [
    { categoria_id: 3, categoria: 'Moradia', tipo: 'fixo', total: '1800.00', percentual: '83.7' },
    {
      categoria_id: 2,
      categoria: 'Mercado',
      tipo: 'variavel',
      total: '350.40',
      percentual: '16.3',
    },
  ],
  fixo_variavel: { fixo: '1800.00', variavel: '350.40' },
  mes_anterior: { mes: '2026-09', receitas: '6200.00', despesas: '2450.40', resultado: '3749.60' },
  variacao: { receitas: '0.00', despesas: '-300.00', resultado: '300.00' },
  previsto: { receitas: '0.00', despesas: '1919.90', resultado_projetado: '2129.70' },
  orcamentos: {
    categorias: [
      {
        categoria_id: 1,
        categoria: 'Lazer',
        limite: '450.00',
        gasto: '480.00',
        previsto: '0.00',
        restante: '-30.00',
        percentual: '106.7',
      },
      {
        categoria_id: 2,
        categoria: 'Mercado',
        limite: '900.00',
        gasto: '620.00',
        previsto: '0.00',
        restante: '280.00',
        percentual: '68.9',
      },
    ],
    total: {
      limite: '1350.00',
      gasto: '1100.00',
      previsto: '0.00',
      restante: '250.00',
      percentual: '81.5',
    },
  },
}

const VAZIO: Dashboard = {
  ...OUTUBRO,
  receitas: '0.00',
  despesas: '0.00',
  resultado: '0.00',
  previsto: { receitas: '0.00', despesas: '0.00', resultado_projetado: '0.00' },
  orcamentos: { categorias: [], total: { ...OUTUBRO.orcamentos.total, percentual: null } },
}

const mesDaEvolucao = (mes: string, receitas: string, despesas: string): MesDaEvolucao => {
  return { mes, receitas, despesas, resultado: '0.00' }
}

const EVOLUCAO = {
  meses: [
    mesDaEvolucao('2026-05', '6200.00', '2400.00'),
    mesDaEvolucao('2026-06', '6200.00', '2600.00'),
    mesDaEvolucao('2026-07', '6950.00', '2300.00'),
    mesDaEvolucao('2026-08', '6200.00', '2900.00'),
    mesDaEvolucao('2026-09', '6200.00', '2450.40'),
    mesDaEvolucao('2026-10', '6200.00', '2150.40'),
  ],
}

const json = (corpo: unknown, status = 200) => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchFalso = vi.fn<typeof fetch>()

/** Servidor falso: responde a dashboard e a evolução, cada uma pela sua URL. */
const servir = ({ dashboard = OUTUBRO as unknown, evolucao = EVOLUCAO as unknown } = {}) => {
  fetchFalso.mockImplementation(async (url) => {
    return json(String(url).includes('/evolucao/') ? evolucao : dashboard)
  })
}

const urlsPedidas = (): string[] => {
  return fetchFalso.mock.calls.map(([url]) => {
    return String(url)
  })
}

const abrir = (caminho = '/?mes=2026-10') => {
  const clienteQuery = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const roteador = createMemoryRouter([{ path: '/', element: <TelaDashboard /> }], {
    initialEntries: [caminho],
  })
  render(
    <QueryClientProvider client={clienteQuery}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Valores em R$ aqui usam espaço comum: o Testing Library troca o espaço não separável
// que o Intl põe depois do "R$" (U+00A0) por um espaço comum antes de comparar
describe('TelaDashboard', () => {
  it('pede a dashboard e a evolução do mês da URL', async () => {
    servir()
    abrir('/?mes=2026-10')
    await screen.findByText('Resultado de outubro')
    await screen.findByText(/Receitas e despesas de/)
    expect(urlsPedidas()).toEqual([
      'http://api.teste/api/dashboard/?mes=2026-10',
      'http://api.teste/api/dashboard/evolucao/?mes=2026-10&meses=6',
    ])
  })

  it('ordem: resultado, gráficos e depois as listas', async () => {
    servir()
    abrir()
    await screen.findByRole('table')
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((titulo) => {
      return titulo.textContent
    })
    expect(titulos).toEqual([
      'Resultado de outubro',
      'Últimos 6 meses',
      'Fixo e variável',
      'Gastos por categoria',
      'Entradas e saídas',
      'Ainda previsto em outubro',
      'Orçamentos',
    ])
  })

  it('mês vazio ainda mostra a evolução dos meses anteriores', async () => {
    servir({ dashboard: VAZIO })
    abrir()
    await screen.findByText('Nada lançado em outubro ainda.')
    expect(await screen.findByRole('heading', { name: 'Últimos 6 meses' })).toBeInTheDocument()
  })

  it('mostra resultado, saldo e projeção no destaque', async () => {
    servir()
    abrir()
    const destaque = await screen.findByRole('region', { name: 'Resultado do mês' })
    expect(destaque).toHaveTextContent('R$ 4.049,60')
    expect(destaque).toHaveTextContent('R$ 300,00 a mais que em setembro')
    expect(destaque).toHaveTextContent('R$ 15.320,10')
    expect(destaque).toHaveTextContent('R$ 2.129,70')
  })

  it('compara receitas e despesas com o mês anterior', async () => {
    servir()
    abrir()
    expect(await screen.findByText('Igual a setembro')).toBeInTheDocument()
    expect(screen.getByText('R$ 300,00 a menos que em setembro')).toBeInTheDocument()
  })

  it('mostra o que ainda está previsto, só com o que tem valor', async () => {
    servir()
    abrir()
    const previsto = (await screen.findByRole('heading', { name: 'Ainda previsto em outubro' }))
      .parentElement
    expect(previsto).not.toBeNull()
    expect(within(previsto!).getByText('A pagar')).toBeInTheDocument()
    expect(within(previsto!).queryByText('A receber')).not.toBeInTheDocument()
  })

  it('orçamento estourado avisa com texto, não só com cor', async () => {
    servir()
    abrir()
    expect(await screen.findByText('Passou R$ 30,00')).toBeInTheDocument()
    expect(screen.getByText('Restam R$ 280,00')).toBeInTheDocument()
    expect(screen.getByText('No total, restam R$ 250,00 de R$ 1.350,00.')).toBeInTheDocument()
  })

  it('mostra fixo e variável com a legenda e os valores', async () => {
    servir()
    abrir()
    const bloco = await screen.findByRole('region', { name: 'Despesas fixas e variáveis' })
    expect(within(bloco).getByText('Fixo').nextElementSibling).toHaveTextContent('R$ 1.800,00')
    expect(within(bloco).getByText('Variável').nextElementSibling).toHaveTextContent('R$ 350,40')
  })

  it('lista os gastos por categoria com valor e percentual', async () => {
    servir()
    abrir()
    const titulo = await screen.findByRole('heading', { name: 'Gastos por categoria' })
    const grupo = titulo.parentElement
    expect(grupo).not.toBeNull()
    expect(within(grupo!).getByText('Moradia')).toBeInTheDocument()
    expect(within(grupo!).getByText('83,7%')).toBeInTheDocument()
    expect(within(grupo!).getByText('16,3%')).toBeInTheDocument()
  })

  it('a evolução tem uma tabela para leitores de tela com os 6 meses', async () => {
    servir()
    abrir()
    const tabela = await screen.findByRole('table', {
      name: 'Receitas e despesas de Maio de 2026 a Outubro de 2026',
    })
    expect(within(tabela).getAllByRole('row')).toHaveLength(7)
    expect(
      within(tabela).getByRole('rowheader', { name: 'Julho de 2026' }).parentElement,
    ).toHaveTextContent('R$ 6.950,00')
  })

  it('se só a evolução falhar, o resto do mês continua na tela', async () => {
    servir({ evolucao: { meses: 'quebrado' } })
    abrir()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os últimos meses',
    )
    expect(screen.getByText('Resultado de outubro')).toBeInTheDocument()
  })

  it('mês sem nada lançado mostra um aviso no lugar dos blocos', async () => {
    servir({ dashboard: VAZIO })
    abrir()
    expect(await screen.findByText('Nada lançado em outubro ainda.')).toBeInTheDocument()
    expect(screen.queryByText('Entradas e saídas')).not.toBeInTheDocument()
    expect(screen.queryByText('Gastos por categoria')).not.toBeInTheDocument()
  })

  it('erro mostra o aviso e "Tentar de novo" busca outra vez', async () => {
    servir()
    fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    abrir()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('Resultado de outubro')).toBeInTheDocument()
  })

  it('trocar de mês busca o mês novo e a evolução terminando nele', async () => {
    servir()
    abrir()
    await screen.findByText('Resultado de outubro')
    servir({
      dashboard: {
        ...OUTUBRO,
        mes: '2026-11',
        mes_anterior: { ...OUTUBRO.mes_anterior, mes: '2026-10' },
      },
    })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Próximo mês' }))

    expect(await screen.findByText('Resultado de novembro')).toBeInTheDocument()
    expect(urlsPedidas()).toContain('http://api.teste/api/dashboard/?mes=2026-11')
    expect(urlsPedidas()).toContain('http://api.teste/api/dashboard/evolucao/?mes=2026-11&meses=6')
  })

  it('resposta fora do formato vira erro, não tela quebrada', async () => {
    servir({ dashboard: { ...OUTUBRO, receitas: 6200 } })
    abrir()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
  })
})
