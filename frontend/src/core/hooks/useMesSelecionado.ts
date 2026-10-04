import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { lerMes, mesDe, somarMeses, textoDoMes, type Mes } from '@/core/utils'

/**
 * O mês escolhido mora na URL (?mes=2026-10): recarregar ou voltar mantém o mês, e o link
 * pode ser compartilhado. Sem o parâmetro (ou com um inválido), vale o mês atual.
 */
const obterMesAtual = (): Mes => {
  return mesDe(new Date())
}

export const useMesSelecionado = () => {
  const [parametros, setParametros] = useSearchParams()
  // Lido uma vez ao montar: a renderização precisa ser pura, e "agora" muda a cada chamada
  const [mesAtual] = useState(obterMesAtual)

  const mes = useMemo(() => {
    return lerMes(parametros.get('mes')) ?? mesAtual
  }, [parametros, mesAtual])

  const irPara = useCallback(
    (novo: Mes) => {
      setParametros(
        (atuais) => {
          const proximos = new URLSearchParams(atuais)
          proximos.set('mes', textoDoMes(novo))
          return proximos
        },
        // Trocar de mês não empilha histórico: o "voltar" sai da tela, não percorre os meses
        { replace: true },
      )
    },
    [setParametros],
  )

  const anterior = useCallback(() => {
    irPara(somarMeses(mes, -1))
  }, [irPara, mes])

  const proximo = useCallback(() => {
    irPara(somarMeses(mes, 1))
  }, [irPara, mes])

  return { mes, irPara, anterior, proximo }
}
