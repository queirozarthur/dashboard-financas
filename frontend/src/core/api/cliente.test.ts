import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z, ZodError } from 'zod'

import { requisitar } from './cliente'
import { ErroDaApi, ErroDeSessao } from './erros'
import { aoEncerrarSessao, encerrarSessao, guardarTokens, obterRefresh } from './sessao'

const API = 'http://api.teste/api'

const json = (status: number, corpo: unknown): Response => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchFalso = vi.fn<typeof fetch>()

const chamada = (indice: number) => {
  const [url, init] = fetchFalso.mock.calls[indice] ?? []
  return { url: String(url), init, cabecalhos: new Headers(init?.headers) }
}

const ehRenovacao = (url: unknown): boolean => {
  return String(url).endsWith('/token/refresh/')
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
  encerrarSessao()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requisitar', () => {
  it('manda o access no cabeçalho Authorization', async () => {
    guardarTokens({ access: 'a1', refresh: 'r1' })
    fetchFalso.mockResolvedValueOnce(json(200, []))

    await requisitar('/contas/', z.array(z.unknown()))

    expect(chamada(0).url).toBe(`${API}/contas/`)
    expect(chamada(0).cabecalhos.get('Authorization')).toBe('Bearer a1')
  })

  it('em 401, renova o access e repete o pedido', async () => {
    guardarTokens({ access: 'vencido', refresh: 'r1' })
    fetchFalso
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, { access: 'a2', refresh: 'r2' }))
      .mockResolvedValueOnce(json(200, ['conta']))

    const contas = await requisitar('/contas/', z.array(z.string()))

    expect(contas).toEqual(['conta'])
    expect(chamada(1).url).toBe(`${API}/token/refresh/`)
    expect(chamada(1).init?.body).toBe(JSON.stringify({ refresh: 'r1' }))
    expect(chamada(2).cabecalhos.get('Authorization')).toBe('Bearer a2')
    // Rotação: o refresh novo substitui o antigo
    expect(obterRefresh()).toBe('r2')
  })

  it('vários 401 ao mesmo tempo fazem uma renovação só', async () => {
    guardarTokens({ access: 'vencido', refresh: 'r1' })
    let renovacoes = 0
    fetchFalso.mockImplementation(async (url, init) => {
      if (ehRenovacao(url)) {
        renovacoes += 1
        return json(200, { access: 'a2', refresh: 'r2' })
      }
      const autorizado = new Headers(init?.headers).get('Authorization') === 'Bearer a2'
      return autorizado ? json(200, 'ok') : json(401, {})
    })

    const respostas = await Promise.all([
      requisitar('/contas/', z.string()),
      requisitar('/categorias/', z.string()),
      requisitar('/dashboard/', z.string()),
    ])

    expect(respostas).toEqual(['ok', 'ok', 'ok'])
    expect(renovacoes).toBe(1)
  })

  it('refresh recusado encerra a sessão e lança ErroDeSessao', async () => {
    guardarTokens({ access: 'vencido', refresh: 'vencido' })
    const aoEncerrar = vi.fn()
    const cancelar = aoEncerrarSessao(aoEncerrar)
    fetchFalso.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}))

    await expect(requisitar('/contas/', z.unknown())).rejects.toBeInstanceOf(ErroDeSessao)

    expect(obterRefresh()).toBeNull()
    expect(aoEncerrar).toHaveBeenCalledOnce()
    cancelar()
  })

  it('sem refresh guardado não tenta renovar', async () => {
    fetchFalso.mockResolvedValueOnce(json(401, {}))

    await expect(requisitar('/contas/', z.unknown())).rejects.toBeInstanceOf(ErroDeSessao)

    expect(fetchFalso).toHaveBeenCalledOnce()
  })

  it('rota pública não manda token nem tenta renovar', async () => {
    guardarTokens({ access: 'a1', refresh: 'r1' })
    fetchFalso.mockResolvedValueOnce(json(401, { detail: 'Credenciais inválidas' }))

    const pedido = requisitar('/token/', z.unknown(), { metodo: 'POST', corpo: {}, publica: true })

    await expect(pedido).rejects.toMatchObject({ status: 401 })
    expect(fetchFalso).toHaveBeenCalledOnce()
    expect(chamada(0).cabecalhos.get('Authorization')).toBeNull()
  })

  it('erro da API traz o status e as mensagens do corpo', async () => {
    guardarTokens({ access: 'a1', refresh: 'r1' })
    fetchFalso.mockResolvedValueOnce(json(400, { valor: ['O valor precisa ser maior que zero.'] }))

    const erro = await requisitar('/transacoes/', z.unknown(), { metodo: 'POST', corpo: {} }).catch(
      (motivo: unknown) => motivo,
    )

    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro).toMatchObject({
      status: 400,
      dados: { valor: ['O valor precisa ser maior que zero.'] },
    })
  })

  it('resposta fora do formato esperado é recusada', async () => {
    guardarTokens({ access: 'a1', refresh: 'r1' })
    fetchFalso.mockResolvedValueOnce(json(200, { saldo: 1500 }))

    const pedido = requisitar('/contas/1/', z.object({ saldo: z.string() }))

    await expect(pedido).rejects.toBeInstanceOf(ZodError)
  })

  it('204 sem corpo devolve null', async () => {
    guardarTokens({ access: 'a1', refresh: 'r1' })
    fetchFalso.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(requisitar('/contas/1/', z.null(), { metodo: 'DELETE' })).resolves.toBeNull()
  })

  it('manda o corpo como JSON', async () => {
    guardarTokens({ access: 'a1', refresh: 'r1' })
    fetchFalso.mockResolvedValueOnce(json(201, {}))

    await requisitar('/contas/', z.unknown(), { metodo: 'POST', corpo: { nome: 'Nubank' } })

    expect(chamada(0).init?.method).toBe('POST')
    expect(chamada(0).init?.body).toBe('{"nome":"Nubank"}')
    expect(chamada(0).cabecalhos.get('Content-Type')).toBe('application/json')
  })
})
