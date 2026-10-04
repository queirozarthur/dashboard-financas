import { describe, expect, it } from 'vitest'

import { contaDeTeste } from '@/testes/fabricas'

import {
  categoriaParaAPI,
  categoriaVazia,
  contaParaAPI,
  contaVazia,
  detalheDaConta,
  formularioDaConta,
  tomDoSaldo,
  trocarTipoDaConta,
  validarCategoria,
  validarConta,
} from './formularios'

describe('conta nova', () => {
  it('já vem com a próxima cor da paleta, como o backend daria', () => {
    expect(contaVazia(0).cor).toBe('azul')
    expect(contaVazia(2).cor).toBe('turquesa')
    expect(contaVazia(8).cor).toBe('azul')
  })

  it('começa como conta corrente, com o ícone de banco', () => {
    expect(contaVazia(0)).toMatchObject({ tipo: 'corrente', icone: 'banco' })
  })
})

describe('trocarTipoDaConta', () => {
  it('ícone padrão acompanha o tipo', () => {
    expect(trocarTipoDaConta(contaVazia(0), 'dinheiro').icone).toBe('carteira')
  })

  it('ícone escolhido à mão fica', () => {
    const comCofrinho = { ...contaVazia(0), icone: 'cofrinho' as const }
    expect(trocarTipoDaConta(comCofrinho, 'investimento').icone).toBe('cofrinho')
  })

  it('virar cartão apaga o saldo inicial; deixar de ser apaga os dias', () => {
    const corrente = { ...contaVazia(0), saldoInicial: '150.00' }
    const cartao = trocarTipoDaConta(corrente, 'cartao')
    expect(cartao.saldoInicial).toBe('')
    const deVolta = trocarTipoDaConta(
      { ...cartao, diaFechamento: '25', diaVencimento: '5' },
      'corrente',
    )
    expect(deVolta).toMatchObject({ diaFechamento: '', diaVencimento: '' })
  })
})

describe('validarConta', () => {
  it('exige nome', () => {
    expect(validarConta({ ...contaVazia(0), nome: '   ' }).nome).toBe('Dê um nome à conta.')
  })

  it('cartão exige os dois dias', () => {
    const cartao = trocarTipoDaConta({ ...contaVazia(0), nome: 'Nubank' }, 'cartao')
    expect(validarConta(cartao)).toEqual({
      diaFechamento: 'Escolha o dia em que a fatura fecha.',
      diaVencimento: 'Escolha o dia em que a fatura vence.',
    })
  })
})

describe('contaParaAPI', () => {
  it('saldo vazio vira zero e segue como texto', () => {
    expect(contaParaAPI({ ...contaVazia(0), nome: ' Carteira ' })).toMatchObject({
      nome: 'Carteira',
      saldo_inicial: '0.00',
      dia_fechamento: null,
    })
  })

  it('saldo negativo vai como está', () => {
    expect(
      contaParaAPI({ ...contaVazia(0), nome: 'X', saldoInicial: '-300.00' }).saldo_inicial,
    ).toBe('-300.00')
  })

  it('cartão vai com os dias como número e saldo zero', () => {
    const cartao = {
      ...trocarTipoDaConta({ ...contaVazia(0), nome: 'Nubank' }, 'cartao'),
      diaFechamento: '25',
      diaVencimento: '5',
    }
    expect(contaParaAPI(cartao)).toMatchObject({
      tipo: 'cartao',
      saldo_inicial: '0.00',
      dia_fechamento: 25,
      dia_vencimento: 5,
    })
  })

  it('editar e salvar sem mexer devolve o que veio', () => {
    const conta = contaDeTeste({
      id: 1,
      nome: 'Corrente',
      tipo: 'corrente',
      saldo_inicial: '-300.00',
    })
    expect(contaParaAPI(formularioDaConta(conta))).toMatchObject({ saldo_inicial: '-300.00' })
  })
})

describe('apresentação da conta', () => {
  it('cartão mostra os dias da fatura; as outras, o tipo', () => {
    expect(detalheDaConta(contaDeTeste({ id: 1, nome: 'Nubank', tipo: 'cartao' }))).toBe(
      'Fecha dia 25 · vence dia 5',
    )
    expect(detalheDaConta(contaDeTeste({ id: 2, nome: 'X', tipo: 'investimento' }))).toBe(
      'Investimento',
    )
  })

  it('dívida do cartão não é alerta; conta comum negativa é', () => {
    expect(tomDoSaldo(contaDeTeste({ id: 1, nome: 'N', tipo: 'cartao', saldo: '-1100.00' }))).toBe(
      'despesa',
    )
    expect(tomDoSaldo(contaDeTeste({ id: 2, nome: 'C', tipo: 'corrente', saldo: '-50.00' }))).toBe(
      'neutro',
    )
  })
})

describe('categoria', () => {
  it('nova: despesa variável com etiqueta e a próxima cor', () => {
    expect(categoriaVazia(1)).toEqual({
      nome: '',
      natureza: 'despesa',
      tipo: 'variavel',
      cor: 'laranja',
      icone: 'etiqueta',
    })
  })

  it('exige nome e limpa espaços ao enviar', () => {
    expect(validarCategoria(categoriaVazia(0)).nome).toBe('Dê um nome à categoria.')
    expect(categoriaParaAPI({ ...categoriaVazia(0), nome: ' Pet ' }).nome).toBe('Pet')
  })
})
