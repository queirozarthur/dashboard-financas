import { describe, expect, it } from 'vitest'

import type { Transacao } from './consts/esquemas'
import { errosDaApi } from './erros'
import {
  dataDeHoje,
  formularioDaTransacao,
  formularioVazio,
  motivoSomenteLeitura,
  paraAPI,
  temErros,
  trocarTipo,
  validar,
  type Formulario,
} from './formulario'

const despesaCompleta: Formulario = {
  tipo: 'despesa',
  valor: '84.30',
  descricao: '  Feira  ',
  data: '2026-10-04',
  conta: '1',
  contaDestino: '',
  categoria: '7',
}

const transacao: Transacao = {
  id: 5,
  tipo: 'transferencia',
  valor: '500.00',
  data: '2026-10-06',
  descricao: 'Aporte',
  conta: 1,
  conta_nome: 'Corrente',
  conta_destino: 3,
  conta_destino_nome: 'Investimentos',
  categoria: null,
  categoria_nome: null,
  categoria_cor: null,
  categoria_icone: null,
  compra: null,
  numero_parcela: null,
  fatura_paga: null,
  recorrencia: null,
  competencia: null,
}

describe('dataDeHoje', () => {
  it('usa a data local, com zeros', () => {
    expect(dataDeHoje(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})

describe('formulário', () => {
  it('começa como despesa, com a data de hoje', () => {
    expect(formularioVazio('2026-10-04')).toMatchObject({
      tipo: 'despesa',
      data: '2026-10-04',
      valor: '',
    })
  })

  it('preenche a partir de um lançamento existente', () => {
    expect(formularioDaTransacao(transacao)).toEqual({
      tipo: 'transferencia',
      valor: '500.00',
      descricao: 'Aporte',
      data: '2026-10-06',
      conta: '1',
      contaDestino: '3',
      categoria: '',
    })
  })
})

describe('trocarTipo', () => {
  it('de despesa para receita limpa a categoria (a natureza mudou)', () => {
    expect(trocarTipo(despesaCompleta, 'receita').categoria).toBe('')
  })

  it('sair de transferência limpa o destino', () => {
    const transferencia = { ...despesaCompleta, tipo: 'transferencia' as const, contaDestino: '3' }
    expect(trocarTipo(transferencia, 'despesa').contaDestino).toBe('')
  })

  it('valor, data e conta continuam', () => {
    expect(trocarTipo(despesaCompleta, 'receita')).toMatchObject({ valor: '84.30', conta: '1' })
  })
})

describe('validar', () => {
  it('despesa completa passa', () => {
    expect(temErros(validar(despesaCompleta))).toBe(false)
  })

  it('aponta cada campo que falta', () => {
    expect(validar(formularioVazio(''))).toEqual({
      valor: 'Informe o valor.',
      data: 'Informe a data.',
      conta: 'Escolha a conta.',
      categoria: 'Escolha a categoria.',
    })
  })

  it('transferência exige destino diferente da origem', () => {
    const base = { ...despesaCompleta, tipo: 'transferencia' as const, categoria: '' }
    expect(validar(base).contaDestino).toBe('Escolha a conta de destino.')
    expect(validar({ ...base, contaDestino: '1' }).contaDestino).toBe(
      'Escolha uma conta diferente da de origem.',
    )
    expect(validar({ ...base, contaDestino: '3' }).categoria).toBeUndefined()
  })
})

describe('paraAPI', () => {
  it('despesa leva categoria e nenhum destino; valor segue como texto', () => {
    expect(paraAPI(despesaCompleta)).toEqual({
      tipo: 'despesa',
      valor: '84.30',
      data: '2026-10-04',
      descricao: 'Feira',
      conta: 1,
      conta_destino: null,
      categoria: 7,
    })
  })

  it('transferência leva destino e nenhuma categoria', () => {
    const corpo = paraAPI({
      ...despesaCompleta,
      tipo: 'transferencia',
      contaDestino: '3',
      categoria: '7',
    })
    expect(corpo).toMatchObject({ conta_destino: 3, categoria: null })
  })
})

describe('motivoSomenteLeitura', () => {
  it('lançamento comum pode ser editado', () => {
    expect(motivoSomenteLeitura(transacao)).toBeNull()
  })

  it('parcela e pagamento de fatura não', () => {
    expect(motivoSomenteLeitura({ ...transacao, compra: 9, numero_parcela: 3 })).toContain(
      'parcela 3',
    )
    expect(motivoSomenteLeitura({ ...transacao, fatura_paga: '2026-10-05' })).toContain('fatura')
  })
})

describe('errosDaApi', () => {
  it('coloca cada mensagem no campo certo', () => {
    expect(
      errosDaApi({
        valor: ['O valor precisa ser maior que zero.'],
        conta_destino: ['A conta de destino precisa ser diferente da conta de origem.'],
      }),
    ).toEqual({
      valor: 'O valor precisa ser maior que zero.',
      contaDestino: 'A conta de destino precisa ser diferente da conta de origem.',
    })
  })

  it('detail e campos desconhecidos viram aviso geral', () => {
    expect(errosDaApi({ detail: 'Não é possível apagar.' })).toEqual({
      geral: 'Não é possível apagar.',
    })
    expect(errosDaApi({ non_field_errors: ['Esta transação é parcela.'] }).geral).toBe(
      'Esta transação é parcela.',
    )
  })

  it('corpo fora do formato vira mensagem padrão', () => {
    expect(errosDaApi('<html>500</html>').geral).toContain('Não foi possível salvar')
  })
})
