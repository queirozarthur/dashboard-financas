import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import type { FC } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { contaDeTeste } from '@/testes/fabricas'

import type { Transacao } from './consts/esquemas'
import { useAbrirLancamento } from './hooks/contextoDoLancamento'
import { LancamentoProvider } from './LancamentoProvider'

const CONTAS = [
  contaDeTeste({ id: 1, nome: 'Corrente', tipo: 'corrente' }),
  contaDeTeste({ id: 2, nome: 'Carteira', tipo: 'dinheiro' }),
  contaDeTeste({ id: 4, nome: 'Nubank', tipo: 'cartao' }),
]
const CATEGORIAS = [
  { id: 7, nome: 'Mercado', natureza: 'despesa', tipo: 'variavel' },
  { id: 8, nome: 'Salário', natureza: 'receita', tipo: 'fixo' },
]

const FEIRA: Transacao = {
  id: 5,
  tipo: 'despesa',
  valor: '84.30',
  data: '2026-09-15',
  descricao: 'Feira',
  conta: 1,
  conta_nome: 'Corrente',
  conta_destino: null,
  conta_destino_nome: null,
  categoria: 7,
  categoria_nome: 'Mercado',
  categoria_cor: 'laranja',
  categoria_icone: 'carrinho',
  compra: null,
  numero_parcela: null,
  fatura_paga: null,
  recorrencia: null,
  competencia: null,
}

const json = (corpo: unknown, status = 200) => {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Pedido = { metodo: string; caminho: string; corpo: unknown }

const fetchFalso = vi.fn<typeof fetch>()

/** `resposta` decide o que o servidor devolve para POST, PATCH e DELETE. */
const servir = (resposta: (pedido: Pedido) => Response = () => json(FEIRA, 201)) => {
  fetchFalso.mockImplementation(async (entrada, init) => {
    const caminho = new URL(String(entrada)).pathname
    if (caminho.endsWith('/contas/')) {
      return json(CONTAS)
    }
    if (caminho.endsWith('/categorias/')) {
      return json(CATEGORIAS)
    }
    const corpo: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    return resposta({ metodo: init?.method ?? 'GET', caminho, corpo })
  })
}

const pedidosDeEscrita = (): Pedido[] => {
  return fetchFalso.mock.calls
    .filter(([, init]) => {
      return init?.method && init.method !== 'GET'
    })
    .map(([entrada, init]) => {
      return {
        metodo: init?.method ?? '',
        caminho: new URL(String(entrada)).pathname,
        corpo: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      }
    })
}

// Gatilhos de teste: fazem o papel do ＋ da barra e do toque numa linha da lista
const Gatilhos: FC = () => {
  const { abrirNovo, abrirEdicao } = useAbrirLancamento()
  return (
    <>
      <button onClick={abrirNovo} type="button">
        abrir novo
      </button>
      <button
        onClick={() => {
          abrirEdicao(FEIRA)
        }}
        type="button"
      >
        editar feira
      </button>
    </>
  )
}

const abrirApp = () => {
  const clienteQuery = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={clienteQuery}>
      <LancamentoProvider>
        <Gatilhos />
      </LancamentoProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const abrirNovo = async () => {
  const usuario = abrirApp()
  await usuario.click(screen.getByRole('button', { name: 'abrir novo' }))
  const folha = await screen.findByRole('dialog', { name: 'Novo lançamento' })
  // Espera as contas chegarem para as seleções terem opções
  await within(folha).findByRole('option', { name: 'Corrente' })
  return { usuario, folha }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso)
  fetchFalso.mockReset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 4, 21, 30))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('folha de novo lançamento', () => {
  it('começa como despesa, com a data de hoje', async () => {
    servir()
    const { folha } = await abrirNovo()
    expect(within(folha).getByRole('radio', { name: 'Despesa' })).toBeChecked()
    expect(within(folha).getByLabelText('Data')).toHaveValue('2026-10-04')
  })

  it('não oferece cartão como conta (lá a despesa entra como compra)', async () => {
    servir()
    const { folha } = await abrirNovo()
    const contas = within(within(folha).getByLabelText('Conta')).getAllByRole('option')
    expect(contas.map((opcao) => opcao.textContent)).toEqual(['Escolher', 'Corrente', 'Carteira'])
  })

  it('categorias acompanham o tipo', async () => {
    servir()
    const { usuario, folha } = await abrirNovo()
    const categorias = () => {
      return within(within(folha).getByLabelText('Categoria'))
        .getAllByRole('option')
        .map((opcao) => opcao.textContent)
    }
    expect(categorias()).toEqual(['Escolher', 'Mercado'])
    await usuario.click(within(folha).getByText('Receita'))
    expect(categorias()).toEqual(['Escolher', 'Salário'])
  })

  it('transferência troca categoria por "Para", sem a conta de origem', async () => {
    servir()
    const { usuario, folha } = await abrirNovo()
    await usuario.click(within(folha).getByText('Transferência'))
    await usuario.selectOptions(within(folha).getByLabelText('De'), 'Corrente')

    expect(within(folha).queryByLabelText('Categoria')).not.toBeInTheDocument()
    const destinos = within(within(folha).getByLabelText('Para')).getAllByRole('option')
    expect(destinos.map((opcao) => opcao.textContent)).toEqual(['Escolher', 'Carteira'])
  })

  it('salvar vazio aponta os campos e não chama a API', async () => {
    servir()
    const { usuario, folha } = await abrirNovo()
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(within(folha).getByText('Informe o valor.')).toBeInTheDocument()
    expect(within(folha).getByLabelText('Conta')).toHaveAccessibleDescription('Escolha a conta.')
    expect(pedidosDeEscrita()).toEqual([])
  })

  it('salvar uma despesa manda o texto do valor e fecha a folha', async () => {
    servir()
    const { usuario, folha } = await abrirNovo()
    await usuario.type(within(folha).getByLabelText('Valor'), '8430')
    await usuario.type(within(folha).getByLabelText('Descrição'), 'Feira')
    await usuario.selectOptions(within(folha).getByLabelText('Conta'), 'Corrente')
    await usuario.selectOptions(within(folha).getByLabelText('Categoria'), 'Mercado')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(pedidosDeEscrita()).toEqual([
      {
        metodo: 'POST',
        caminho: '/api/transacoes/',
        corpo: {
          tipo: 'despesa',
          valor: '84.30',
          data: '2026-10-04',
          descricao: 'Feira',
          conta: 1,
          conta_destino: null,
          categoria: 7,
        },
      },
    ])
  })

  it('erro da API aparece embaixo do campo certo e a folha continua aberta', async () => {
    servir(() => {
      return json({ valor: ['O valor precisa ser maior que zero.'] }, 400)
    })
    const { usuario, folha } = await abrirNovo()
    await usuario.type(within(folha).getByLabelText('Valor'), '1')
    await usuario.selectOptions(within(folha).getByLabelText('Conta'), 'Corrente')
    await usuario.selectOptions(within(folha).getByLabelText('Categoria'), 'Mercado')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await within(folha).findByText('O valor precisa ser maior que zero.'),
    ).toBeInTheDocument()
    expect(within(folha).getByLabelText('Valor')).toHaveAttribute('aria-invalid', 'true')
  })

  it('servidor fora do ar vira aviso geral', async () => {
    servir()
    const { usuario, folha } = await abrirNovo()
    fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await usuario.type(within(folha).getByLabelText('Valor'), '1')
    await usuario.selectOptions(within(folha).getByLabelText('Conta'), 'Corrente')
    await usuario.selectOptions(within(folha).getByLabelText('Categoria'), 'Mercado')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await within(folha).findByRole('alert')).toHaveTextContent('Confira se ele está ligado')
  })
})

