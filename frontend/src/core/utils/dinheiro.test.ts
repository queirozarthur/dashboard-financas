import { describe, expect, it } from 'vitest'

import { apresentarValor, formatarDinheiro } from './dinheiro'

// O Intl separa "R$" do número com espaço não separável (U+00A0)
const real = (texto: string) => texto.replace(' ', ' ')

describe('formatarDinheiro', () => {
  it('formata no padrão brasileiro', () => {
    expect(formatarDinheiro('1500.00')).toBe(real('R$ 1.500,00'))
    expect(formatarDinheiro('0.10')).toBe(real('R$ 0,10'))
  })

  it('formata valores negativos', () => {
    expect(formatarDinheiro('-30.00')).toBe(`-${real('R$ 30,00')}`)
  })

  it('não perde centavos em valores que um float arredondaria', () => {
    // Number('90071992547409.93') vira 90071992547409.94
    expect(formatarDinheiro('90071992547409.93')).toBe(real('R$ 90.071.992.547.409,93'))
  })

  it('recusa texto que não é número', () => {
    expect(() => formatarDinheiro('R$ 10')).toThrow()
    expect(() => formatarDinheiro('10,00')).toThrow()
    expect(() => formatarDinheiro('')).toThrow()
  })
})

describe('apresentarValor', () => {
  it('receita ganha "+" e a cor de receita', () => {
    expect(apresentarValor('5000.00', 'receita')).toEqual({
      texto: `+${real('R$ 5.000,00')}`,
      cor: 'receita',
    })
  })

  it('despesa ganha "−" tipográfico e cor normal', () => {
    expect(apresentarValor('1500.00', 'despesa')).toEqual({
      texto: `−${real('R$ 1.500,00')}`,
      cor: 'normal',
    })
  })

  it('neutro positivo fica sem sinal; negativo vira alerta', () => {
    expect(apresentarValor('200.00')).toEqual({ texto: real('R$ 200,00'), cor: 'normal' })
    expect(apresentarValor('-30.00')).toEqual({ texto: `−${real('R$ 30,00')}`, cor: 'alerta' })
  })
})
