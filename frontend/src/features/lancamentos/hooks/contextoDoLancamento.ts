import { createContext, useContext } from 'react'

import type { Transacao } from '../consts/esquemas'

export type AbrirLancamento = {
  /** Abre a folha vazia, para um lançamento novo (o ＋ da barra) */
  abrirNovo: () => void
  /** Abre a folha com um lançamento existente (tocar numa linha da lista) */
  abrirEdicao: (transacao: Transacao) => void
}

export const ContextoDoLancamento = createContext<AbrirLancamento | null>(null)

export const useAbrirLancamento = (): AbrirLancamento => {
  const valor = useContext(ContextoDoLancamento)
  if (!valor) {
    throw new Error('useAbrirLancamento precisa estar dentro de <LancamentoProvider>')
  }
  return valor
}
