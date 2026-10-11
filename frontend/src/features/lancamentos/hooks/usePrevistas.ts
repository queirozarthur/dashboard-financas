import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { requisitar } from '@/core/api'
import { textoDoMes, type Mes } from '@/core/utils'

import { esquemaPrevista } from '../consts/esquemas'

/** Recorrências do mês que ainda não viraram lançamento (calculadas pelo backend). */
export const usePrevistas = (mes: Mes) => {
  const texto = textoDoMes(mes)
  return useQuery({
    queryKey: ['previstas', texto],
    queryFn: () => {
      return requisitar(`/recorrencias/previstas/?mes=${texto}`, z.array(esquemaPrevista))
    },
    placeholderData: keepPreviousData,
  })
}
