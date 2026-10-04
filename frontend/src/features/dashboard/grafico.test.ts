import { describe, expect, it } from 'vitest'

import { paraOGrafico, rotuloCurto, valorCompacto } from './grafico'

// O Intl usa espaço não separável (U+00A0) depois de "R$" e antes de "mil"
const comEspacoComum = (texto: string) => texto.replace(/ /g, ' ')

describe('rotuloCurto', () => {
  it('abrevia o mês sem o ponto', () => {
    expect(rotuloCurto('2026-10')).toBe('out')
    expect(rotuloCurto('2027-02')).toBe('fev')
  })
})

describe('paraOGrafico', () => {
  it('converte só para desenhar e guarda o texto original da API', () => {
    const original = {
      mes: '2026-10',
      receitas: '6200.00',
      despesas: '2150.40',
      resultado: '4049.60',
    }
    expect(paraOGrafico([original])).toEqual([
      { rotulo: 'out', receitas: 6200, despesas: 2150.4, original },
    ])
  })
})

describe('valorCompacto', () => {
  it('escreve as marcas do eixo de forma curta', () => {
    expect(comEspacoComum(valorCompacto(6000))).toBe('R$ 6 mil')
    expect(comEspacoComum(valorCompacto(0))).toBe('R$ 0')
  })

  it('não arredonda 1,5 milhão para 2', () => {
    expect(comEspacoComum(valorCompacto(1_500_000))).toBe('R$ 1,5 mi')
  })
})
