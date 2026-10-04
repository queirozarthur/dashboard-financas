import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { esquemaCor, esquemaIcone } from '@/core/utils'

import { requisitar } from './cliente'

// Contas e categorias aparecem em várias telas (lançamentos, cadastros, cartão):
// por isso moram no core, e não dentro de uma feature

const dinheiro = z.string().regex(/^-?\d+\.\d{2}$/)

export const esquemaConta = z.object({
  id: z.number(),
  nome: z.string(),
  tipo: z.enum(['corrente', 'dinheiro', 'investimento', 'cartao']),
  saldo_inicial: dinheiro,
  dia_fechamento: z.number().nullable(),
  dia_vencimento: z.number().nullable(),
  cor: esquemaCor,
  icone: esquemaIcone,
  saldo: dinheiro,
})

export const esquemaCategoria = z.object({
  id: z.number(),
  nome: z.string(),
  natureza: z.enum(['receita', 'despesa']),
  tipo: z.enum(['fixo', 'variavel']),
  cor: esquemaCor,
  icone: esquemaIcone,
})

export type Conta = z.infer<typeof esquemaConta>
export type Categoria = z.infer<typeof esquemaCategoria>

// Mudam pouco: ficam 5 minutos em cache antes de buscar de novo
const CINCO_MINUTOS = 5 * 60 * 1000

export const useContas = () => {
  return useQuery({
    queryKey: ['contas'],
    queryFn: () => {
      return requisitar('/contas/', z.array(esquemaConta))
    },
    staleTime: CINCO_MINUTOS,
  })
}

export const useCategorias = () => {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => {
      return requisitar('/categorias/', z.array(esquemaCategoria))
    },
    staleTime: CINCO_MINUTOS,
  })
}

// Tudo que mostra dinheiro, nomes ou cores depende de lançamentos e cadastros
const CHAVES_DOS_DADOS = ['transacoes', 'dashboard', 'evolucao', 'contas', 'categorias']

/** Depois de salvar ou apagar qualquer coisa: as telas buscam de novo o que pode ter mudado. */
export const useAtualizarDados = () => {
  const clienteQuery = useQueryClient()
  return () => {
    return Promise.all(
      CHAVES_DOS_DADOS.map((chave) => {
        return clienteQuery.invalidateQueries({ queryKey: [chave] })
      }),
    )
  }
}
