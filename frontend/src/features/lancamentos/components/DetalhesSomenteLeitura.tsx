import type { FC } from 'react'

import { Grupo, Linha, Valor } from '@/core/ui'

import { detalheDoLancamento, tituloDoLancamento } from '../apresentacao'
import type { Transacao } from '../consts/esquemas'

const formatoDaData = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dataLegivel = (texto: string): string => {
  const [ano = 0, mes = 1, dia = 1] = texto.split('-').map(Number)
  return formatoDaData.format(new Date(ano, mes - 1, dia))
}

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
      <Linha rotulo="Data" valor={dataLegivel(transacao.data)} />
      <Linha rotulo="Onde" valor={detalheDoLancamento(transacao)} />
    </Grupo>
  )
}
