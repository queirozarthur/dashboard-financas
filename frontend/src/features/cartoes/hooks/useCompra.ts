import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { requisitar, useAtualizarDados } from '@/core/api'

import { esquemaCompra } from '../consts/esquemas'

/** A compra inteira, com todas as parcelas (a fatura mostra só a parcela daquele mês). */
export const useCompra = (id: number | null) => {
  return useQuery({
    queryKey: ['compras', id],
    queryFn:
      id === null
        ? skipToken
        : () => {
            return requisitar(`/compras/${id}/`, esquemaCompra)
          },
  })
}

/** Apaga a compra e todas as parcelas (o backend recusa se alguma estiver em fatura paga). */
export const useApagarCompra = () => {
  const atualizarDados = useAtualizarDados()
  return useMutation({
    mutationFn: (id: number) => {
      return requisitar(`/compras/${id}/`, z.null(), { metodo: 'DELETE' })
    },
    onSuccess: atualizarDados,
  })
}
