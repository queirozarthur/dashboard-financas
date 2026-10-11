import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { requisitar } from '@/core/api'

import { esquemaRecorrencia } from '../consts/esquemas'

export const useRecorrencias = () => {
  return useQuery({
    queryKey: ['recorrencias'],
    queryFn: () => {
      return requisitar('/recorrencias/', z.array(esquemaRecorrencia))
    },
  })
}
