import { describe, expect, it } from 'vitest'

import { ErroDaApi } from './erros'
import { errosDaFalha, errosDoDRF } from './errosDoDRF'

const CAMPOS = { saldo_inicial: 'saldoInicial', nome: 'nome' } as const

describe('errosDoDRF', () => {
  it('liga o nome da API ao nome do formulário', () => {
    expect(errosDoDRF({ saldo_inicial: ['Cartão começa com saldo zero.'] }, CAMPOS)).toEqual({
      saldoInicial: 'Cartão começa com saldo zero.',
    })
  })

  it('junta várias mensagens do mesmo campo', () => {
    expect(errosDoDRF({ nome: ['Obrigatório.', 'Muito longo.'] }, CAMPOS)).toEqual({
      nome: 'Obrigatório. Muito longo.',
    })
  })

  it('o que não é campo vira aviso geral', () => {
    expect(errosDoDRF({ detail: 'Não é possível apagar.' }, CAMPOS)).toEqual({
      geral: 'Não é possível apagar.',
    })
  })

  it('corpo inesperado vira mensagem padrão', () => {
    expect(errosDoDRF(null, CAMPOS).geral).toContain('Não foi possível salvar')
  })
})

describe('errosDaFalha', () => {
  it('erro da API usa as mensagens dela', () => {
    const falha = new ErroDaApi(409, { detail: 'Existem lançamentos ligados.' })
    expect(errosDaFalha(falha, CAMPOS)).toEqual({ geral: 'Existem lançamentos ligados.' })
  })

  it('falha de rede vira aviso de conexão', () => {
    expect(errosDaFalha(new TypeError('Failed to fetch'), CAMPOS).geral).toContain(
      'Confira se ele está ligado',
    )
  })
})
