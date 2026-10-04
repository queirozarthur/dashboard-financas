import { describe, expect, it } from 'vitest'

import { detalheDoLancamento, tituloDoLancamento } from './apresentacao'
import type { Transacao } from './consts/esquemas'

const base: Transacao = {
  id: 1,
  tipo: 'despesa',
  valor: '10.00',
  data: '2026-09-15',
  descricao: '',
  conta: 1,
  conta_nome: 'Corrente',
  conta_destino: null,
  conta_destino_nome: null,
  categoria: 7,
  categoria_nome: 'Mercado',
  categoria_cor: 'laranja',
  categoria_icone: 'carrinho',
  compra: null,
  numero_parcela: null,
  fatura_paga: null,
  recorrencia: null,
  competencia: null,
}

const pagamentoDeFatura: Transacao = {
  ...base,
  tipo: 'transferencia',
  categoria: null,
  categoria_nome: null,
  categoria_cor: null,
  categoria_icone: null,
  conta_destino: 4,
  conta_destino_nome: 'Nubank',
  fatura_paga: '2026-10-05',
}

describe('tituloDoLancamento', () => {
  it('descrição vem primeiro', () => {
    expect(tituloDoLancamento({ ...base, descricao: 'Feira' })).toBe('Feira')
  })

  it('sem descrição, usa a categoria', () => {
    expect(tituloDoLancamento(base)).toBe('Mercado')
  })

  it('pagamento de fatura se apresenta como tal', () => {
    expect(tituloDoLancamento(pagamentoDeFatura)).toBe('Pagamento de fatura')
  })
})

describe('detalheDoLancamento', () => {
  it('transferência mostra de onde para onde', () => {
    expect(detalheDoLancamento(pagamentoDeFatura)).toBe('Corrente → Nubank')
  })

  it('parcela ganha o número', () => {
    expect(detalheDoLancamento({ ...base, numero_parcela: 3 })).toBe(
      'Mercado · Corrente · parcela 3',
    )
  })
})
