import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { deveFicarAberta, LARGURA_DA_ACAO } from '@/core/hooks'

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

  it('ao abrir, o nome aparece parado (sem animação)', () => {
    comRoteador(<SeletorDeMes />, '/?mes=2026-10')
    expect(screen.getByText('Outubro de 2026').className).not.toMatch(/animate-mes-/)
  })

  it('avançar: o nome antigo sai para a esquerda e o novo entra pela direita', async () => {
    comRoteador(<SeletorDeMes />, '/?mes=2026-10')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Próximo mês' }))

    const saindo = screen.getByText('Outubro de 2026')
    expect(saindo).toHaveClass('animate-mes-sair-avancar')
    expect(saindo).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Novembro de 2026')).toHaveClass('animate-mes-entrar-avancar')
  })

  it('voltar anima no sentido contrário', async () => {
    comRoteador(<SeletorDeMes />, '/?mes=2026-10')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mês anterior' }))

    expect(screen.getByText('Outubro de 2026')).toHaveClass('animate-mes-sair-voltar')
    expect(screen.getByText('Setembro de 2026')).toHaveClass('animate-mes-entrar-voltar')
  })

  it('mantém os outros parâmetros da URL ao trocar o mês', async () => {
    const roteador = comRoteador(<SeletorDeMes />, '/?mes=2026-10&conta=3')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(new URLSearchParams(roteador.state.location.search).get('conta')).toBe('3')
  })
})

describe('Linha com ação ao deslizar', () => {
  it('fica aberta só depois de passar da metade do botão', () => {
    expect(deveFicarAberta(-(LARGURA_DA_ACAO / 2))).toBe(true)
    expect(deveFicarAberta(-(LARGURA_DA_ACAO / 2) + 1)).toBe(false)
    expect(deveFicarAberta(0)).toBe(false)
  })

  it('tocar na linha faz a ação normal; o botão escondido não entra no teclado', async () => {
    const aoTocar = vi.fn()
    const apagar = vi.fn()
    comRoteador(
      <Grupo>
        <Linha
          acaoAoDeslizar={{ rotulo: 'Apagar', aoTocar: apagar }}
          aoTocar={aoTocar}
          rotulo="Feira"
        />
      </Grupo>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Feira' }))
    expect(aoTocar).toHaveBeenCalledOnce()
    expect(apagar).not.toHaveBeenCalled()

    // Escondido atrás da linha: fora do leitor de tela e da ordem do Tab até ser revelado
    const escondido = screen.getByText('Apagar')
    expect(escondido).toHaveAttribute('aria-hidden', 'true')
    expect(escondido).toHaveAttribute('tabindex', '-1')
  })
})
