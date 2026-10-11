import { describe, expect, it } from 'vitest'

import type { Prevista } from './consts/esquemas'
import {
  confirmacaoDaPrevista,
  confirmacaoParaAPI,
  previstasDoFiltro,
  validarConfirmacao,
} from './previstas'

const ALUGUEL: Prevista = {
  recorrencia: 3,
  descricao: 'Aluguel',
  tipo: 'despesa',
  valor: '1800.00',
  data: '2026-10-10',
  conta: 1,
  conta_nome: 'Corrente',
  conta_destino: null,
  conta_destino_nome: null,
  categoria: 8,
  categoria_nome: 'Moradia',
  categoria_cor: 'violeta',
  categoria_icone: 'casa',
}

const APORTE: Prevista = {
  ...ALUGUEL,
  recorrencia: 4,
  tipo: 'transferencia',
  conta_destino: 2,
  categoria: null,
}

describe('previstasDoFiltro', () => {
  it('sem filtro, todas', () => {
    expect(previstasDoFiltro([ALUGUEL, APORTE], { conta: null, categoria: null })).toHaveLength(2)
  })

  it('a conta vale como origem ou como destino, igual ao extrato', () => {
    expect(previstasDoFiltro([ALUGUEL, APORTE], { conta: '2', categoria: null })).toEqual([APORTE])
  })

  it('categoria deixa a transferência de fora', () => {
    expect(previstasDoFiltro([ALUGUEL, APORTE], { conta: null, categoria: '8' })).toEqual([ALUGUEL])
  })
})

describe('confirmação', () => {
  it('abre com o previsto e vai para a API com o mês da competência', () => {
    const formulario = { ...confirmacaoDaPrevista(ALUGUEL), data: '2026-11-02' }
    // Aluguel de outubro pago em novembro: a competência continua sendo outubro
    expect(confirmacaoParaAPI(formulario, '2026-10')).toEqual({
      mes: '2026-10',
      valor: '1800.00',
      data: '2026-11-02',
      conta: 1,
    })
  })

  it('exige valor, data e conta', () => {
    expect(validarConfirmacao({ valor: '', data: '', conta: '' })).toEqual({
      valor: 'Informe o valor.',
      data: 'Informe a data.',
      conta: 'Escolha a conta.',
    })
  })
})
