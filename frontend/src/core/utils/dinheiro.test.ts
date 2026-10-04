import { describe, expect, it } from 'vitest'

import { formatarDinheiro } from './dinheiro'

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
