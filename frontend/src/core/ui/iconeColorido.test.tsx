import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { esquemaCor, esquemaIcone } from '@/core/utils'

import { IconeDoCadastro } from './IconeColorido'

describe('IconeDoCadastro', () => {
  it('ícone branco em cor escura, escuro em cor clara (contraste de pelo menos 3:1)', () => {
    const { container: azul } = render(<IconeDoCadastro cor="azul" icone="casa" />)
    const { container: amarelo } = render(<IconeDoCadastro cor="amarelo" icone="onibus" />)
    expect(azul.firstElementChild).toHaveClass('bg-paleta-azul', 'text-sobre-marca')
    expect(amarelo.firstElementChild).toHaveClass('bg-paleta-amarelo', 'text-conteudo')
  })

  it('é decorativo: o nome ao lado é que diz o que é', () => {
    const { container } = render(<IconeDoCadastro cor="verde" icone="cofrinho" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('esquemas de cor e ícone', () => {
  it('cor ou ícone que o frontend não conhece vira o padrão em vez de quebrar', () => {
    expect(esquemaCor.parse('dourado')).toBe('azul')
    expect(esquemaIcone.parse('foguete')).toBe('etiqueta')
    expect(esquemaCor.parse('violeta')).toBe('violeta')
  })
})
