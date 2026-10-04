import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Grupo, Linha } from './ListaAgrupada'
import { SeletorDeMes } from './SeletorDeMes'
import { Valor } from './Valor'

const comRoteador = (elemento: ReactNode, caminho = '/') => {
  const roteador = createMemoryRouter([{ path: '*', element: elemento }], {
    initialEntries: [caminho],
  })
  render(<RouterProvider router={roteador} />)
  return roteador
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Valor', () => {
  it('receita em verde com "+"', () => {
    render(<Valor tom="receita" valor="5000.00" />)
    const valor = screen.getByText(/5\.000,00/)
    expect(valor.textContent).toMatch(/^\+R\$/)
    expect(valor).toHaveClass('text-receita', 'tabular-nums')
  })

  it('negativo sem tom vira alerta em vermelho', () => {
    render(<Valor valor="-30.00" />)
    expect(screen.getByText(/30,00/)).toHaveClass('text-despesa')
  })
})

describe('Lista agrupada', () => {
  it('linha com "para" vira link', () => {
    comRoteador(
      <Grupo titulo="Cadastros">
        <Linha para="/contas" rotulo="Contas" />
      </Grupo>,
    )
    expect(screen.getByRole('link', { name: 'Contas' })).toHaveAttribute('href', '/contas')
    expect(screen.getByRole('heading', { name: 'Cadastros' })).toBeInTheDocument()
  })

  it('linha com "aoTocar" vira botão', async () => {
    const aoTocar = vi.fn()
    comRoteador(
      <Grupo>
        <Linha aoTocar={aoTocar} rotulo="Sair" tom="perigo" />
      </Grupo>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }))
    expect(aoTocar).toHaveBeenCalledOnce()
  })
})

describe('SeletorDeMes', () => {
  it('mostra o mês da URL e avança atravessando o ano', async () => {
    const roteador = comRoteador(<SeletorDeMes />, '/?mes=2026-12')
    expect(screen.getByText('Dezembro de 2026')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Próximo mês' }))

    expect(screen.getByText('Janeiro de 2027')).toBeInTheDocument()
    expect(roteador.state.location.search).toBe('?mes=2027-01')
  })

  it('volta um mês', async () => {
    comRoteador(<SeletorDeMes />, '/?mes=2026-01')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(screen.getByText('Dezembro de 2025')).toBeInTheDocument()
  })

  it('sem mês na URL (ou com um inválido) usa o mês atual', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2027, 2, 15))
    comRoteador(<SeletorDeMes />, '/?mes=bagunca')
    expect(screen.getByText('Março de 2027')).toBeInTheDocument()
  })

  it('mantém os outros parâmetros da URL ao trocar o mês', async () => {
    const roteador = comRoteador(<SeletorDeMes />, '/?mes=2026-10&conta=3')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(new URLSearchParams(roteador.state.location.search).get('conta')).toBe('3')
  })
})
