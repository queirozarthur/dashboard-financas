import { describe, expect, it } from 'vitest'

import { contaDeTeste } from '@/testes/fabricas'

import type { Fatura, ParcelaDaFatura } from './consts/esquemas'
import { pagamentoVazio, validarPagamento } from './pagamento'
import {
  datasDaFatura,
  detalheDaParcela,
  numeroDaParcela,
  podePagar,
  situacaoDaFatura,
  situacaoDaParcela,
} from './situacao'

const GELADEIRA: ParcelaDaFatura = {
  id: 31,
  compra: 9,
  descricao: 'Geladeira',
  categoria_nome: 'Casa',
  categoria_cor: 'azul',
  categoria_icone: 'casa',
  data_compra: '2026-10-10',
  numero: '1/3',
  valor: '33.34',
}

const FATURA: Fatura = {
  cartao: 4,
  cartao_nome: 'Nubank',
  mes: '2026-11',
  fechamento: '2026-10-25',
  vencimento: '2026-11-05',
  fechada: true,
  total: '33.34',
  situacao: 'pendente',
  pagamento: null,
  parcelas: [GELADEIRA],
}

describe('situacaoDaFatura', () => {
  it('ainda não fechou: aberta, sem pagar', () => {
    const situacao = situacaoDaFatura({ ...FATURA, fechada: false }, '2026-10-20')
    expect(situacao).toBe('aberta')
    expect(podePagar(situacao)).toBe(false)
  })

  it('fechou e não venceu: fechada, pronta para pagar', () => {
    const situacao = situacaoDaFatura(FATURA, '2026-11-05')
    expect(situacao).toBe('fechada')
    expect(podePagar(situacao)).toBe(true)
  })

  it('passou do vencimento sem pagar: vencida (ainda dá para pagar)', () => {
    const situacao = situacaoDaFatura(FATURA, '2026-11-06')
    expect(situacao).toBe('vencida')
    expect(podePagar(situacao)).toBe(true)
  })

  it('paga vale mais que as datas', () => {
    expect(situacaoDaFatura({ ...FATURA, situacao: 'paga' }, '2026-12-01')).toBe('paga')
  })

  it('sem parcelas não há o que pagar', () => {
    const situacao = situacaoDaFatura({ ...FATURA, parcelas: [], total: '0.00' }, '2026-11-01')
    expect(situacao).toBe('sem-compras')
    expect(podePagar(situacao)).toBe(false)
  })
})

describe('datasDaFatura', () => {
  it('cada situação diz a data que importa, uma frase por item', () => {
    expect(datasDaFatura(FATURA, 'aberta')).toEqual([
      'Fecha em 25 de outubro',
      'vence em 5 de novembro',
    ])
    expect(datasDaFatura(FATURA, 'fechada')).toEqual([
      'Fechou em 25 de outubro',
      'vence em 5 de novembro',
    ])
    expect(datasDaFatura(FATURA, 'vencida')).toEqual(['Venceu em 5 de novembro'])
  })

  it('paga: quando e com qual conta', () => {
    const paga: Fatura = {
      ...FATURA,
      situacao: 'paga',
      pagamento: { id: 77, data: '2026-11-01', conta: 1, conta_nome: 'Corrente', valor: '33.34' },
    }
    expect(datasDaFatura(paga, 'paga')).toEqual(['Paga em 1 de novembro', 'Corrente'])
  })
})

describe('linha da compra na fatura', () => {
  it('com descrição: categoria e data curta da compra', () => {
    expect(detalheDaParcela(GELADEIRA)).toBe('Casa · 10 de out.')
  })

  it('sem descrição: só a data (a categoria já é o título)', () => {
    expect(detalheDaParcela({ ...GELADEIRA, descricao: '' })).toBe('10 de out.')
  })

  it('o número da parcela some na compra à vista', () => {
    expect(numeroDaParcela(GELADEIRA)).toBe('1/3')
    expect(numeroDaParcela({ ...GELADEIRA, numero: '1/1' })).toBeNull()
  })
})

describe('situacaoDaParcela', () => {
  const base = { id: 1, numero: '1/3', valor: '33.34', vencimento: '2026-11-05' }

  it('paga mostra a data do pagamento', () => {
    expect(
      situacaoDaParcela({ ...base, situacao: 'paga', data_pagamento: '2026-11-01' }, '2026-12-01'),
    ).toBe('Paga em 01/11/2026')
  })

  it('pendente: vence ou já venceu, conforme hoje', () => {
    const pendente = { ...base, situacao: 'pendente' as const, data_pagamento: null }
    expect(situacaoDaParcela(pendente, '2026-11-05')).toBe('Vence em 05/11/2026')
    expect(situacaoDaParcela(pendente, '2026-11-06')).toBe('Venceu em 05/11/2026')
  })
})

describe('pagamento', () => {
  const corrente = contaDeTeste({ id: 1, nome: 'Corrente', tipo: 'corrente' })
  const carteira = contaDeTeste({ id: 2, nome: 'Carteira', tipo: 'dinheiro' })
  const nubank = contaDeTeste({ id: 4, nome: 'Nubank', tipo: 'cartao' })

  it('com uma conta só (cartão não conta), ela já vem escolhida', () => {
    expect(pagamentoVazio([corrente, nubank], '2026-10-26')).toEqual({
      conta: '1',
      data: '2026-10-26',
    })
  })

  it('com mais de uma, a pessoa escolhe', () => {
    expect(pagamentoVazio([corrente, carteira, nubank], '2026-10-26').conta).toBe('')
  })

  it('exige conta e data', () => {
    expect(validarPagamento({ conta: '', data: '' })).toEqual({
      conta: 'Escolha a conta que pagou.',
      data: 'Informe a data do pagamento.',
    })
  })
})
