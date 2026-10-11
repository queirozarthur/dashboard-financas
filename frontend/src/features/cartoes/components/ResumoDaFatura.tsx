import { CircleAlert, CircleCheck, Clock, type LucideIcon } from 'lucide-react'
import { Fragment, type FC } from 'react'

import type { Conta } from '@/core/api'
import { Botao, IconeDoCadastro } from '@/core/ui'
import { cn, formatarDinheiro } from '@/core/utils'

import type { Fatura } from '../consts/esquemas'
import { datasDaFatura, podePagar, type SituacaoDaFatura } from '../situacao'

type Selo = {
  texto: string
  classes: string
  Icone?: LucideIcon
}

// Situação nunca só pela cor: sempre com texto, e alerta com ícone
const SELOS: Record<SituacaoDaFatura, Selo> = {
  aberta: { texto: 'Aberta', classes: 'text-conteudo-secundario' },
  fechada: { texto: 'Fechada', classes: 'text-aviso', Icone: Clock },
  vencida: { texto: 'Vencida', classes: 'text-despesa', Icone: CircleAlert },
  paga: { texto: 'Paga', classes: 'text-marca', Icone: CircleCheck },
  'sem-compras': { texto: 'Sem compras', classes: 'text-conteudo-secundario' },
}

type ResumoDaFaturaProps = {
  cartao: Conta
  fatura: Fatura
  situacao: SituacaoDaFatura
  aoPagar: () => void
}

/** O topo da tela do cartão: total da fatura do mês, situação, datas e o botão de pagar. */
export const ResumoDaFatura: FC<ResumoDaFaturaProps> = ({ cartao, fatura, situacao, aoPagar }) => {
  const { texto, classes, Icone } = SELOS[situacao]

  return (
    <section aria-label="Fatura" className="mt-4 rounded-2xl bg-superficie p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5 font-semibold">
          <IconeDoCadastro cor={cartao.cor} icone={cartao.icone} />
          <span className="truncate">{cartao.nome}</span>
        </span>
        <span
          className={cn('flex shrink-0 items-center gap-1 text-subtitulo font-medium', classes)}
        >
          {Icone ? <Icone aria-hidden="true" className="size-4" /> : null}
          {texto}
        </span>
      </div>
      {/* O total vem pronto do backend: aqui ele só é formatado */}
      <p className="mt-3 text-titulo-grande font-bold tracking-tight tabular-nums">
        {formatarDinheiro(fatura.total)}
      </p>
      <p className="mt-0.5 text-subtitulo text-conteudo-secundario">
        {datasDaFatura(fatura, situacao).map((frase, indice) => {
          // Cada frase inteira numa linha: no celular, a quebra cai no " · ", não numa data
          return (
            <Fragment key={frase}>
              {indice > 0 ? ' · ' : null}
              <span className="whitespace-nowrap">{frase}</span>
            </Fragment>
          )
        })}
      </p>
      {podePagar(situacao) ? (
        <Botao className="mt-4" largura="total" onClick={aoPagar}>
          Pagar fatura
        </Botao>
      ) : null}
    </section>
  )
}
