import type { FC } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'

import { Grupo, Valor } from '@/core/ui'
import { cn, formatarDinheiro, lerMes, nomeDoMes } from '@/core/utils'

import type { MesDaEvolucao } from '../consts/esquemas'
import { paraOGrafico, valorCompacto, type PontoDoGrafico } from '../grafico'

// Barras com no máximo 24px e 2px de superfície entre as duas de cada mês (skill dataviz)
const ESPESSURA_MAXIMA = 24
const ESPACO_ENTRE_BARRAS = 2
// Ponta arredondada (4px), base reta
const CANTOS: [number, number, number, number] = [4, 4, 0, 0]

const SERIES = [
  { chave: 'receitas', nome: 'Receitas', cor: 'bg-receita', preenchimento: 'fill-receita' },
  {
    chave: 'despesas',
    nome: 'Despesas',
    cor: 'bg-serie-despesa',
    preenchimento: 'fill-serie-despesa',
  },
] as const

const nomeCompleto = (texto: string): string => {
  const mes = lerMes(texto)
  return mes ? nomeDoMes(mes) : texto
}

type DicaProps = TooltipContentProps & {
  pontos: readonly PontoDoGrafico[]
}

/** Toque numa coluna: o valor vem primeiro e forte, o nome da série depois e discreto. */
const Dica: FC<DicaProps> = ({ active, label, pontos }) => {
  // O payload do Recharts não tem tipo; procuramos o ponto nos nossos dados pelo rótulo do eixo
  const ponto = pontos.find((item) => {
    return item.rotulo === label
  })
  if (!active || !ponto) {
    return null
  }
  return (
    <div className="rounded-xl bg-superficie px-3 py-2 text-subtitulo shadow-flutuante">
      <p className="text-nota text-conteudo-secundario">{nomeCompleto(ponto.original.mes)}</p>
      {SERIES.map((serie) => {
        return (
          <p className="mt-1 flex items-center gap-2" key={serie.chave}>
            {/* Tecla de série em traço curto, não em caixa */}
            <span aria-hidden="true" className={cn('h-0.5 w-3 rounded-full', serie.cor)} />
            <Valor className="font-semibold" valor={ponto.original[serie.chave]} />
            <span className="text-conteudo-secundario">{serie.nome}</span>
          </p>
        )
      })}
    </div>
  )
}

type GraficoDaEvolucaoProps = {
  meses: readonly MesDaEvolucao[]
  desatualizado: boolean
}

export const GraficoDaEvolucao: FC<GraficoDaEvolucaoProps> = ({ meses, desatualizado }) => {
  const pontos = paraOGrafico(meses)
  const primeiro = meses[0]
  const ultimo = meses.at(-1)

  return (
    <Grupo titulo="Últimos 6 meses">
      <li className={cn('p-4 transition-opacity duration-200', desatualizado && 'opacity-60')}>
        {/* Legenda: 2 séries pedem legenda; amostra retangular porque as marcas são barras */}
        <div className="flex gap-4 text-nota text-conteudo-secundario">
          {SERIES.map((serie) => {
            return (
              <span className="flex items-center gap-1.5" key={serie.chave}>
                <span aria-hidden="true" className={cn('size-2.5 rounded-xs', serie.cor)} />
                {serie.nome}
              </span>
            )
          })}
        </div>

        {/* O desenho é só visual; leitores de tela recebem a tabela abaixo */}
        <div aria-hidden="true" className="mt-3 h-52 text-conteudo">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              accessibilityLayer={false}
              barCategoryGap="22%"
              barGap={ESPACO_ENTRE_BARRAS}
              data={pontos}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="rotulo" tickLine={false} tickMargin={6} />
              <YAxis axisLine={false} tickFormatter={valorCompacto} tickLine={false} width={60} />
              <Tooltip
                content={(props) => {
                  return <Dica {...props} pontos={pontos} />
                }}
                // Faixa discreta atrás do mês tocado; currentColor herda o texto, sem cor crua
                cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
              />
              {SERIES.map((serie) => {
                return (
                  <Bar
                    className={serie.preenchimento}
                    dataKey={serie.chave}
                    isAnimationActive={false}
                    key={serie.chave}
                    maxBarSize={ESPESSURA_MAXIMA}
                    name={serie.nome}
                    radius={CANTOS}
                  />
                )
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table className="sr-only">
          <caption>
            Receitas e despesas de {primeiro ? nomeCompleto(primeiro.mes) : ''} a{' '}
            {ultimo ? nomeCompleto(ultimo.mes) : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Receitas</th>
              <th scope="col">Despesas</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((mes) => {
              return (
                <tr key={mes.mes}>
                  <th scope="row">{nomeCompleto(mes.mes)}</th>
                  <td>{formatarDinheiro(mes.receitas)}</td>
                  <td>{formatarDinheiro(mes.despesas)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </li>
    </Grupo>
  )
}
