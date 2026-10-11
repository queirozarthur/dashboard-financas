import { describe, expect, it } from 'vitest'

import { categoriaDeTeste } from '@/testes/fabricas'

import type { Orcamento } from './consts/esquemas'
import {
  categoriasSemLimite,
  detalheDoOrcamento,
  explicacaoDoOrcamento,
  formularioDoOrcamento,
  pedidoDoOrcamento,
  validarOrcamento,
} from './orcamentos'

const MERCADO: Orcamento = {
  id: 7,
  categoria: 3,
  categoria_nome: 'Mercado',
  categoria_cor: 'laranja',
  categoria_icone: 'carrinho',
  valor: '800.00',
  inicio: '2026-03',
}

describe('pedidoDoOrcamento', () => {
  it('limite novo começa no mês escolhido', () => {
    expect(pedidoDoOrcamento({ categoria: '3', valor: '800.00' }, null, '2026-10')).toEqual({
      metodo: 'POST',
      caminho: '/orcamentos/',
      corpo: { categoria: 3, valor: '800.00', inicio: '2026-10' },
    })
  })

  it('mudar um limite que começou antes cria uma vigência nova a partir do mês', () => {
    const formulario = { ...formularioDoOrcamento(MERCADO), valor: '900.00' }
    expect(pedidoDoOrcamento(formulario, MERCADO, '2026-10')).toEqual({
      metodo: 'POST',
      caminho: '/orcamentos/',
      corpo: { categoria: 3, valor: '900.00', inicio: '2026-10' },
    })
  })

  it('mudar um limite que começou no próprio mês só atualiza o valor', () => {
    const formulario = { ...formularioDoOrcamento(MERCADO), valor: '900.00' }
    expect(pedidoDoOrcamento(formulario, MERCADO, '2026-03')).toEqual({
      metodo: 'PATCH',
      caminho: '/orcamentos/7/',
      corpo: { valor: '900.00' },
    })
  })

  it('sem mudança no valor, nenhum pedido', () => {
    expect(pedidoDoOrcamento(formularioDoOrcamento(MERCADO), MERCADO, '2026-10')).toBeNull()
    expect(pedidoDoOrcamento(formularioDoOrcamento(MERCADO), MERCADO, '2026-03')).toBeNull()
  })
})

describe('textos do orçamento', () => {
  it('desde quando vale', () => {
    expect(detalheDoOrcamento(MERCADO, '2026-10')).toBe('Desde mar. de 2026')
    expect(detalheDoOrcamento(MERCADO, '2026-03')).toBe('Começa neste mês')
  })

  it('explica o efeito de mudar o valor', () => {
    const explicacao = explicacaoDoOrcamento(MERCADO, '2026-10', 'outubro de 2026')
    expect(explicacao).toContain('Um valor novo vale de outubro de 2026 em diante.')
    // O "R$" vem com espaço sem quebra (Intl): confere só o número
    expect(explicacao).toContain('800,00, como era.')
    expect(explicacaoDoOrcamento(null, '2026-10', 'outubro de 2026')).toContain(
      'Vale de outubro de 2026 em diante',
    )
  })
})

describe('validarOrcamento e categorias', () => {
  it('exige categoria e limite', () => {
    expect(validarOrcamento({ categoria: '', valor: '' })).toEqual({
      categoria: 'Escolha a categoria.',
      valor: 'Informe o limite.',
    })
  })

  it('na criação, só despesas ainda sem limite no mês', () => {
    const categorias = [
      categoriaDeTeste({ id: 3, nome: 'Mercado', natureza: 'despesa' }),
      categoriaDeTeste({ id: 4, nome: 'Lazer', natureza: 'despesa' }),
      categoriaDeTeste({ id: 5, nome: 'Salário', natureza: 'receita' }),
    ]
    expect(
      categoriasSemLimite(categorias, [MERCADO]).map((categoria) => {
        return categoria.nome
      }),
    ).toEqual(['Lazer'])
  })
})
