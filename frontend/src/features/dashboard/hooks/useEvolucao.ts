import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { requisitar } from '@/core/api'
import { textoDoMes, type Mes } from '@/core/utils'

import { esquemaEvolucao } from '../consts/esquemas'

export const MESES_NA_EVOLUCAO = 6

/** Receitas e despesas dos 6 meses que terminam no mês escolhido. */
export const useEvolucao = (ultimoMes: Mes) => {
  const texto = textoDoMes(ultimoMes)
  return useQuery({
    queryKey: ['evolucao', texto, MESES_NA_EVOLUCAO],
    queryFn: () => {
      return requisitar(
        `/dashboard/evolucao/?mes=${texto}&meses=${MESES_NA_EVOLUCAO}`,
        esquemaEvolucao,
      )
    },
    placeholderData: keepPreviousData,
  })
}
