import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { encerrarSessao, obterRefresh } from '@/core/api'
import { SessaoProvider } from '@/features/auth'

import { rotas } from './rotas'

const json = (status: number, corpo: unknown): Response => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchFalso = vi.fn<typeof fetch>()

const abrirApp = (caminho = '/') => {
  const clienteQuery = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const roteador = createMemoryRouter(rotas, { initialEntries: [caminho] })
  render(
    <QueryClientProvider client={clienteQuery}>
      <SessaoProvider>
        <RouterProvider router={roteador} />
      </SessaoProvider>
    </QueryClientProvider>,
  )
  return roteador
}

const preencherEEntrar = async (usuario: string, senha: string) => {
  const usuarioReal = userEvent.setup()
  await usuarioReal.type(screen.getByLabelText('Usuário'), usuario)
  await usuarioReal.type(screen.getByLabelText('Senha'), senha)
  await usuarioReal.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
  // Depois do login a tela Início busca dados; estes testes não tratam disso, então
  // qualquer pedido sem resposta combinada recebe "indisponível" na hora
  fetchFalso.mockImplementation(async () => {
    return json(503, { detail: 'indisponível nos testes de entrada' })
  })
  encerrarSessao()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('entrada no app', () => {
  it('sem sessão, uma rota protegida leva para Entrar', async () => {
    abrirApp('/')
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('login certo guarda o refresh e abre o Início', async () => {
    fetchFalso.mockResolvedValueOnce(json(200, { access: 'a1', refresh: 'r1' }))
    abrirApp('/entrar')

    await preencherEEntrar('ana', 'segredo')

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(obterRefresh()).toBe('r1')
    const [url, init] = fetchFalso.mock.calls[0] ?? []
    expect(String(url)).toBe('http://api.teste/api/token/')
    expect(init?.body).toBe(JSON.stringify({ username: 'ana', password: 'segredo' }))
  })

  it('depois de entrar, volta para a página que pediu login', async () => {
    fetchFalso.mockResolvedValueOnce(json(200, { access: 'a1', refresh: 'r1' }))
    const roteador = abrirApp('/qualquer-coisa')
    // Rota desconhecida vai para '/', que é protegida e manda para Entrar lembrando a origem
    await screen.findByRole('heading', { name: 'Entrar' })

    await preencherEEntrar('ana', 'segredo')

    await screen.findByRole('heading', { name: 'Início' })
    expect(roteador.state.location.pathname).toBe('/')
  })

  it('senha errada mostra a mensagem e continua em Entrar', async () => {
    fetchFalso.mockResolvedValueOnce(json(401, { detail: 'No active account' }))
    abrirApp('/entrar')

    await preencherEEntrar('ana', 'errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.')
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(obterRefresh()).toBeNull()
  })

  it('servidor fora do ar mostra mensagem de conexão', async () => {
    fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    abrirApp('/entrar')

    await preencherEEntrar('ana', 'segredo')

    expect(await screen.findByRole('alert')).toHaveTextContent('Confira se o servidor está ligado')
  })

  it('com refresh guardado, abre direto no Início', async () => {
    localStorage.setItem('financas.refresh', 'r1')
    fetchFalso.mockResolvedValueOnce(json(200, { access: 'a2', refresh: 'r2' }))

    abrirApp('/')

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument()
    expect(obterRefresh()).toBe('r2')
  })

  it('com refresh vencido, vai para Entrar e esquece o refresh', async () => {
    localStorage.setItem('financas.refresh', 'vencido')
    fetchFalso.mockResolvedValueOnce(json(401, { detail: 'Token is invalid' }))

    abrirApp('/')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(obterRefresh()).toBeNull()
  })

  it('sair volta para Entrar e apaga o refresh', async () => {
    fetchFalso.mockResolvedValueOnce(json(200, { access: 'a1', refresh: 'r1' }))
    abrirApp('/entrar')
    await preencherEEntrar('ana', 'segredo')
    await screen.findByRole('heading', { name: 'Início' })

    const usuarioReal = userEvent.setup()
    await usuarioReal.click(screen.getByRole('link', { name: 'Mais' }))
    await usuarioReal.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(obterRefresh()).toBeNull()
  })
})
