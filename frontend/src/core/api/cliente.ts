import { z } from 'zod'

import { API_URL } from './config'
import { ErroDaApi, ErroDeSessao } from './erros'
import { encerrarSessao, guardarTokens, obterAccess, obterRefresh } from './sessao'

export const esquemaTokens = z.object({ access: z.string(), refresh: z.string() })

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type Opcoes = {
  metodo?: Metodo
  corpo?: unknown
  /** Rota sem login (como o próprio login): não manda token nem tenta renovar em 401 */
  publica?: boolean
}

let renovacaoEmAndamento: Promise<void> | null = null

const executarRenovacao = async (): Promise<void> => {
  const refresh = obterRefresh()
  if (!refresh) {
    encerrarSessao()
    throw new ErroDeSessao()
  }
  const resposta = await fetch(`${API_URL}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!resposta.ok) {
    encerrarSessao()
    throw new ErroDeSessao()
  }
  guardarTokens(esquemaTokens.parse(await resposta.json()))
}

/**
 * Renova o access usando o refresh. Pedidos que chegam durante uma renovação esperam a mesma:
 * com a rotação do backend cada refresh vale uma vez só, e uma segunda renovação seria recusada.
 */
export const renovarAccess = (): Promise<void> => {
  renovacaoEmAndamento ??= executarRenovacao().finally(() => {
    renovacaoEmAndamento = null
  })
  return renovacaoEmAndamento
}

const enviar = (caminho: string, { metodo = 'GET', corpo, publica = false }: Opcoes) => {
  const cabecalhos = new Headers({ Accept: 'application/json' })
  if (corpo !== undefined) {
    cabecalhos.set('Content-Type', 'application/json')
  }
  const access = obterAccess()
  if (!publica && access) {
    cabecalhos.set('Authorization', `Bearer ${access}`)
  }
  return fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
}

const lerCorpo = async (resposta: Response): Promise<unknown> => {
  if (resposta.status === 204) {
    return null
  }
  const tipo = resposta.headers.get('Content-Type') ?? ''
  return tipo.includes('application/json') ? resposta.json() : resposta.text()
}

/**
 * Chama a API e valida a resposta com `esquema` (o tipo do retorno vem dele).
 * Em 401, renova o access e repete o pedido uma vez; se não der para renovar, lança ErroDeSessao.
 */
export const requisitar = async <T>(
  caminho: string,
  esquema: z.ZodType<T>,
  opcoes: Opcoes = {},
): Promise<T> => {
  let resposta = await enviar(caminho, opcoes)
  if (resposta.status === 401 && !opcoes.publica) {
    await renovarAccess()
    resposta = await enviar(caminho, opcoes)
  }
  const dados = await lerCorpo(resposta)
  if (!resposta.ok) {
    throw new ErroDaApi(resposta.status, dados)
  }
  return esquema.parse(dados)
}
