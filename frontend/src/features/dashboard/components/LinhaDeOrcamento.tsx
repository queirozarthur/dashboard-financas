import { CircleAlert, TriangleAlert } from 'lucide-react'
import type { FC } from 'react'

import { cn, formatarDinheiro } from '@/core/utils'

import { situacaoDoOrcamento, temValor, type SituacaoDoOrcamento } from '../comparacao'
import type { LinhaDeOrcamento as Dados } from '../consts/esquemas'

const COR_DA_BARRA: Record<SituacaoDoOrcamento, string> = {
  tranquilo: 'bg-marca',
  perto: 'bg-aviso',
  estourado: 'bg-despesa',
}

type RestanteProps = {
  situacao: SituacaoDoOrcamento
  restante: string
}

// Situação nunca só pela cor: alerta vem com ícone e texto
const Restante: FC<RestanteProps> = ({ situacao, restante }) => {
  if (situacao === 'estourado') {
    return (
      <span className="flex shrink-0 items-center gap-1 text-subtitulo font-medium text-despesa">
        <CircleAlert aria-hidden="true" className="size-4" />
        Passou {formatarDinheiro(restante.slice(1))}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 text-subtitulo',
        situacao === 'perto' ? 'font-medium text-aviso' : 'text-conteudo-secundario',
      )}
    >
      {situacao === 'perto' ? <TriangleAlert aria-hidden="true" className="size-4" /> : null}
      Restam {formatarDinheiro(restante)}
    </span>
  )
}

type LinhaDeOrcamentoProps = {
  dados: Dados
}

export const LinhaDeOrcamento: FC<LinhaDeOrcamentoProps> = ({ dados }) => {
  const situacao = situacaoDoOrcamento(dados.restante, dados.percentual)

  return (
    <li className="group/linha pl-4">
      <div className="border-separador py-3 pr-4 group-not-first/linha:border-t">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate">{dados.categoria}</span>
          <Restante restante={dados.restante} situacao={situacao} />
        </div>

        {/* A barra é só visual: os números estão no texto logo abaixo */}
        <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-separador/50">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
              COR_DA_BARRA[situacao],
            )}
            // min(): a barra para em 100% mesmo quando o orçamento estoura (o texto diz quanto)
            style={{ width: `min(100%, ${dados.percentual ?? '0'}%)` }}
          />
        </div>

        <p className="mt-1.5 text-nota text-conteudo-secundario tabular-nums">
          {formatarDinheiro(dados.gasto)} de {formatarDinheiro(dados.limite)}
          {temValor(dados.previsto) ? ` · ${formatarDinheiro(dados.previsto)} previsto` : ''}
        </p>
      </div>
    </li>
  )
}
