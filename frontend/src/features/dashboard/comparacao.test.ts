import { describe, expect, it } from 'vitest'

import { situacaoDoOrcamento, temValor, textoDaVariacao } from './comparacao'

const real = (texto: string) => texto.replace(' ', ' ')

describe('textoDaVariacao', () => {
  it('diz quanto a mais, quanto a menos ou se ficou igual', () => {
    expect(textoDaVariacao('200.00', 'setembro')).toBe(
      `${real('R$ 200,00')} a mais que em setembro`,
    )
    expect(textoDaVariacao('-300.00', 'setembro')).toBe(
      `${real('R$ 300,00')} a menos que em setembro`,
    )
    expect(textoDaVariacao('0.00', 'setembro')).toBe('Igual a setembro')
    expect(textoDaVariacao('-0.00', 'setembro')).toBe('Igual a setembro')
  })
})

describe('temValor', () => {
  it('zero não conta como valor', () => {
    expect(temValor('0.00')).toBe(false)
    expect(temValor('0.01')).toBe(true)
  })
})

describe('situacaoDoOrcamento', () => {
  it('restante negativo é estourado, mesmo com percentual alto ou baixo', () => {
    expect(situacaoDoOrcamento('-30.00', '103.8')).toBe('estourado')
  })

  it('a partir de 85% comprometido fica "perto"', () => {
    expect(situacaoDoOrcamento('120.00', '85.0')).toBe('perto')
    expect(situacaoDoOrcamento('121.00', '84.9')).toBe('tranquilo')
  })

  it('sem percentual (total sem orçamentos) é tranquilo', () => {
    expect(situacaoDoOrcamento('0.00', null)).toBe('tranquilo')
  })
})
