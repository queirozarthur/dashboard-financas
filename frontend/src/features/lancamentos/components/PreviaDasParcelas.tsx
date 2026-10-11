import type { FC } from 'react'

import { Grupo, Linha, Valor } from '@/core/ui'
import { cn, dataPorExtenso, lerData, mesDe, nomeDoMes } from '@/core/utils'

import type { ParcelaSimulada } from '../consts/esquemas'

type DetalheDaParcelaProps = {
  parcela: ParcelaSimulada
  parcelada: boolean
}

const DetalheDaParcela: FC<DetalheDaParcelaProps> = ({ parcela, parcelada }) => {
  if (parcela.fatura_paga) {
    // Alerta com texto, não só com cor
    return <span className="text-despesa">Esta fatura já foi paga</span>
  }
  const vence = `vence em ${dataPorExtenso(parcela.vencimento)}`
  return <>{parcelada ? `Parcela ${parcela.numero} · ${vence}` : vence}</>
}

type PreviaDasParcelasProps = {
  parcelas: readonly ParcelaSimulada[] | undefined
  /** A simulação está sendo refeita com os dados novos: a anterior fica apagada */
  atualizando: boolean
}

/** Antes de salvar a compra: em qual fatura cai cada parcela, como o backend calculou. */
export const PreviaDasParcelas: FC<PreviaDasParcelasProps> = ({ parcelas, atualizando }) => {
  if (!parcelas || parcelas.length === 0) {
    return null
  }
  const parcelada = parcelas.length > 1
  const emFaturaPaga = parcelas.some((parcela) => {
    return parcela.fatura_paga
  })

  return (
    <div
      aria-busy={atualizando}
      className={cn('transition-opacity duration-200', atualizando && 'opacity-60')}
    >
      <Grupo
        rodape={
          emFaturaPaga
            ? 'Uma fatura já paga não recebe compras novas: confira a data da compra.'
            : 'Cada parcela entra na fatura do mês em que vence.'
        }
        titulo={parcelada ? 'Faturas das parcelas' : 'Fatura'}
      >
        {parcelas.map((parcela) => {
          return (
            <Linha
              detalhe={<DetalheDaParcela parcela={parcela} parcelada={parcelada} />}
              key={parcela.numero}
              rotulo={nomeDoMes(mesDe(lerData(parcela.vencimento)))}
              valor={<Valor valor={parcela.valor} />}
            />
          )
        })}
      </Grupo>
    </div>
  )
}
