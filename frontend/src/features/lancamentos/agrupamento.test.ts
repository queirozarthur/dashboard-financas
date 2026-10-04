import { describe, expect, it } from 'vitest'

import { agruparPorDia, tituloDoDia } from './agrupamento'
import type { Transacao } from './consts/esquemas'

const HOJE = new Date(2026, 9, 4) // domingo, 4 de outubro de 2026

const transacao = (id: number, data: string): Transacao => {
  return {
    id,
    tipo: 'despesa',
    valor: '10.00',
    data,
    descricao: '',
    conta: 1,
    conta_nome: 'Corrente',
    conta_destino: null,
    conta_destino_nome: null,
    categoria: 1,
    categoria_nome: 'Mercado',
    compra: null,
    numero_parcela: null,
    fatura_paga: null,
    recorrencia: null,
    competencia: null,
  }
}

describe('tituloDoDia', () => {
  it('hoje e ontem pelo nome', () => {
    expect(tituloDoDia('2026-10-04', HOJE)).toBe('Hoje')
    expect(tituloDoDia('2026-10-03', HOJE)).toBe('Ontem')
  })

  it('ontem atravessando o mês', () => {
    expect(tituloDoDia('2026-09-30', new Date(2026, 9, 1))).toBe('Ontem')
  })

  it('outros dias com dia da semana, sem o ano corrente', () => {
    expect(tituloDoDia('2026-10-02', HOJE)).toBe('Sexta-feira, 2 de outubro')
  })

  it('outro ano aparece', () => {
    expect(tituloDoDia('2025-12-31', HOJE)).toBe('Quarta-feira, 31 de dezembro de 2025')
  })
})

describe('agruparPorDia', () => {
  it('junta os do mesmo dia mantendo a ordem da API', () => {
    const dias = agruparPorDia(
      [transacao(5, '2026-10-04'), transacao(4, '2026-10-04'), transacao(3, '2026-10-02')],
      HOJE,
    )
    expect(dias.map((dia) => [dia.titulo, dia.transacoes.map((t) => t.id)])).toEqual([
      ['Hoje', [5, 4]],
      ['Sexta-feira, 2 de outubro', [3]],
    ])
  })

  it('lista vazia não tem dias', () => {
    expect(agruparPorDia([], HOJE)).toEqual([])
  })
})
