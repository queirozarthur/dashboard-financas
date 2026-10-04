import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dashboard } from './consts/esquemas'
import { TelaDashboard } from './TelaDashboard'

const OUTUBRO: Dashboard = {
  mes: '2026-10',
  receitas: '6200.00',
  despesas: '2150.40',
  resultado: '4049.60',
  saldo_total: '15320.10',
  gastos_por_categoria: [],
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

const json = (corpo: unknown, status = 200) => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchFalso = vi.fn<typeof fetch>()

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
  it('pede a dashboard do mês da URL', async () => {
    fetchFalso.mockResolvedValue(json(OUTUBRO))
    abrir('/?mes=2026-10')
    await screen.findByText('Resultado de outubro')
    expect(String(fetchFalso.mock.calls[0]?.[0])).toBe(
      'http://api.teste/api/dashboard/?mes=2026-10',
    )
  })

  it('mostra resultado, saldo e projeção no destaque', async () => {
    fetchFalso.mockResolvedValue(json(OUTUBRO))
    abrir()
    const destaque = await screen.findByRole('region', { name: 'Resultado do mês' })
    expect(destaque).toHaveTextContent('R$ 4.049,60')
    expect(destaque).toHaveTextContent(`${'R$ 300,00'} a mais que em setembro`)
    expect(destaque).toHaveTextContent('R$ 15.320,10')
    expect(destaque).toHaveTextContent('R$ 2.129,70')
  })

  it('compara receitas e despesas com o mês anterior', async () => {
    fetchFalso.mockResolvedValue(json(OUTUBRO))
    abrir()
    expect(await screen.findByText('Igual a setembro')).toBeInTheDocument()
    expect(screen.getByText(`${'R$ 300,00'} a menos que em setembro`)).toBeInTheDocument()
  })

  it('mostra o que ainda está previsto, só com o que tem valor', async () => {
    fetchFalso.mockResolvedValue(json(OUTUBRO))
    abrir()
    const previsto = (await screen.findByRole('heading', { name: 'Ainda previsto em outubro' }))
      .parentElement
    expect(previsto).not.toBeNull()
    expect(within(previsto!).getByText('A pagar')).toBeInTheDocument()
    expect(within(previsto!).queryByText('A receber')).not.toBeInTheDocument()
  })

  it('orçamento estourado avisa com texto, não só com cor', async () => {
    fetchFalso.mockResolvedValue(json(OUTUBRO))
    abrir()
    expect(await screen.findByText(`Passou ${'R$ 30,00'}`)).toBeInTheDocument()
    expect(screen.getByText(`Restam ${'R$ 280,00'}`)).toBeInTheDocument()
    expect(
      screen.getByText(`No total, restam ${'R$ 250,00'} de ${'R$ 1.350,00'}.`),
    ).toBeInTheDocument()
  })

  it('mês sem nada lançado mostra um aviso no lugar dos blocos', async () => {
    fetchFalso.mockResolvedValue(json(VAZIO))
    abrir()
    expect(await screen.findByText('Nada lançado em outubro ainda.')).toBeInTheDocument()
    expect(screen.queryByText('Entradas e saídas')).not.toBeInTheDocument()
  })

  it('erro mostra o aviso e "Tentar de novo" busca outra vez', async () => {
    fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fetchFalso.mockResolvedValue(json(OUTUBRO))
    abrir()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('Resultado de outubro')).toBeInTheDocument()
  })

  it('trocar de mês busca o mês novo', async () => {
    fetchFalso.mockResolvedValue(json(OUTUBRO))
    abrir()
    await screen.findByText('Resultado de outubro')
    fetchFalso.mockResolvedValue(
      json({
        ...OUTUBRO,
        mes: '2026-11',
        mes_anterior: { ...OUTUBRO.mes_anterior, mes: '2026-10' },
      }),
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Próximo mês' }))

    expect(await screen.findByText('Resultado de novembro')).toBeInTheDocument()
    expect(String(fetchFalso.mock.lastCall?.[0])).toContain('mes=2026-11')
  })

  it('resposta fora do formato vira erro, não tela quebrada', async () => {
    fetchFalso.mockResolvedValue(json({ ...OUTUBRO, receitas: 6200 }))
    abrir()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
  })
})
