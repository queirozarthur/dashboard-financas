import { z } from 'zod'

import { esquemaDinheiro } from '@/core/api'
import { esquemaCor, esquemaIcone } from '@/core/utils'

const situacao = z.enum(['paga', 'pendente'])

// GET /api/cartoes/<id>/faturas/<AAAA-MM>/: a fatura que vence no mês, calculada no backend
export const esquemaFatura = z.object({
  cartao: z.number(),
  cartao_nome: z.string(),
  mes: z.string(),
  fechamento: z.string(),
  vencimento: z.string(),
  /** Pela data de hoje no servidor: a fatura já fechou e pode ser paga */
  fechada: z.boolean(),
  total: esquemaDinheiro,
  situacao,
  pagamento: z
    .object({
      id: z.number(),
      data: z.string(),
      conta: z.number(),
      conta_nome: z.string(),
      valor: esquemaDinheiro,
    })
    .nullable(),
  parcelas: z.array(
    z.object({
      id: z.number(),
      compra: z.number(),
      descricao: z.string(),
      categoria_nome: z.string(),
      categoria_cor: esquemaCor,
      categoria_icone: esquemaIcone,
      data_compra: z.string(),
      /** "3/12" */
      numero: z.string(),
      valor: esquemaDinheiro,
    }),
  ),
})

// GET /api/compras/<id>/: a compra com todas as parcelas e a situação de cada uma
export const esquemaCompra = z.object({
  id: z.number(),
  descricao: z.string(),
  valor_total: esquemaDinheiro,
  parcelas: z.number(),
  data_compra: z.string(),
  cartao: z.number(),
  cartao_nome: z.string(),
  categoria: z.number(),
  categoria_nome: z.string(),
  categoria_cor: esquemaCor,
  categoria_icone: esquemaIcone,
  parcelas_geradas: z.array(
    z.object({
      id: z.number(),
      numero: z.string(),
      valor: esquemaDinheiro,
      vencimento: z.string(),
      situacao,
      data_pagamento: z.string().nullable(),
    }),
  ),
})

export type Fatura = z.infer<typeof esquemaFatura>
export type ParcelaDaFatura = Fatura['parcelas'][number]
export type Compra = z.infer<typeof esquemaCompra>
export type ParcelaDaCompra = Compra['parcelas_geradas'][number]
