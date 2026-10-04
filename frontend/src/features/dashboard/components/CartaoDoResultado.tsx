import type { FC } from 'react'

import { Valor } from '@/core/ui'

import { textoDaVariacao } from '../comparacao'
import type { Dashboard } from '../consts/esquemas'

type CartaoDoResultadoProps = {
  dados: Dashboard
  nomeDoMes: string
  nomeDoMesAnterior: string
}

/** Destaque do topo: quanto sobrou (ou faltou) no mês, saldo nas contas e a projeção. */
export const CartaoDoResultado: FC<CartaoDoResultadoProps> = ({
  dados,
  nomeDoMes,
  nomeDoMesAnterior,
}) => {
  return (
    <section aria-label="Resultado do mês" className="mt-4 rounded-2xl bg-superficie p-5">
      <h2 className="text-subtitulo text-conteudo-secundario">Resultado de {nomeDoMes}</h2>
      <Valor
        className="mt-0.5 block text-titulo-grande font-bold tracking-tight"
        valor={dados.resultado}
      />
      <p className="mt-0.5 text-subtitulo text-conteudo-secundario">
        {textoDaVariacao(dados.variacao.resultado, nomeDoMesAnterior)}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-separador pt-4">
        <div>
          <dt className="text-nota text-conteudo-secundario">Saldo nas contas</dt>
          <dd className="mt-0.5 font-semibold">
            <Valor valor={dados.saldo_total} />
          </dd>
        </div>
        <div>
          <dt className="text-nota text-conteudo-secundario">Projetado no mês</dt>
          <dd className="mt-0.5 font-semibold">
            <Valor valor={dados.previsto.resultado_projetado} />
          </dd>
        </div>
      </dl>
    </section>
  )
}
