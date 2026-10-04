import { describe, expect, it } from 'vitest'

import { cn } from './cn'
import { tv } from './tailwind'

describe('cn', () => {
  it('resolve conflitos: a última classe vence', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('não confunde nossos tamanhos de texto com cores', () => {
    // Bug real: text-legenda sumia ao lado de text-marca, e as abas ficavam com 17px
    expect(cn('text-legenda', 'text-marca')).toBe('text-legenda text-marca')
    expect(cn('text-corpo', 'text-conteudo-secundario')).toBe('text-corpo text-conteudo-secundario')
  })

  it('dois tamanhos nossos ainda conflitam entre si', () => {
    expect(cn('text-legenda', 'md:text-corpo', 'text-nota')).toBe('md:text-corpo text-nota')
  })

  it('sombras nossas não somem ao lado de outras classes', () => {
    expect(cn('shadow-linha', 'bg-fundo/80')).toBe('shadow-linha bg-fundo/80')
  })
})

describe('tv', () => {
  it('usa a mesma configuração do cn', () => {
    const estilo = tv({ base: 'text-legenda', variants: { ativo: { true: 'text-marca' } } })
    expect(estilo({ ativo: true })).toBe('text-legenda text-marca')
  })
})
