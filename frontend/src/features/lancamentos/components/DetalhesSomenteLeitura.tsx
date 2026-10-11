import type { FC } from 'react'

import { Grupo, Linha, Valor } from '@/core/ui'
import { dataPorExtenso } from '@/core/utils'

import { detalheDoLancamento, tituloDoLancamento } from '../apresentacao'
import type { Transacao } from '../consts/esquemas'

type DetalhesSomenteLeituraProps = {
  transacao: Transacao
  motivo: string
}

/** Parcela ou pagamento de fatura: mostra o que é e explica onde mudar. */
export const DetalhesSomenteLeitura: FC<DetalhesSomenteLeituraProps> = ({ transacao, motivo }) => {
  return (
    <Grupo rodape={motivo}>
      <Linha
        rotulo={tituloDoLancamento(transacao)}
        valor={
          <Valor
            tom={transacao.tipo === 'despesa' ? 'despesa' : 'neutro'}
            valor={transacao.valor}
          />
        }
      />
      <Linha rotulo="Data" valor={dataPorExtenso(transacao.data, { comAno: true })} />
      <Linha rotulo="Onde" valor={detalheDoLancamento(transacao)} />
    </Grupo>
  )
}
