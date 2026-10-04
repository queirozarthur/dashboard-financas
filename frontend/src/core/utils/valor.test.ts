import { describe, expect, it } from 'vitest'

import { decimalParaDigitos, digitosParaDecimal } from './valor'

describe('digitosParaDecimal', () => {
  it('os últimos dois dígitos são os centavos', () => {
    expect(digitosParaDecimal('1')).toBe('0.01')
    expect(digitosParaDecimal('12')).toBe('0.12')
    expect(digitosParaDecimal('1234')).toBe('12.34')
    expect(digitosParaDecimal('150000')).toBe('1500.00')
  })

  it('ignora o que não é dígito (o campo mostra "R$ 12,34")', () => {
    expect(digitosParaDecimal('R$ 12,345')).toBe('123.45')
  })

  it('vazio ou só zeros vira vazio', () => {
    expect(digitosParaDecimal('')).toBe('')
    expect(digitosParaDecimal('000')).toBe('')
  })

  it('respeita o limite de dígitos do backend', () => {
    expect(digitosParaDecimal('1234567890123')).toBe('1234567890.12')
  })
})

describe('decimalParaDigitos', () => {
  it('volta para os dígitos', () => {
    expect(decimalParaDigitos('1500.00')).toBe('150000')
    expect(decimalParaDigitos('0.05')).toBe('5')
    expect(decimalParaDigitos('12.3')).toBe('1230')
    expect(decimalParaDigitos('')).toBe('')
  })

  it('ida e volta não perdem nada', () => {
    for (const decimal of ['0.01', '12.34', '1500.00', '1234567890.12']) {
      expect(digitosParaDecimal(decimalParaDigitos(decimal))).toBe(decimal)
    }
  })
})
