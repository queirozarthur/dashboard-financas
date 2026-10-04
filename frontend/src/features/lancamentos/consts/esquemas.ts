import { z } from 'zod'

import { esquemaCor, esquemaIcone } from '@/core/utils'

const dinheiro = z.string().regex(/^-?\d+\.\d{2}$/)

export const esquemaTransacao = z.object({
  id: z.number(),
  tipo: z.enum(['receita', 'despesa', 'transferencia']),
  valor: dinheiro,
  data: z.string(),
  descricao: z.string(),
  conta: z.number(),
  conta_nome: z.string(),
  conta_destino: z.number().nullable(),
  conta_destino_nome: z.string().nullable(),
  categoria: z.number().nullable(),
  categoria_nome: z.string().nullable(),
  categoria_cor: esquemaCor.nullable(),
  categoria_icone: esquemaIcone.nullable(),
  compra: z.number().nullable(),
  numero_parcela: z.number().nullable(),
  fatura_paga: z.string().nullable(),
  recorrencia: z.number().nullable(),
  competencia: z.string().nullable(),
})

// Paginação do DRF: { count, next, previous, results }
export const esquemaPaginaDeTransacoes = z.object({
  count: z.number(),
  next: z.string().nullable(),
  results: z.array(esquemaTransacao),
})

export const esquemaContas = z.array(
  z.object({
    id: z.number(),
    nome: z.string(),
    tipo: z.enum(['corrente', 'dinheiro', 'investimento', 'cartao']),
    cor: esquemaCor,
    icone: esquemaIcone,
  }),
)

export const esquemaCategorias = z.array(
  z.object({
    id: z.number(),
    nome: z.string(),
    natureza: z.enum(['receita', 'despesa']),
    tipo: z.enum(['fixo', 'variavel']),
    cor: esquemaCor,
    icone: esquemaIcone,
  }),
)

export type Transacao = z.infer<typeof esquemaTransacao>
export type PaginaDeTransacoes = z.infer<typeof esquemaPaginaDeTransacoes>
export type Conta = z.infer<typeof esquemaContas>[number]
export type Categoria = z.infer<typeof esquemaCategorias>[number]
