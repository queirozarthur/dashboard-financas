import { useState, type FC } from 'react'

import { useAoAparecer, useMesSelecionado } from '@/core/hooks'
import { AvisoDeErro, Botao, Grupo, Indicador, SeletorDeMes, Tela } from '@/core/ui'
import { cn, nomeDoMes } from '@/core/utils'

import { agruparPorDia } from './agrupamento'
import { Filtros } from './components/Filtros'
import { LinhaDeLancamento } from './components/LinhaDeLancamento'
import { useCategorias, useContas } from './hooks/useCadastros'
import { useFiltros } from './hooks/useFiltros'
import { useTransacoes } from './hooks/useTransacoes'

const EsqueletoDaLista: FC = () => {
  return (
    <div aria-busy="true" className="mt-4 motion-safe:animate-pulse">
      <span className="sr-only">Carregando lançamentos…</span>
      {[0, 1].map((bloco) => {
        return (
          <div className="mt-8 first:mt-4" key={bloco}>
            <div className="h-4 w-40 rounded bg-separador/50" />
            <div className="mt-2 h-40 rounded-xl bg-superficie" />
          </div>
        )
      })}
    </div>
  )
}

const obterHoje = (): Date => {
  return new Date()
}

export const TelaLancamentos: FC = () => {
  const { mes } = useMesSelecionado()
  const { filtros, alterar, limpar, ativos } = useFiltros()
  const consulta = useTransacoes(mes, filtros)
  const contas = useContas()
  const categorias = useCategorias()
  // "Hoje" e "Ontem" calculados uma vez ao abrir a tela (a renderização precisa ser pura)
  const [hoje] = useState(obterHoje)

  const podeCarregarMais = consulta.hasNextPage && !consulta.isFetchingNextPage
  const marcarFim = useAoAparecer(() => {
    void consulta.fetchNextPage()
  }, podeCarregarMais)

  const lista = () => {
    if (consulta.isPending) {
      return <EsqueletoDaLista />
    }
    if (consulta.isError) {
      return (
        <AvisoDeErro
          aoTentarDeNovo={() => {
            void consulta.refetch()
          }}
        />
      )
    }
    if (consulta.transacoes.length === 0) {
      const mesNaFrase = nomeDoMes(mes, { semAno: true }).toLowerCase()
      return (
        <div className="mt-10 px-4 text-center">
          <p className="text-conteudo-secundario">
            {ativos
              ? `Nenhum lançamento com estes filtros em ${mesNaFrase}.`
              : `Nenhum lançamento em ${mesNaFrase}.`}
          </p>
          {ativos ? (
            <Botao className="mt-2" intencao="simples" onClick={limpar}>
              Limpar filtros
            </Botao>
          ) : null}
        </div>
      )
    }
    return (
      <div
        aria-busy={consulta.isPlaceholderData}
        className={cn(
          'transition-opacity duration-200',
          consulta.isPlaceholderData && 'opacity-60',
        )}
      >
        {agruparPorDia(consulta.transacoes, hoje).map((dia) => {
          return (
            <Grupo key={dia.data} titulo={dia.titulo}>
              {dia.transacoes.map((transacao) => {
                return <LinhaDeLancamento key={transacao.id} transacao={transacao} />
              })}
            </Grupo>
          )
        })}
        {/* Marcador do fim: quando aparece na tela, a próxima página é buscada */}
        <div
          className="flex h-12 items-center justify-center text-conteudo-secundario"
          ref={marcarFim}
        >
          {consulta.isFetchingNextPage ? <Indicador /> : null}
        </div>
      </div>
    )
  }

  return (
    <Tela titulo="Lançamentos">
      <SeletorDeMes />
      <Filtros
        aoMudarCategoria={(valor) => {
          alterar('categoria', valor)
        }}
        aoMudarConta={(valor) => {
          alterar('conta', valor)
        }}
        categoria={filtros.categoria}
        categorias={categorias.data ?? []}
        conta={filtros.conta}
        contas={contas.data ?? []}
      />
      {lista()}
    </Tela>
  )
}
