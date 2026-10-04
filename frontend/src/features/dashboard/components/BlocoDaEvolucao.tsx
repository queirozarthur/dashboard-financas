import type { FC } from 'react'

import { AvisoDeErro } from '@/core/ui'
import type { Mes } from '@/core/utils'

import { useEvolucao } from '../hooks/useEvolucao'
import { GraficoDaEvolucao } from './GraficoDaEvolucao'

type BlocoDaEvolucaoProps = {
  mes: Mes
}

/** Busca à parte da dashboard: se a evolução falhar, o resto do mês continua na tela. */
export const BlocoDaEvolucao: FC<BlocoDaEvolucaoProps> = ({ mes }) => {
  const consulta = useEvolucao(mes)

  if (consulta.isPending) {
    return (
      <div aria-busy="true" className="mt-8 motion-safe:animate-pulse">
        <span className="sr-only">Carregando os últimos meses…</span>
        <div className="h-4 w-28 rounded bg-separador/50" />
        <div className="mt-2 h-72 rounded-xl bg-superficie" />
      </div>
    )
  }
  if (consulta.isError) {
    return (
      <AvisoDeErro
        aoTentarDeNovo={() => {
          void consulta.refetch()
        }}
        titulo="Não foi possível carregar os últimos meses"
      />
    )
  }
  return (
    <GraficoDaEvolucao desatualizado={consulta.isPlaceholderData} meses={consulta.data.meses} />
  )
}
