import { useId, type FC, type FormEvent } from 'react'

import { useCategorias, useContas, type Categoria, type Conta } from '@/core/api'
import {
  Campo,
  CampoData,
  CampoSelecao,
  CampoValor,
  ConfirmacaoDeExclusao,
  ControleSegmentado,
  Folha,
  Grupo,
  type OpcaoDeSelecao,
} from '@/core/ui'

import { OPCOES_DE_PARCELAS } from '../consts/opcoes'
import type { ControleDaFolha } from '../hooks/useControleDaFolha'
import { useSimulacaoDaCompra } from '../hooks/useSimulacaoDaCompra'
import { DetalhesSomenteLeitura } from './DetalhesSomenteLeitura'
import { PreviaDasParcelas } from './PreviaDasParcelas'

const TIPOS = [
  { valor: 'receita', rotulo: 'Receita' },
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'transferencia', rotulo: 'Transferência' },
] as const

const comoOpcao = (item: Conta | Categoria): OpcaoDeSelecao => {
  return { valor: String(item.id), rotulo: item.nome }
}

const ehCartao = (conta: Conta): boolean => {
  return conta.tipo === 'cartao'
}

/**
 * Receita e transferência não passam pelo cartão. Na despesa nova, os cartões aparecem num
 * grupo à parte: escolher um deles transforma o lançamento numa compra parcelável.
 */
const opcoesDeConta = (contas: readonly Conta[], comCartoes: boolean): OpcaoDeSelecao[] => {
  const livres = contas.filter((conta) => {
    return !ehCartao(conta)
  })
  const cartoes = contas.filter(ehCartao)
  if (!comCartoes || cartoes.length === 0) {
    return livres.map(comoOpcao)
  }
  return [
    ...livres.map((conta) => {
      return { ...comoOpcao(conta), grupo: 'Contas' }
    }),
    ...cartoes.map((cartao) => {
      return { ...comoOpcao(cartao), grupo: 'Cartões de crédito' }
    }),
  ]
}

const tituloDaFolha = ({ editando, somenteLeitura }: ControleDaFolha): string => {
  if (!editando) {
    return 'Novo lançamento'
  }
  return somenteLeitura ? 'Lançamento' : 'Editar lançamento'
}

type FolhaDeLancamentoProps = {
  controle: ControleDaFolha
}

export const FolhaDeLancamento: FC<FolhaDeLancamentoProps> = ({ controle }) => {
  const idDoFormulario = useId()
  const contas = useContas()
  const categorias = useCategorias()
  const { formulario, erros, alterar, editando, somenteLeitura, compra } = controle
  const simulacao = useSimulacaoDaCompra(formulario, compra)

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    controle.salvar()
  }

  const todasAsContas = contas.data ?? []
  // Um lançamento salvo não vira compra: na edição, os cartões ficam de fora
  const contasDoTipo = opcoesDeConta(
    todasAsContas,
    formulario.tipo === 'despesa' && editando === null,
  )
  const opcoesDeDestino = opcoesDeConta(todasAsContas, false).filter((opcao) => {
    return opcao.valor !== formulario.conta
  })
  const opcoesDeCategoria = (categorias.data ?? [])
    .filter((categoria) => {
      return categoria.natureza === formulario.tipo
    })
    .map(comoOpcao)

  const botaoSalvar = (
    <button
      className="min-h-11 font-semibold text-marca outline-none focus-visible:underline disabled:opacity-40"
      disabled={controle.salvando}
      form={idDoFormulario}
      type="submit"
    >
      Salvar
    </button>
  )

  return (
    <Folha
      aberta={controle.aberta}
      acao={somenteLeitura ? null : botaoSalvar}
      aoMudarAberta={controle.setAberta}
      titulo={tituloDaFolha(controle)}
    >
      {editando && somenteLeitura ? (
        <DetalhesSomenteLeitura motivo={somenteLeitura} transacao={editando} />
      ) : (
        <form id={idDoFormulario} noValidate onSubmit={enviar}>
          <ControleSegmentado
            aoMudar={controle.mudarTipo}
            nome="tipo-do-lancamento"
            opcoes={TIPOS}
            rotulo="Tipo de lançamento"
            valor={formulario.tipo}
          />
          {erros.geral ? (
            <p className="mt-4 px-4 text-subtitulo text-despesa" role="alert">
              {erros.geral}
            </p>
          ) : null}
          <Grupo>
            <CampoValor
              aoMudar={(valor) => {
                alterar('valor', valor)
              }}
              erro={erros.valor}
              rotulo={compra ? 'Valor total' : 'Valor'}
              valor={formulario.valor}
            />
            <Campo
              erro={erros.descricao}
              maxLength={200}
              onChange={(evento) => {
                alterar('descricao', evento.target.value)
              }}
              placeholder="Opcional"
              rotulo="Descrição"
              value={formulario.descricao}
            />
          </Grupo>
          <Grupo>
            <CampoData
              erro={erros.data}
              onChange={(evento) => {
                alterar('data', evento.target.value)
              }}
              rotulo="Data"
              value={formulario.data}
            />
            <CampoSelecao
              erro={erros.conta}
              onChange={(evento) => {
                alterar('conta', evento.target.value)
              }}
              opcoes={contasDoTipo}
              rotulo={formulario.tipo === 'transferencia' ? 'De' : 'Conta'}
              value={formulario.conta}
            />
            {compra ? (
              <CampoSelecao
                erro={erros.parcelas}
                onChange={(evento) => {
                  alterar('parcelas', evento.target.value)
                }}
                opcoes={OPCOES_DE_PARCELAS}
                rotulo="Parcelas"
                value={formulario.parcelas}
              />
            ) : null}
            {formulario.tipo === 'transferencia' ? (
              <CampoSelecao
                erro={erros.contaDestino}
                onChange={(evento) => {
                  alterar('contaDestino', evento.target.value)
                }}
                opcoes={opcoesDeDestino}
                rotulo="Para"
                value={formulario.contaDestino}
              />
            ) : (
              <CampoSelecao
                erro={erros.categoria}
                onChange={(evento) => {
                  alterar('categoria', evento.target.value)
                }}
                opcoes={opcoesDeCategoria}
                rotulo="Categoria"
                value={formulario.categoria}
              />
            )}
          </Grupo>
          {compra ? (
            <PreviaDasParcelas
              atualizando={simulacao.isPlaceholderData || simulacao.isFetching}
              parcelas={simulacao.data?.parcelas}
            />
          ) : null}
          {editando ? (
            <ConfirmacaoDeExclusao
              apagando={controle.apagando}
              aoApagar={controle.apagar}
              pergunta="Apagar este lançamento?"
              rotulo="Apagar lançamento"
            />
          ) : null}
        </form>
      )}
    </Folha>
  )
}
