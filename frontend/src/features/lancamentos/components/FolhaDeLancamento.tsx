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

import type { ControleDaFolha } from '../hooks/useControleDaFolha'
import { DetalhesSomenteLeitura } from './DetalhesSomenteLeitura'

const TIPOS = [
  { valor: 'receita', rotulo: 'Receita' },
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'transferencia', rotulo: 'Transferência' },
] as const

const comoOpcao = (item: Conta | Categoria): OpcaoDeSelecao => {
  return { valor: String(item.id), rotulo: item.nome }
}

// Cartão fica de fora: lá a despesa entra como compra (aba Cartões)
const contasLivres = (contas: readonly Conta[]): Conta[] => {
  return contas.filter((conta) => {
    return conta.tipo !== 'cartao'
  })
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
  const { formulario, erros, alterar, editando, somenteLeitura } = controle

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    controle.salvar()
  }

  const opcoesDeConta = contasLivres(contas.data ?? []).map(comoOpcao)
  const opcoesDeDestino = opcoesDeConta.filter((opcao) => {
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
              rotulo="Valor"
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
              opcoes={opcoesDeConta}
              rotulo={formulario.tipo === 'transferencia' ? 'De' : 'Conta'}
              value={formulario.conta}
            />
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
