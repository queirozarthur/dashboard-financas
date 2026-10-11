import type { FC } from 'react'

import { Grupo, Linha, ValorComNota } from '@/core/ui'
import { cn, dataCurta, lerData, mesDe, nomeDoMes } from '@/core/utils'

import type { ParcelaSimulada } from '../consts/esquemas'

type DetalheDaParcelaProps = {
  parcela: ParcelaSimulada
}

const DetalheDaParcela: FC<DetalheDaParcelaProps> = ({ parcela }) => {
  if (parcela.fatura_paga) {
    // Alerta com texto, não só com cor
    return <span className="text-despesa">Esta fatura já foi paga</span>
  }
  // O mês e o ano já estão no título da linha
  return <>Vence em {dataCurta(parcela.vencimento)}</>
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
              detalhe={<DetalheDaParcela parcela={parcela} />}
              key={parcela.numero}
              rotulo={nomeDoMes(mesDe(lerData(parcela.vencimento)))}
              valor={
                <ValorComNota
                  nota={parcelada ? parcela.numero : null}
                  rotuloDaNota="parcela"
                  valor={parcela.valor}
                />
              }
            />
          )
        })}
      </Grupo>
    </div>
  )
}
