import { createContext, useContext } from 'react'

import type { Transacao } from '../consts/esquemas'
import type { Preenchimento } from '../formulario'

export type AbrirLancamento = {
  /**
   * Abre a folha para um lançamento novo (o ＋ da barra). `preenchimento` deixa algo já
   * escolhido: a tela do cartão abre uma despesa com o cartão como conta (uma compra).
   */
  abrirNovo: (preenchimento?: Preenchimento) => void
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