describe('folha de edição', () => {
  const abrirEdicao = async () => {
    const usuario = abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'editar feira' }))
    const folha = await screen.findByRole('dialog', { name: 'Editar lançamento' })
    await within(folha).findByRole('option', { name: 'Corrente' })
    return { usuario, folha }
  }

  it('salvar manda PATCH para o lançamento', async () => {
    servir(() => json(FEIRA))
    const { usuario, folha } = await abrirEdicao()
    const descricao = within(folha).getByLabelText('Descrição')
    await usuario.clear(descricao)
    await usuario.type(descricao, 'Feira do sábado')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(pedidosDeEscrita()[0]).toMatchObject({
        metodo: 'PATCH',
        caminho: '/api/transacoes/5/',
        corpo: { descricao: 'Feira do sábado', valor: '84.30' },
      })
    })
  })

  it('apagar pede confirmação e manda DELETE', async () => {
    servir(() => new Response(null, { status: 204 }))
    const { usuario, folha } = await abrirEdicao()

    await usuario.click(within(folha).getByRole('button', { name: 'Apagar lançamento' }))
    expect(pedidosDeEscrita()).toEqual([])
    expect(within(folha).getByText('Apagar este lançamento?')).toBeInTheDocument()

    await usuario.click(within(folha).getByRole('button', { name: 'Apagar' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(pedidosDeEscrita()).toEqual([
      { metodo: 'DELETE', caminho: '/api/transacoes/5/', corpo: null },
    ])
  })

  it('"Manter" desiste de apagar', async () => {
    servir()
    const { usuario, folha } = await abrirEdicao()
    await usuario.click(within(folha).getByRole('button', { name: 'Apagar lançamento' }))
    await usuario.click(within(folha).getByRole('button', { name: 'Manter' }))
    expect(within(folha).getByRole('button', { name: 'Apagar lançamento' })).toBeInTheDocument()
    expect(pedidosDeEscrita()).toEqual([])
  })

  it('409 ao apagar mostra a mensagem do servidor', async () => {
    servir(() => json({ detail: 'Esta transação é o pagamento de uma fatura.' }, 409))
    const { usuario, folha } = await abrirEdicao()
    await usuario.click(within(folha).getByRole('button', { name: 'Apagar lançamento' }))
    await usuario.click(within(folha).getByRole('button', { name: 'Apagar' }))

    expect(await within(folha).findByRole('alert')).toHaveTextContent(
      'Esta transação é o pagamento de uma fatura.',
    )
  })
})
