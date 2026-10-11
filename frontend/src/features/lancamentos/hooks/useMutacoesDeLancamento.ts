import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'

import { requisitar, useAtualizarDados } from '@/core/api'

import { esquemaCompraCriada, esquemaTransacao } from '../consts/esquemas'
import type { CorpoDaCompra, CorpoDoLancamento } from '../formulario'

type Salvamento = {
  id: number | null
  corpo: CorpoDoLancamento
}

export const useSalvarLancamento = () => {
  const atualizarDados = useAtualizarDados()
  return useMutation({
    mutationFn: ({ id, corpo }: Salvamento) => {
      return id === null
        ? requisitar('/transacoes/', esquemaTransacao, { metodo: 'POST', corpo })
        : requisitar(`/transacoes/${id}/`, esquemaTransacao, { metodo: 'PATCH', corpo })
    },
    onSuccess: atualizarDados,
  })
}

export const useApagarLancamento = () => {
  const atualizarDados = useAtualizarDados()
  return useMutation({
    mutationFn: (id: number) => {
      // 204 sem corpo
      return requisitar(`/transacoes/${id}/`, z.null(), { metodo: 'DELETE' })
    },
    onSuccess: atualizarDados,
  })
}

/** Compra no cartão: o backend cria a compra e as parcelas, cada uma na fatura certa. */
export const useSalvarCompra = () => {
  const atualizarDados = useAtualizarDados()
  return useMutation({
    mutationFn: (corpo: CorpoDaCompra) => {
      return requisitar('/compras/', esquemaCompraCriada, { metodo: 'POST', corpo })
    },
    onSuccess: atualizarDados,
  })
}
