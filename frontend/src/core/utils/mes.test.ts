import { describe, expect, it } from 'vitest'

import { lerMes, mesDe, mesmoMes, nomeDoMes, somarMeses, textoDoMes } from './mes'

describe('Mes', () => {
  it('lê e escreve no formato da API', () => {
    expect(lerMes('2026-10')).toEqual({ ano: 2026, numero: 10 })
    expect(textoDoMes({ ano: 2026, numero: 3 })).toBe('2026-03')
  })

  it('recusa formatos inválidos', () => {
    for (const texto of ['2026-13', '2026-00', '2026-1', 'outubro', '', null]) {
      expect(lerMes(texto)).toBeNull()
    }
  })

  it('soma e subtrai atravessando o ano', () => {
    expect(somarMeses({ ano: 2026, numero: 12 }, 1)).toEqual({ ano: 2027, numero: 1 })
    expect(somarMeses({ ano: 2026, numero: 1 }, -1)).toEqual({ ano: 2025, numero: 12 })
    expect(somarMeses({ ano: 2026, numero: 3 }, -15)).toEqual({ ano: 2024, numero: 12 })
  })

  it('pega o mês de uma data', () => {
    expect(mesDe(new Date(2026, 9, 31))).toEqual({ ano: 2026, numero: 10 })
  })

  it('compara meses', () => {
    expect(mesmoMes({ ano: 2026, numero: 10 }, { ano: 2026, numero: 10 })).toBe(true)
    expect(mesmoMes({ ano: 2026, numero: 10 }, { ano: 2025, numero: 10 })).toBe(false)
  })

  it('escreve o nome em português com maiúscula', () => {
    expect(nomeDoMes({ ano: 2026, numero: 10 })).toBe('Outubro de 2026')
    expect(nomeDoMes({ ano: 2026, numero: 3 }, { semAno: true })).toBe('Março')
  })
})
