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
  /** Total de parcelas da compra, para mostrar "3/10" */
  parcelas_da_compra: z.number().nullable(),
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

export type Transacao = z.infer<typeof esquemaTransacao>
export type PaginaDeTransacoes = z.infer<typeof esquemaPaginaDeTransacoes>

// GET /api/compras/simulacao/: as parcelas que a compra geraria, antes de salvar
export const esquemaSimulacao = z.object({
  parcelas: z.array(
    z.object({
      numero: z.string(),
      valor: dinheiro,
      vencimento: z.string(),
      fatura_paga: z.boolean(),
    }),
  ),
})

// Da compra criada, a folha só precisa saber que deu certo
export const esquemaCompraCriada = z.object({ id: z.number() })

export type Simulacao = z.infer<typeof esquemaSimulacao>
export type ParcelaSimulada = Simulacao['parcelas'][number]

// GET /api/recorrencias/previstas/?mes=: recorrências do mês ainda sem lançamento confirmado
export const esquemaPrevista = z.object({
  recorrencia: z.number(),
  descricao: z.string(),
  tipo: z.enum(['receita', 'despesa', 'transferencia']),
  valor: dinheiro,
  /** Data sugerida: o dia da recorrência naquele mês */
  data: z.string(),
  conta: z.number(),
  conta_nome: z.string(),
  conta_destino: z.number().nullable(),
  conta_destino_nome: z.string().nullable(),
  categoria: z.number().nullable(),
  categoria_nome: z.string().nullable(),
  categoria_cor: esquemaCor.nullable(),
  categoria_icone: esquemaIcone.nullable(),
})

export type Prevista = z.infer<typeof esquemaPrevista>
