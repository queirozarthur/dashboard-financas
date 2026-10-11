import { describe, expect, it } from 'vitest'

import { dataDeHoje, dataPorExtenso, lerData } from './data'

describe('datas', () => {
  it('lerData usa o dia local, não meia-noite em UTC', () => {
    expect(lerData('2026-10-02').getDate()).toBe(2)
  })

  it('dataDeHoje usa a data local, com zeros', () => {
    expect(dataDeHoje(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })

  it('dataPorExtenso, com e sem o ano', () => {
    expect(dataPorExtenso('2026-11-05')).toBe('5 de novembro')
    expect(dataPorExtenso('2026-11-05', { comAno: true })).toBe('5 de novembro de 2026')
  })
})
