import { z } from 'zod'

import { esquemaCor, esquemaIcone } from '@/core/utils'

// Dinheiro chega como texto com duas casas ("1500.00", "-30.00"), nunca como número
const dinheiro = z.string().regex(/^-?\d+\.\d{2}$/)

const linhaDeOrcamento = z.object({
  limite: dinheiro,
  gasto: dinheiro,
  previsto: dinheiro,
  restante: dinheiro,
  // Percentual comprometido; null só no total, quando não há orçamento nenhum
  percentual: z.string().nullable(),
})

export const esquemaDashboard = z.object({
  mes: z.string(),
  receitas: dinheiro,
  despesas: dinheiro,
  resultado: dinheiro,
  saldo_total: dinheiro,
  gastos_por_categoria: z.array(
    z.object({
      categoria_id: z.number(),
      categoria: z.string(),
      tipo: z.enum(['fixo', 'variavel']),
      cor: esquemaCor,
      icone: esquemaIcone,
      total: dinheiro,
      percentual: z.string(),
    }),
  ),
  fixo_variavel: z.object({ fixo: dinheiro, variavel: dinheiro }),
  mes_anterior: z.object({
    mes: z.string(),
    receitas: dinheiro,
    despesas: dinheiro,
    resultado: dinheiro,
  }),
  variacao: z.object({ receitas: dinheiro, despesas: dinheiro, resultado: dinheiro }),
  previsto: z.object({ receitas: dinheiro, despesas: dinheiro, resultado_projetado: dinheiro }),
  orcamentos: z.object({
    categorias: z.array(
      linhaDeOrcamento.extend({
        categoria_id: z.number(),
        categoria: z.string(),
        cor: esquemaCor,
        icone: esquemaIcone,
      }),
    ),
    total: linhaDeOrcamento,
  }),
})

export const esquemaEvolucao = z.object({
  meses: z.array(
    z.object({ mes: z.string(), receitas: dinheiro, despesas: dinheiro, resultado: dinheiro }),
  ),
})

export type Dashboard = z.infer<typeof esquemaDashboard>
export type MesDaEvolucao = z.infer<typeof esquemaEvolucao>['meses'][number]
export type LinhaDeOrcamento = Dashboard['orcamentos']['categorias'][number]
