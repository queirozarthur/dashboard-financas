import type { FC } from 'react'

import { Valor } from '@/core/ui'

import { textoDaVariacao } from '../comparacao'
import type { Dashboard } from '../consts/esquemas'

// Sobre o degradê tudo é branco: o vermelho de alerta não teria contraste ali,
// e o sinal "−" já diz quando o resultado é negativo
const BRANCO = 'text-sobre-marca'

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
    <section
      aria-label="Resultado do mês"
      className="mt-4 rounded-2xl bg-linear-to-br from-marca to-marca-escura p-5 text-sobre-marca shadow-flutuante"
    >
      <h2 className="text-subtitulo font-medium">Resultado de {nomeDoMes}</h2>
      <Valor
        className="mt-0.5 block text-titulo-grande font-bold tracking-tight text-sobre-marca"
        valor={dados.resultado}
      />
      <p className="mt-0.5 text-subtitulo">
        {textoDaVariacao(dados.variacao.resultado, nomeDoMesAnterior)}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-sobre-marca/25 pt-4">
        <div>
          <dt className="text-nota">Saldo nas contas</dt>
          <dd className="mt-0.5 font-semibold">
            <Valor className={BRANCO} valor={dados.saldo_total} />
          </dd>
        </div>
        <div>
          <dt className="text-nota">Projetado no mês</dt>
          <dd className="mt-0.5 font-semibold">
            <Valor className={BRANCO} valor={dados.previsto.resultado_projetado} />
          </dd>
        </div>
      </dl>
    </section>
  )
}
