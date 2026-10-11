import { describe, expect, it } from 'vitest'

import { errosDoDRF } from '@/core/api'

import type { Transacao } from './consts/esquemas'
import { CAMPOS_DA_COMPRA, errosDaApi } from './erros'
import {
  compraParaAPI,
  ehCompra,
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
  parcelas: '1',
}

// O cartão Nubank tem o id 4
const CARTOES: ReadonlySet<string> = new Set(['4'])
const SEM_CARTOES: ReadonlySet<string> = new Set()

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

describe('formulário', () => {
  it('começa como despesa à vista, com a data de hoje', () => {
    expect(formularioVazio('2026-10-04')).toMatchObject({
      tipo: 'despesa',
      data: '2026-10-04',
      valor: '',
      parcelas: '1',
    })
  })

  it('quem abre pode deixar a conta escolhida (a tela do cartão)', () => {
    expect(formularioVazio('2026-10-04', { conta: '4' })).toMatchObject({
      tipo: 'despesa',
      conta: '4',
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
      parcelas: '1',
    })
  })
})

describe('trocarTipo', () => {
  it('de despesa para receita limpa a categoria (a natureza mudou)', () => {
    expect(trocarTipo(despesaCompleta, 'receita', SEM_CARTOES).categoria).toBe('')
  })

  it('sair de transferência limpa o destino', () => {
    const transferencia = { ...despesaCompleta, tipo: 'transferencia' as const, contaDestino: '3' }
    expect(trocarTipo(transferencia, 'despesa', SEM_CARTOES).contaDestino).toBe('')
  })

  it('valor, data e conta continuam', () => {
    expect(trocarTipo(despesaCompleta, 'receita', CARTOES)).toMatchObject({
      valor: '84.30',
      conta: '1',
    })
  })

  it('receita e transferência não ficam com o cartão como conta', () => {
    const compra = { ...despesaCompleta, conta: '4' }
    expect(trocarTipo(compra, 'receita', CARTOES).conta).toBe('')
    expect(trocarTipo(compra, 'transferencia', CARTOES).conta).toBe('')
  })
})

describe('compra no cartão', () => {
  const compra = { ...despesaCompleta, conta: '4', parcelas: '3' }

  it('é a despesa com um cartão como conta', () => {
    expect(ehCompra(compra, CARTOES)).toBe(true)
    expect(ehCompra(despesaCompleta, CARTOES)).toBe(false)
    expect(ehCompra({ ...compra, tipo: 'receita' }, CARTOES)).toBe(false)
  })

  it('vai para a API com o total em texto e as parcelas em número', () => {
    expect(compraParaAPI(compra)).toEqual({
      cartao: 4,
      categoria: 7,
      descricao: 'Feira',
      valor_total: '84.30',
      parcelas: 3,
      data_compra: '2026-10-04',
    })
  })

  it('erros da API de compras caem nos campos do mesmo formulário', () => {
    expect(
      errosDoDRF(
        {
          valor_total: ['O valor precisa ser maior que zero.'],
          data_compra: ['A parcela 1 cairia na fatura que vence em 05/11/2026, que já foi paga.'],
          cartao: ['Compras só podem ser lançadas em conta do tipo cartão.'],
        },
        CAMPOS_DA_COMPRA,
      ),
    ).toEqual({
      valor: 'O valor precisa ser maior que zero.',
      data: 'A parcela 1 cairia na fatura que vence em 05/11/2026, que já foi paga.',
      conta: 'Compras só podem ser lançadas em conta do tipo cartão.',
    })
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
