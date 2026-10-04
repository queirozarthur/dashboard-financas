import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { requisitar } from '@/core/api'

import { esquemaTransacao } from '../consts/esquemas'
import type { CorpoDoLancamento } from '../formulario'

/** Tudo que mostra dinheiro depende dos lançamentos: lista, dashboard, evolução e saldos. */
const useAtualizarTelas = () => {
  const clienteQuery = useQueryClient()
  return () => {
    return Promise.all(
      ['transacoes', 'dashboard', 'evolucao', 'contas'].map((chave) => {
        return clienteQuery.invalidateQueries({ queryKey: [chave] })
      }),
    )
  }
}

type Salvamento = {
  id: number | null
  corpo: CorpoDoLancamento
}

export const useSalvarLancamento = () => {
  const atualizarTelas = useAtualizarTelas()
  return useMutation({
    mutationFn: ({ id, corpo }: Salvamento) => {
      return id === null
        ? requisitar('/transacoes/', esquemaTransacao, { metodo: 'POST', corpo })
        : requisitar(`/transacoes/${id}/`, esquemaTransacao, { metodo: 'PATCH', corpo })
    },
    onSuccess: atualizarTelas,
  })
}

export const useApagarLancamento = () => {
  const atualizarTelas = useAtualizarTelas()
  return useMutation({
    mutationFn: (id: number) => {
      // 204 sem corpo
      return requisitar(`/transacoes/${id}/`, z.null(), { metodo: 'DELETE' })
    },
    onSuccess: atualizarTelas,
  })
}
