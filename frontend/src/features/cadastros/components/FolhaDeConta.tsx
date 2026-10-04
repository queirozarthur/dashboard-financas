import { useId, type FC, type FormEvent } from 'react'

import {
  BotaoDaBarra,
  Campo,
  CampoSelecao,
  CampoValor,
  ConfirmacaoDeExclusao,
  Folha,
  Grupo,
  SeletorDeCor,
  SeletorDeIcone,
} from '@/core/ui'

import { DIAS_DO_MES, TIPOS_DE_CONTA, type TipoDeConta } from '../consts/opcoes'
import { trocarTipoDaConta } from '../formularios'
import type { ControleDaFolhaDeConta } from '../hooks/useFolhas'
import { PreviaDoCadastro } from './PreviaDoCadastro'

// O <select> entrega texto; só aceita os tipos que existem (sem forçar o tipo com "as")
const ehTipoDeConta = (valor: string): valor is TipoDeConta => {
  return TIPOS_DE_CONTA.some((tipo) => {
    return tipo.valor === valor
  })
}

type FolhaDeContaProps = {
  controle: ControleDaFolhaDeConta
}

export const FolhaDeConta: FC<FolhaDeContaProps> = ({ controle }) => {
  const idDoFormulario = useId()
  const { formulario, erros, alterar, transformar, editando } = controle
  const cartao = formulario.tipo === 'cartao'

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    controle.salvar()
  }

  return (
    <Folha
      aberta={controle.aberta}
      acao={
        <BotaoDaBarra destaque disabled={controle.salvando} form={idDoFormulario} type="submit">
          Salvar
        </BotaoDaBarra>
      }
      aoMudarAberta={controle.setAberta}
      titulo={editando ? 'Editar conta' : 'Nova conta'}
    >
      <form id={idDoFormulario} noValidate onSubmit={enviar}>
        <PreviaDoCadastro
          cor={formulario.cor}
          icone={formulario.icone}
          nome={formulario.nome}
          semNome="Nova conta"
        />
        {erros.geral ? (
          <p className="px-4 text-subtitulo text-despesa" role="alert">
            {erros.geral}
          </p>
        ) : null}

        <Grupo
          rodape={
            cartao
              ? 'A dívida do cartão vem das compras e faturas, por isso ele começa sempre em zero.'
              : 'Quanto havia na conta antes do primeiro lançamento no app.'
          }
        >
          <Campo
            erro={erros.nome}
            maxLength={60}
            onChange={(evento) => {
              alterar('nome', evento.target.value)
            }}
            placeholder="Ex.: Nubank, Carteira"
            rotulo="Nome"
            value={formulario.nome}
          />
          <CampoSelecao
            erro={erros.tipo}
            onChange={(evento) => {
              const tipo = evento.target.value
              if (ehTipoDeConta(tipo)) {
                transformar((anterior) => {
                  return trocarTipoDaConta(anterior, tipo)
                })
              }
            }}
            opcoes={TIPOS_DE_CONTA}
            rotulo="Tipo"
            value={formulario.tipo}
          />
          {cartao ? (
            <>
              <CampoSelecao
                erro={erros.diaFechamento}
                onChange={(evento) => {
                  alterar('diaFechamento', evento.target.value)
                }}
                opcoes={DIAS_DO_MES}
                rotulo="Fecha dia"
                value={formulario.diaFechamento}
              />
              <CampoSelecao
                erro={erros.diaVencimento}
                onChange={(evento) => {
                  alterar('diaVencimento', evento.target.value)
                }}
                opcoes={DIAS_DO_MES}
                rotulo="Vence dia"
                value={formulario.diaVencimento}
              />
            </>
          ) : (
            <CampoValor
              aoMudar={(valor) => {
                alterar('saldoInicial', valor)
              }}
              erro={erros.saldoInicial}
              permiteNegativo
              rotulo="Saldo inicial"
              valor={formulario.saldoInicial}
            />
          )}
        </Grupo>

        <SeletorDeCor
          aoMudar={(cor) => {
            alterar('cor', cor)
          }}
          nome="cor-da-conta"
          valor={formulario.cor}
        />
        <SeletorDeIcone
          aoMudar={(icone) => {
            alterar('icone', icone)
          }}
          cor={formulario.cor}
          nome="icone-da-conta"
          valor={formulario.icone}
        />

        {editando ? (
          <ConfirmacaoDeExclusao
            apagando={controle.apagando}
            aoApagar={controle.apagar}
            pergunta="Apagar esta conta?"
            rotulo="Apagar conta"
          />
        ) : null}
      </form>
    </Folha>
  )
}
