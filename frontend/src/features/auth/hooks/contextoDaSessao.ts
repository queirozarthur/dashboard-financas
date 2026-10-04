import { createContext, useContext } from 'react'

export type EstadoDaSessao = 'carregando' | 'autenticado' | 'anonimo'

export type ValorDaSessao = {
  estado: EstadoDaSessao
  entrar: (usuario: string, senha: string) => Promise<void>
  sair: () => void
}

export const ContextoDaSessao = createContext<ValorDaSessao | null>(null)

export const useSessao = (): ValorDaSessao => {
  const valor = useContext(ContextoDaSessao)
  if (!valor) {
    throw new Error('useSessao precisa estar dentro de <SessaoProvider>')
  }
  return valor
}
