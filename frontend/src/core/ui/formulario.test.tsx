import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useState, type FC } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { deveFechar } from '@/core/hooks'

import { Campo, CampoData, CampoSelecao, CampoValor } from './Campos'
import { ControleSegmentado } from './ControleSegmentado'
import { Folha } from './Folha'
import { Grupo } from './ListaAgrupada'

const real = (texto: string) => texto.replace(' ', ' ')

type ValorControladoProps = {
  inicial?: string
  aoMudar: (valor: string) => void
}

// O CampoValor é controlado: o teste precisa de um "dono" do estado, como uma tela teria
const ValorControlado: FC<ValorControladoProps> = ({ inicial = '', aoMudar }) => {
  const [valor, setValor] = useState(inicial)
  return (
    <Grupo>
      <CampoValor
        aoMudar={(novo) => {
          setValor(novo)
          aoMudar(novo)
        }}
        rotulo="Valor"
        valor={valor}
      />
    </Grupo>
  )
}

describe('CampoValor', () => {
  it('digita a partir dos centavos e entrega texto decimal', async () => {
    const aoMudar = vi.fn()
    render(<ValorControlado aoMudar={aoMudar} />)
    const campo = screen.getByLabelText('Valor')

    await userEvent.setup().type(campo, '1234')

    expect(campo).toHaveValue(real('R$ 12,34'))
    expect(aoMudar).toHaveBeenLastCalledWith('12.34')
  })

  it('apagar tira o último dígito', async () => {
    const aoMudar = vi.fn()
    render(<ValorControlado aoMudar={aoMudar} inicial="12.34" />)
    const campo = screen.getByLabelText('Valor')

    await userEvent.setup().type(campo, '{Backspace}')

    expect(campo).toHaveValue(real('R$ 1,23'))
    expect(aoMudar).toHaveBeenLastCalledWith('1.23')
  })

  it('abre o teclado numérico no celular', () => {
    render(<ValorControlado aoMudar={vi.fn()} />)
    expect(screen.getByLabelText('Valor')).toHaveAttribute('inputmode', 'numeric')
  })
})

describe('outros campos', () => {
  it('rótulo e campo ficam ligados (tocar no rótulo foca o campo)', () => {
    render(
      <Grupo>
        <Campo rotulo="Descrição" />
        <CampoData defaultValue="2026-10-04" rotulo="Data" />
      </Grupo>,
    )
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByLabelText('Data')).toHaveAttribute('type', 'date')
  })

  it('seleção começa vazia e avisa a escolha', async () => {
    const aoMudar = vi.fn()
    render(
      <Grupo>
        <CampoSelecao
          defaultValue=""
          onChange={(evento) => {
            aoMudar(evento.target.value)
          }}
          opcoes={[
            { valor: '1', rotulo: 'Corrente' },
            { valor: '2', rotulo: 'Carteira' },
          ]}
          rotulo="Conta"
        />
      </Grupo>,
    )
    const selecao = screen.getByLabelText('Conta')
    expect(selecao).toHaveDisplayValue('Escolher')

    await userEvent.setup().selectOptions(selecao, 'Carteira')

    expect(aoMudar).toHaveBeenCalledWith('2')
  })
})

describe('ControleSegmentado', () => {
  const TIPOS = [
    { valor: 'receita', rotulo: 'Receita' },
    { valor: 'despesa', rotulo: 'Despesa' },
    { valor: 'transferencia', rotulo: 'Transferência' },
  ] as const

  it('é um grupo de rádios com nome acessível e a opção atual marcada', () => {
    render(
      <ControleSegmentado
        aoMudar={vi.fn()}
        nome="tipo"
        opcoes={TIPOS}
        rotulo="Tipo"
        valor="despesa"
      />,
    )
    expect(screen.getByRole('group', { name: 'Tipo' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Despesa' })).toBeChecked()
  })

  it('tocar numa opção avisa o valor dela', async () => {
    const aoMudar = vi.fn()
    render(
      <ControleSegmentado
        aoMudar={aoMudar}
        nome="tipo"
        opcoes={TIPOS}
        rotulo="Tipo"
        valor="despesa"
      />,
    )
    await userEvent.setup().click(screen.getByText('Receita'))
    expect(aoMudar).toHaveBeenCalledWith('receita')
  })
})

describe('Folha', () => {
  it('fechada, não aparece', () => {
    render(
      <Folha aberta={false} aoMudarAberta={vi.fn()} titulo="Novo lançamento">
        conteúdo
      </Folha>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('aberta, é um diálogo com o título como nome', () => {
    render(
      <Folha aberta aoMudarAberta={vi.fn()} titulo="Novo lançamento">
        conteúdo
      </Folha>,
    )
    expect(screen.getByRole('dialog', { name: 'Novo lançamento' })).toHaveTextContent('conteúdo')
  })

  it('Cancelar e Esc pedem para fechar', async () => {
    const aoMudarAberta = vi.fn()
    render(
      <Folha aberta aoMudarAberta={aoMudarAberta} titulo="Novo lançamento">
        conteúdo
      </Folha>,
    )
    const usuarioReal = userEvent.setup()

    await usuarioReal.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(aoMudarAberta).toHaveBeenLastCalledWith(false)

    aoMudarAberta.mockClear()
    await usuarioReal.keyboard('{Escape}')
    expect(aoMudarAberta).toHaveBeenLastCalledWith(false)
  })

  it('mostra a ação do canto direito', () => {
    render(
      <Folha
        acao={<button type="button">Salvar</button>}
        aberta
        aoMudarAberta={vi.fn()}
        titulo="Novo"
      >
        conteúdo
      </Folha>,
    )
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })
})

describe('arrastar para fechar', () => {
  it('fecha se puxar longe o bastante', () => {
    expect(deveFechar(121, 0.1)).toBe(true)
    expect(deveFechar(119, 0.1)).toBe(false)
  })

  it('fecha com um puxão rápido, mesmo curto', () => {
    expect(deveFechar(40, 0.8)).toBe(true)
  })

  it('um tremidinho rápido não fecha', () => {
    expect(deveFechar(10, 2)).toBe(false)
  })
})
