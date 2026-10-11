import { useId, type FC, type FormEvent } from 'react'

import type { Conta } from '@/core/api'
import { BotaoDaBarra, CampoData, CampoSelecao, Folha, Grupo } from '@/core/ui'
import { formatarDinheiro } from '@/core/utils'

import type { ControleDoPagamento } from '../hooks/useFolhaDePagamento'
import { contasQuePagam } from '../pagamento'

type FolhaDePagamentoProps = {
  controle: ControleDoPagamento
  contas: readonly Conta[]
  /** Total da fatura, como veio da API; é o que será pago */
  total: string
  /** Ex.: "Fatura de novembro do Nubank" */
  descricao: string
}

export const FolhaDePagamento: FC<FolhaDePagamentoProps> = ({
  controle,
  contas,
  total,
  descricao,
}) => {
  const idDoFormulario = useId()
  const { formulario, erros, alterar } = controle

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    controle.pagar()
  }

  const opcoes = contasQuePagam(contas).map((conta) => {
    return { valor: String(conta.id), rotulo: conta.nome }
  })

  return (
    <Folha
      aberta={controle.aberta}
      acao={
        <BotaoDaBarra destaque disabled={controle.pagando} form={idDoFormulario} type="submit">
          Pagar
        </BotaoDaBarra>
      }
      aoMudarAberta={controle.setAberta}
      titulo="Pagar fatura"
    >
      <form id={idDoFormulario} noValidate onSubmit={enviar}>
        <div className="flex flex-col items-center pt-2 pb-2 text-center">
          <p className="text-titulo-grande font-bold tracking-tight tabular-nums">
            {formatarDinheiro(total)}
          </p>
          <p className="text-subtitulo text-conteudo-secundario">{descricao}</p>
        </div>
        {erros.geral ? (
          <p className="mt-2 px-4 text-subtitulo text-despesa" role="alert">
            {erros.geral}
          </p>
        ) : null}
        <Grupo rodape="O pagamento é uma transferência da conta para o cartão: não entra como despesa, porque as compras já entraram.">
          <CampoSelecao
            erro={erros.conta}
            onChange={(evento) => {
              alterar('conta', evento.target.value)
            }}
            opcoes={opcoes}
            rotulo="Pagar com"
            value={formulario.conta}
          />
          <CampoData
            erro={erros.data}
            onChange={(evento) => {
              alterar('data', evento.target.value)
            }}
            rotulo="Data"
            value={formulario.data}
          />
        </Grupo>
      </form>
    </Folha>
  )
}
