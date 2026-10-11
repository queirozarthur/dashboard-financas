import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

import type { Conta } from '@/core/api'

/**
 * O cartão escolhido mora na URL (?cartao=4), junto com o mês: recarregar mantém a tela.
 * Sem o parâmetro, ou com um que não é cartão desta pessoa, vale o primeiro cartão.
 */
export const useCartaoSelecionado = (cartoes: readonly Conta[]) => {
  const [parametros, setParametros] = useSearchParams()
  const pedido = parametros.get('cartao')
  const cartao =
    cartoes.find((conta) => {
      return String(conta.id) === pedido
    }) ??
    cartoes[0] ??
    null

  const escolher = useCallback(
    (id: number) => {
      setParametros(
        (atuais) => {
          const proximos = new URLSearchParams(atuais)
          proximos.set('cartao', String(id))
          return proximos
        },
        // Como a troca de mês: não empilha histórico
        { replace: true },
      )
    },
    [setParametros],
  )

  return { cartao, escolher }
}
