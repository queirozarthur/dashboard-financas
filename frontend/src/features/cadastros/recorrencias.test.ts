import { describe, expect, it } from 'vitest'

import type { Recorrencia } from './consts/esquemas'
import {
  detalheDaRecorrencia,
  encerrada,
  formularioDaRecorrencia,
  notaDaRecorrencia,
  recorrenciaParaAPI,
  recorrenciaVazia,
  trocarTipoDaRecorrencia,
  validarRecorrencia,
} from './recorrencias'

const ALUGUEL: Recorrencia = {
  id: 3,
  descricao: 'Aluguel',
  tipo: 'despesa',
  valor: '1800.00',
  dia: 10,
  inicio: '2026-01',
  fim: null,
  conta: 1,
  conta_nome: 'Corrente',
  conta_destino: null,
  conta_destino_nome: null,
  categoria: 8,
  categoria_nome: 'Moradia',
  categoria_cor: 'violeta',
  categoria_icone: 'casa',
}

describe('recorrência nova', () => {
  it('despesa começando no mês atual, no dia de hoje, sem fim', () => {
    expect(recorrenciaVazia('2026-10', 11)).toMatchObject({
      tipo: 'despesa',
      dia: '11',
      inicio: '2026-10',
      temFim: false,
    })
  })
})

describe('formulário da recorrência', () => {
  it('editar e salvar sem mexer devolve o que veio', () => {
    expect(recorrenciaParaAPI(formularioDaRecorrencia(ALUGUEL))).toEqual({
      tipo: 'despesa',
      valor: '1800.00',
      descricao: 'Aluguel',
      dia: 10,
      conta: 1,
      conta_destino: null,
      categoria: 8,
      inicio: '2026-01',
      fim: null,
    })
  })

  it('com fim ligado, o fim vai junto; desligado, vai nulo', () => {
    const comFim = { ...formularioDaRecorrencia(ALUGUEL), temFim: true, fim: '2026-12' }
    expect(recorrenciaParaAPI(comFim).fim).toBe('2026-12')
    expect(recorrenciaParaAPI({ ...comFim, temFim: false }).fim).toBeNull()
  })

  it('transferência leva o destino e nenhuma categoria', () => {
    const aporte = {
      ...trocarTipoDaRecorrencia(formularioDaRecorrencia(ALUGUEL), 'transferencia'),
      contaDestino: '2',
    }
    expect(recorrenciaParaAPI(aporte)).toMatchObject({ conta_destino: 2, categoria: null })
  })

  it('trocar o tipo limpa a categoria de outra natureza', () => {
    expect(trocarTipoDaRecorrencia(formularioDaRecorrencia(ALUGUEL), 'receita').categoria).toBe('')
  })
})

describe('validarRecorrencia', () => {
  it('aponta o que falta', () => {
    expect(validarRecorrencia({ ...recorrenciaVazia('2026-10', 11), inicio: '' })).toEqual({
      descricao: 'Dê um nome, como "Aluguel" ou "Salário".',
      valor: 'Informe o valor.',
      conta: 'Escolha a conta.',
      categoria: 'Escolha a categoria.',
      inicio: 'Escolha o mês em que começa.',
    })
  })

  it('fim ligado exige o mês, e não antes do início', () => {
    const base = { ...formularioDaRecorrencia(ALUGUEL), temFim: true }
    expect(validarRecorrencia(base).fim).toBe('Escolha o último mês.')
    expect(validarRecorrencia({ ...base, fim: '2025-12' }).fim).toBe(
      'O último mês não pode ser antes do início.',
    )
    expect(validarRecorrencia({ ...base, fim: '2026-01' })).toEqual({})
  })
})

describe('apresentação', () => {
  it('a conta embaixo do nome; transferência mostra o destino', () => {
    expect(detalheDaRecorrencia(ALUGUEL)).toBe('Corrente')
    expect(
      detalheDaRecorrencia({
        ...ALUGUEL,
        tipo: 'transferencia',
        conta_destino: 2,
        conta_destino_nome: 'Investimentos',
      }),
    ).toBe('Corrente → Investimentos')
  })

  it('embaixo do valor, o dia e, se tiver, o último mês', () => {
    expect(notaDaRecorrencia(ALUGUEL)).toBe('dia 10')
    expect(notaDaRecorrencia({ ...ALUGUEL, fim: '2026-12' })).toBe('dia 10 · até 12/2026')
  })

  it('encerrada é a que terminou antes do mês atual', () => {
    expect(encerrada({ ...ALUGUEL, fim: '2026-09' }, '2026-10')).toBe(true)
    expect(encerrada({ ...ALUGUEL, fim: '2026-10' }, '2026-10')).toBe(false)
    expect(encerrada(ALUGUEL, '2026-10')).toBe(false)
  })
})
