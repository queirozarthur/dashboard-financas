import type { OpcaoDeSelecao } from '@/core/ui'

import { MAXIMO_DE_PARCELAS } from '../formulario'

// 1x no cartão é a compra à vista; o resto, "2x" a "48x"
export const OPCOES_DE_PARCELAS: OpcaoDeSelecao[] = Array.from(
  { length: MAXIMO_DE_PARCELAS },
  (_, indice) => {
    const parcelas = indice + 1
    return { valor: String(parcelas), rotulo: parcelas === 1 ? 'À vista' : `${parcelas}x` }
  },
)
