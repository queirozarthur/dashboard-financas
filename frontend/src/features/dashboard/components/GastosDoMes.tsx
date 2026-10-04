import type { FC } from 'react'

import { Grupo } from '@/core/ui'
import { formatarDinheiro } from '@/core/utils'

import { temValor } from '../comparacao'
import type { Dashboard } from '../consts/esquemas'

type FixoEVariavelProps = {
  fixo: string
  variavel: string
}

/** Uma barra dividida em duas partes: quanto das despesas é fixo e quanto é variável. */
const FixoEVariavel: FC<FixoEVariavelProps> = ({ fixo, variavel }) => {
  return (
    <section aria-label="Despesas fixas e variáveis" className="mt-8">
      <h2 className="mb-1.5 px-4 text-nota text-conteudo-secundario uppercase">Fixo e variável</h2>
      <div className="rounded-xl bg-superficie p-4">
        {/* flex-grow proporcional ao valor: o navegador calcula a divisão, o frontend não soma.
            gap-0.5 = os 2px de superfície entre partes que se tocam (skill dataviz) */}
        <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-sm">
          {temValor(fixo) ? (
            <div className="bg-serie-despesa" style={{ flexGrow: Number(fixo) }} />
          ) : null}
          {temValor(variavel) ? (
            <div className="bg-serie-variavel" style={{ flexGrow: Number(variavel) }} />
          ) : null}
        </div>
        {/* Legenda sempre presente com 2 séries; a amostra tem a cor, o texto não */}
        <dl className="mt-3 grid grid-cols-2 gap-4 text-subtitulo">
          <div>
            <dt className="flex items-center gap-1.5 text-conteudo-secundario">
              <span aria-hidden="true" className="size-2.5 rounded-xs bg-serie-despesa" />
              Fixo
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatarDinheiro(fixo)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-conteudo-secundario">
              <span aria-hidden="true" className="size-2.5 rounded-xs bg-serie-variavel" />
              Variável
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatarDinheiro(variavel)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

type CategoriaProps = {
  dados: Dashboard['gastos_por_categoria'][number]
}

const LinhaDaCategoria: FC<CategoriaProps> = ({ dados }) => {
  return (
    <li className="group/linha pl-4">
      <div className="border-separador py-2.5 pr-4 group-not-first/linha:border-t">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate">{dados.categoria}</span>
          <span className="shrink-0 text-conteudo-secundario tabular-nums">
            {formatarDinheiro(dados.total)}
            <span className="ml-2 inline-block w-11 text-right text-nota">
              {dados.percentual.replace('.', ',')}%
            </span>
          </span>
        </div>
        {/* Uma série só: sem legenda, o título do bloco já diz o que é. Ponta arredondada,
            base reta; a largura é a fatia da categoria no total de despesas do mês */}
        <div aria-hidden="true" className="mt-1.5 h-1.5">
          <div
            className="h-full rounded-r-sm bg-serie-despesa transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${dados.percentual}%` }}
          />
        </div>
      </div>
    </li>
  )
}

type GastosDoMesProps = {
  dados: Dashboard
}

export const GastosDoMes: FC<GastosDoMesProps> = ({ dados }) => {
  const { fixo, variavel } = dados.fixo_variavel
  if (dados.gastos_por_categoria.length === 0) {
    return null
  }
  return (
    <>
      <FixoEVariavel fixo={fixo} variavel={variavel} />
      <Grupo titulo="Gastos por categoria">
        {dados.gastos_por_categoria.map((categoria) => {
          return <LinhaDaCategoria dados={categoria} key={categoria.categoria_id} />
        })}
      </Grupo>
    </>
  )
}
