import type { FC, FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { z } from 'zod'

import { Botao } from '@/core/ui'

import { LinhaDeCampo } from './components/LinhaDeCampo'
import { useSessao } from './hooks/contextoDaSessao'
import { useEntrar } from './hooks/useEntrar'

// O state da navegação chega sem tipo; só aceita um caminho interno de volta
const esquemaOrigem = z.object({ de: z.string().startsWith('/') })

const destinoDepoisDeEntrar = (state: unknown): string => {
  const origem = esquemaOrigem.safeParse(state)
  return origem.success ? origem.data.de : '/'
}

export const TelaEntrar: FC = () => {
  const { estado } = useSessao()
  const { entrar, enviando, erro } = useEntrar()
  const local = useLocation()

  if (estado === 'autenticado') {
    return <Navigate replace to={destinoDepoisDeEntrar(local.state)} />
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const campos = new FormData(evento.currentTarget)
    entrar({
      usuario: String(campos.get('usuario') ?? ''),
      senha: String(campos.get('senha') ?? ''),
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 pb-16">
      <h1 className="px-4 text-titulo-grande font-bold tracking-tight">Entrar</h1>
      <p className="mt-1 px-4 text-conteudo-secundario">Suas finanças, num lugar só.</p>

      <form className="mt-8" onSubmit={enviar}>
        <div className="divide-y divide-separador overflow-hidden rounded-xl bg-superficie">
          <LinhaDeCampo
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect="off"
            name="usuario"
            placeholder="obrigatório"
            required
            rotulo="Usuário"
          />
          <LinhaDeCampo
            autoComplete="current-password"
            name="senha"
            placeholder="obrigatória"
            required
            rotulo="Senha"
            type="password"
          />
        </div>

        {erro ? (
          <p className="mt-3 px-4 text-sm text-despesa" role="alert">
            {erro}
          </p>
        ) : null}

        <Botao carregando={enviando} className="mt-6" largura="total" type="submit">
          Entrar
        </Botao>
      </form>
    </main>
  )
}
