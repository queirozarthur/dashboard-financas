import { lerMes } from '@/core/utils'

import type { MesDaEvolucao } from './consts/esquemas'

export type PontoDoGrafico = {
  rotulo: string
  /**
   * Número só para o Recharts calcular a altura da barra. É a única conversão de dinheiro
   * para número no app, e o resultado nunca é somado nem exibido: o texto mostrado ao
   * usuário sai sempre de `original`, que é o texto exato da API.
   */
  receitas: number
  despesas: number
  original: MesDaEvolucao
}

const formatoCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

/** "out" para 2026-10: o eixo de 6 meses não tem espaço para "outubro de 2026". */
export const rotuloCurto = (texto: string): string => {
  const mes = lerMes(texto)
  if (!mes) {
    return texto
  }
  return formatoCurto.format(new Date(mes.ano, mes.numero - 1, 1)).replace('.', '')
}

export const paraOGrafico = (meses: readonly MesDaEvolucao[]): PontoDoGrafico[] => {
  return meses.map((mes) => {
    return {
      rotulo: rotuloCurto(mes.mes),
      receitas: Number(mes.receitas),
      despesas: Number(mes.despesas),
      original: mes,
    }
  })
}

const formatoCompacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  // Uma casa: com zero, 1,5 milhão viraria "R$ 2 mi" e o eixo mentiria
  maximumFractionDigits: 1,
})

/** Marcas do eixo: "R$ 6 mil" em vez de "R$ 6.000,00". */
export const valorCompacto = (valor: number): string => {
  return formatoCompacto.format(valor)
}
