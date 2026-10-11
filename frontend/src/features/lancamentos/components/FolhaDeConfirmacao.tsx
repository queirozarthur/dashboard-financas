import { ArrowLeftRight } from 'lucide-react'
import { useId, type FC, type FormEvent } from 'react'

import { useContas } from '@/core/api'
import {
  BotaoDaBarra,
  CampoData,
  CampoSelecao,
  CampoValor,
  Folha,
  Grupo,
  IconeColorido,
  IconeDoCadastro,
} from '@/core/ui'
import { dataPorExtenso } from '@/core/utils'

import type { Prevista } from '../consts/esquemas'
import type { ControleDaConfirmacao } from '../hooks/useConfirmacao'

type CabecalhoProps = {
  prevista: Prevista
}

const Cabecalho: FC<CabecalhoProps> = ({ prevista }) => {
  return (
    <div className="flex flex-col items-center gap-2 pt-2 pb-2 text-center">
      {prevista.categoria_cor && prevista.categoria_icone ? (
        <IconeDoCadastro
          cor={prevista.categoria_cor}
          icone={prevista.categoria_icone}
          tamanho="grande"
        />
      ) : (
        <IconeColorido Icone={ArrowLeftRight} cor="marca" tamanho="grande" />
      )}
      <p className="max-w-full truncate font-semibold">{prevista.descricao}</p>
      <p className="text-subtitulo text-conteudo-secundario">
        Previsto para {dataPorExtenso(prevista.data)}
        {prevista.categoria_nome ? ` · ${prevista.categoria_nome}` : ''}
      </p>
    </div>
  )
}

type FolhaDeConfirmacaoProps = {
  controle: ControleDaConfirmacao
}

/** Confirmar uma recorrência do mês: vira um lançamento de verdade. */
export const FolhaDeConfirmacao: FC<FolhaDeConfirmacaoProps> = ({ controle }) => {
  const idDoFormulario = useId()
  const contas = useContas()
  const { prevista, formulario, erros, alterar } = controle

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    controle.confirmar()
  }

  const transferencia = prevista?.tipo === 'transferencia'
  // Nem a conta nem o destino da transferência podem ser cartão; o destino não muda aqui
  const opcoesDeConta = (contas.data ?? [])
    .filter((conta) => {
      return conta.tipo !== 'cartao' && conta.id !== prevista?.conta_destino
    })
    .map((conta) => {
      return { valor: String(conta.id), rotulo: conta.nome }
    })

  return (
    <Folha
      aberta={controle.aberta}
      acao={
        <BotaoDaBarra destaque disabled={controle.confirmando} form={idDoFormulario} type="submit">
          Confirmar
        </BotaoDaBarra>
      }
      aoMudarAberta={controle.setAberta}
      titulo="Previsto"
    >
      {prevista ? (
        <form id={idDoFormulario} noValidate onSubmit={enviar}>
          <Cabecalho prevista={prevista} />
          {erros.geral ? (
            <p className="mt-2 px-4 text-subtitulo text-despesa" role="alert">
              {erros.geral}
            </p>
          ) : null}
          <Grupo
            rodape={
              transferencia
                ? `Vai para ${prevista.conta_destino_nome ?? 'a conta de destino'}. Confira o valor e a data: pode ter sido diferente do previsto.`
                : 'Confira o valor e a data: o que aconteceu pode ter sido diferente do previsto.'
            }
          >
            <CampoValor
              aoMudar={(valor) => {
                alterar('valor', valor)
              }}
              erro={erros.valor}
              rotulo="Valor"
              valor={formulario.valor}
            />
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
              rotulo={transferencia ? 'De' : 'Conta'}
              value={formulario.conta}
            />
          </Grupo>
        </form>
      ) : null}
    </Folha>
  )
}
