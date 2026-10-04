import { useQuery } from '@tanstack/react-query'

import { requisitar } from '@/core/api'

import { esquemaCategorias, esquemaContas } from '../consts/esquemas'

// Mudam pouco: ficam 5 minutos em cache antes de buscar de novo
const CINCO_MINUTOS = 5 * 60 * 1000

export const useContas = () => {
  return useQuery({
    queryKey: ['contas'],
    queryFn: () => {
      return requisitar('/contas/', esquemaContas)
    },
    staleTime: CINCO_MINUTOS,
  })
}

export const useCategorias = () => {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => {
      return requisitar('/categorias/', esquemaCategorias)
    },
    staleTime: CINCO_MINUTOS,
  })
}
