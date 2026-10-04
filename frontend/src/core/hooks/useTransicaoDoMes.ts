import { useCallback, useState } from 'react'

import { mesmoMes, textoDoMes, type Mes } from '@/core/utils'

export type Direcao = 'avancar' | 'voltar'

type Transicao = {
  atual: Mes
  /** Mês que está saindo da tela durante a animação (null quando não há troca em andamento) */
  saindo: Mes | null
  /** null antes da primeira troca: o nome inicial aparece parado, sem animar ao abrir */
  direcao: Direcao | null
}

const depoisDe = (a: Mes, b: Mes): boolean => {
  return textoDoMes(a) > textoDoMes(b)
}

/** Guarda o mês anterior por um instante para o nome dele poder sair animado. */
export const useTransicaoDoMes = (mes: Mes) => {
  const [transicao, setTransicao] = useState<Transicao>({ atual: mes, saindo: null, direcao: null })

  // Ajuste durante a renderização (padrão da doc do React para "guardar o valor anterior"):
  // evita um quadro com o mês novo sem animação, que um useEffect causaria
  if (!mesmoMes(transicao.atual, mes)) {
    setTransicao({
      atual: mes,
      saindo: transicao.atual,
      direcao: depoisDe(mes, transicao.atual) ? 'avancar' : 'voltar',
    })
  }

  const terminarSaida = useCallback(() => {
    setTransicao((anterior) => {
      return { ...anterior, saindo: null }
    })
  }, [])

  return { ...transicao, terminarSaida }
}
