import { useId, type FC, type FormEvent } from 'react'

import { useCategorias, useContas } from '@/core/api'
import {
  BotaoDaBarra,
  Campo,
  CampoInterruptor,
  CampoMes,
  CampoSelecao,
  CampoValor,
  ConfirmacaoDeExclusao,
  ControleSegmentado,
  Folha,
  Grupo,
} from '@/core/ui'

import { DIAS_DO_MES, TIPOS_DE_RECORRENCIA } from '../consts/opcoes'
import type { ControleDaFolhaDeRecorrencia } from '../hooks/useFolhas'
import { trocarTipoDaRecorrencia } from '../recorrencias'
import { MensagemDeErro } from './MensagemDeErro'

type FolhaDeRecorrenciaProps = {
  controle: ControleDaFolhaDeRecorrencia
}

export const FolhaDeRecorrencia: FC<FolhaDeRecorrenciaProps> = ({ controle }) => {
  const idDoFormulario = useId()
  const contas = useContas()
  const categorias = useCategorias()
  const { formulario, erros, alterar, transformar, editando } = controle
  const transferencia = formulario.tipo === 'transferencia'

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    controle.salvar()
  }

  // Recorrência nunca é no cartão: lá a despesa entra como compra, na fatura certa
  const opcoesDeConta = (contas.data ?? [])
    .filter((conta) => {
      return conta.tipo !== 'cartao'
    })
    .map((conta) => {
      return { valor: String(conta.id), rotulo: conta.nome }
    })
  const opcoesDeDestino = opcoesDeConta.filter((opcao) => {
    return opcao.valor !== formulario.conta
  })
  const opcoesDeCategoria = (categorias.data ?? [])
    .filter((categoria) => {
      return categoria.natureza === formulario.tipo
    })
    .map((categoria) => {
      return { valor: String(categoria.id), rotulo: categoria.nome }
    })

  return (
    <Folha
      aberta={controle.aberta}
      acao={
        <BotaoDaBarra destaque disabled={controle.salvando} form={idDoFormulario} type="submit">
          Salvar
        </BotaoDaBarra>
      }
      aoMudarAberta={controle.setAberta}
      titulo={editando ? 'Editar recorrência' : 'Nova recorrência'}
    >
      <form id={idDoFormulario} noValidate onSubmit={enviar}>
        <ControleSegmentado
          aoMudar={(tipo) => {
            transformar((anterior) => {
              return trocarTipoDaRecorrencia(anterior, tipo)
            })
          }}
          nome="tipo-da-recorrencia"
          opcoes={TIPOS_DE_RECORRENCIA}
          rotulo="Tipo de recorrência"
          valor={formulario.tipo}
        />
        <MensagemDeErro mensagem={erros.tipo} />
        {erros.geral ? (
          <p className="mt-4 px-4 text-subtitulo text-despesa" role="alert">
            {erros.geral}
          </p>
        ) : null}

        <Grupo>
          <Campo
            erro={erros.descricao}
            maxLength={200}
            onChange={(evento) => {
              alterar('descricao', evento.target.value)
            }}
            placeholder="Ex.: Aluguel, Salário"
            rotulo="Nome"
            value={formulario.descricao}
          />
          <CampoValor
            aoMudar={(valor) => {
              alterar('valor', valor)
            }}
            erro={erros.valor}
            rotulo="Valor"
            valor={formulario.valor}
          />
        </Grupo>

        <Grupo rodape="Em mês mais curto, o dia 31 vira o último dia do mês.">
          <CampoSelecao
            erro={erros.dia}
            onChange={(evento) => {
              alterar('dia', evento.target.value)
            }}
            opcoes={DIAS_DO_MES}
            rotulo="Todo dia"
            value={formulario.dia}
          />
          <CampoSelecao
            erro={erros.conta}
            onChange={(evento) => {
              alterar('conta', evento.target.value)
            }}
            opcoes={opcoesDeConta}
            rotulo={transferencia ? 'De' : 'Conta'}
            value={formulario.conta}
          />
          {transferencia ? (
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

        <Grupo rodape="Todo mês ela aparece em Lançamentos como prevista, até você confirmar.">
          <CampoMes
            erro={erros.inicio}
            onChange={(evento) => {
              alterar('inicio', evento.target.value)
            }}
            rotulo="Começa em"
            value={formulario.inicio}
          />
          <CampoInterruptor
            aoMudar={(ligado) => {
              // Começa no mês de início, para o campo não aparecer vazio
              transformar((anterior) => {
                return {
                  ...anterior,
                  temFim: ligado,
                  fim: ligado && !anterior.fim ? anterior.inicio : anterior.fim,
                }
              })
            }}
            ligado={formulario.temFim}
            rotulo="Tem um último mês"
          />
          {formulario.temFim ? (
            <CampoMes
              erro={erros.fim}
              min={formulario.inicio || undefined}
              onChange={(evento) => {
                alterar('fim', evento.target.value)
              }}
              rotulo="Último mês"
              value={formulario.fim}
            />
          ) : null}
        </Grupo>

        {editando ? (
          <ConfirmacaoDeExclusao
            apagando={controle.apagando}
            aoApagar={controle.apagar}
            aviso="Os lançamentos já confirmados continuam; só os meses previstos somem."
            pergunta="Apagar esta recorrência?"
            rotulo="Apagar recorrência"
          />
        ) : null}
      </form>
    </Folha>
  )
}
