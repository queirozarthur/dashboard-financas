import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { requisitar } from '@/core/api'
import { textoDoMes, type Mes } from '@/core/utils'

import { esquemaDashboard } from '../consts/esquemas'

export const useDashboard = (mes: Mes) => {
  const texto = textoDoMes(mes)
  return useQuery({
    queryKey: ['dashboard', texto],
    queryFn: () => {
      return requisitar(`/dashboard/?mes=${texto}`, esquemaDashboard)
    },
    // Ao trocar de mês, o anterior fica na tela (apagado) até o novo chegar: nada pisca
    placeholderData: keepPreviousData,
  })
}
