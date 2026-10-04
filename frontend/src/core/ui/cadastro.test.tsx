import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useState, type FC } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import type { Cor, NomeDoIcone } from '@/core/utils'

import { Aviso } from './Aviso'
import { CampoValor } from './Campos'
import { Grupo } from './ListaAgrupada'
import { SeletorDeCor, SeletorDeIcone } from './Seletores'
import { Tela } from './Tela'

type ValorComSinalProps = {
  inicial?: string
  aoMudar: (valor: string) => void
}

const ValorComSinal: FC<ValorComSinalProps> = ({ inicial = '', aoMudar }) => {
  const [valor, setValor] = useState(inicial)
  return (
    <Grupo>
      <CampoValor
        aoMudar={(novo) => {
          setValor(novo)
          aoMudar(novo)
        }}
        permiteNegativo
        rotulo="Saldo inicial"
        valor={valor}
      />
    </Grupo>
  )
}

describe('CampoValor com sinal', () => {
  it('o rótulo continua nomeando o campo, não o botão ±', () => {
    render(<ValorComSinal aoMudar={vi.fn()} />)
    expect(screen.getByLabelText('Saldo inicial')).toHaveAttribute('inputmode', 'numeric')
  })

  it('± antes de digitar: o valor já nasce negativo', async () => {
    const aoMudar = vi.fn()
    render(<ValorComSinal aoMudar={aoMudar} />)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Valor negativo' }))
    await usuario.type(screen.getByLabelText('Saldo inicial'), '30000')

    expect(aoMudar).toHaveBeenLastCalledWith('-300.00')
    expect(screen.getByRole('button', { name: 'Valor negativo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('± depois de digitar inverte o sinal, ida e volta', async () => {
    const aoMudar = vi.fn()
    render(<ValorComSinal aoMudar={aoMudar} inicial="150.00" />)
    const usuario = userEvent.setup()
    const sinal = screen.getByRole('button', { name: 'Valor negativo' })

    await usuario.click(sinal)
    expect(aoMudar).toHaveBeenLastCalledWith('-150.00')
    await usuario.click(sinal)
    expect(aoMudar).toHaveBeenLastCalledWith('150.00')
  })
})

describe('Tela com voltar', () => {
  it('mostra "‹ Mais" levando de volta', () => {
    const roteador = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <Tela titulo="Contas" voltar={{ para: '/mais', rotulo: 'Mais' }}>
              conteúdo
            </Tela>
          ),
        },
      ],
      { initialEntries: ['/mais/contas'] },
    )
    render(<RouterProvider router={roteador} />)
    expect(screen.getByRole('link', { name: 'Mais' })).toHaveAttribute('href', '/mais')
  })
})

type SeletoresProps = {
  aoMudarCor: (cor: Cor) => void
  aoMudarIcone: (icone: NomeDoIcone) => void
}

const Seletores: FC<SeletoresProps> = ({ aoMudarCor, aoMudarIcone }) => {
  const [cor, setCor] = useState<Cor>('azul')
  const [icone, setIcone] = useState<NomeDoIcone>('banco')
  return (
    <>
      <SeletorDeCor
        aoMudar={(nova) => {
          setCor(nova)
          aoMudarCor(nova)
        }}
        nome="cor"
        valor={cor}
      />
      <SeletorDeIcone
        aoMudar={(novo) => {
          setIcone(novo)
          aoMudarIcone(novo)
        }}
        cor={cor}
        nome="icone"
        valor={icone}
      />
    </>
  )
}

describe('seletores de cor e ícone', () => {
  it('são grupos de rádios com nomes legíveis', () => {
    render(<Seletores aoMudarCor={vi.fn()} aoMudarIcone={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Cor' })).toBeInTheDocument()
    expect(
      screen.getAllByRole('radio', {
        name: /Azul|Laranja|Turquesa|Amarelo|Rosa|Verde|Violeta|Vermelho/,
      }),
    ).toHaveLength(8)
    expect(screen.getByRole('radio', { name: 'Azul' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Refeição' })).toBeInTheDocument()
  })

  it('escolher avisa o valor', async () => {
    const aoMudarCor = vi.fn()
    const aoMudarIcone = vi.fn()
    render(<Seletores aoMudarCor={aoMudarCor} aoMudarIcone={aoMudarIcone} />)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByText('Violeta'))
    await usuario.click(screen.getByText('Cofrinho'))

    expect(aoMudarCor).toHaveBeenCalledWith('violeta')
    expect(aoMudarIcone).toHaveBeenCalledWith('cofrinho')
    expect(screen.getByRole('radio', { name: 'Violeta' })).toBeChecked()
  })
})

describe('Aviso', () => {
  it('mostra a mensagem e fecha', async () => {
    const aoFechar = vi.fn()
    render(<Aviso aoFechar={aoFechar} mensagem="Existem lançamentos ligados." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Existem lançamentos ligados.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(aoFechar).toHaveBeenCalledOnce()
  })
})
