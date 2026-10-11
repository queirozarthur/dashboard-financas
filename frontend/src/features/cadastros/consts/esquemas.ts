import { z } from 'zod'

import { esquemaDinheiro } from '@/core/api'
import { esquemaCor, esquemaIcone } from '@/core/utils'

// /api/recorrencias/: lançamento mensal previsto; início e fim são meses ("2026-10")
export const esquemaRecorrencia = z.object({
  id: z.number(),
  descricao: z.string(),
  tipo: z.enum(['receita', 'despesa', 'transferencia']),
  valor: esquemaDinheiro,
  dia: z.number(),
  inicio: z.string(),
  fim: z.string().nullable(),
  conta: z.number(),
  conta_nome: z.string(),
  conta_destino: z.number().nullable(),
  conta_destino_nome: z.string().nullable(),
  categoria: z.number().nullable(),
  categoria_nome: z.string().nullable(),
  categoria_cor: esquemaCor.nullable(),
  categoria_icone: esquemaIcone.nullable(),
})

// /api/orcamentos/: limite mensal de uma categoria de despesa, de `inicio` em diante
export const esquemaOrcamento = z.object({
  id: z.number(),
  categoria: z.number(),
  categoria_nome: z.string(),
  categoria_cor: esquemaCor,
  categoria_icone: esquemaIcone,
  valor: esquemaDinheiro,
  inicio: z.string(),
})

export type Recorrencia = z.infer<typeof esquemaRecorrencia>
export type Orcamento = z.infer<typeof esquemaOrcamento>
