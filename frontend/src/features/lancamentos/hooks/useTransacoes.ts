import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'

import { requisitar } from '@/core/api'
import { textoDoMes, type Mes } from '@/core/utils'

import { esquemaPaginaDeTransacoes } from '../consts/esquemas'
import type { Filtros } from './useFiltros'

const montarConsulta = (mes: Mes, filtros: Filtros, pagina: number): string => {
  const parametros = new URLSearchParams({ mes: textoDoMes(mes), page: String(pagina) })
  if (filtros.conta) {
    parametros.set('conta', filtros.conta)
  }
  if (filtros.categoria) {
    parametros.set('categoria', filtros.categoria)
  }
  return `/transacoes/?${parametros.toString()}`
}

/** Lançamentos do mês, de 50 em 50 (a página da API); a próxima página vem ao rolar. */
export const useTransacoes = (mes: Mes, filtros: Filtros) => {
  const consulta = useInfiniteQuery({
    queryKey: ['transacoes', textoDoMes(mes), filtros.conta, filtros.categoria],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      return requisitar(montarConsulta(mes, filtros, pageParam), esquemaPaginaDeTransacoes)
    },
    getNextPageParam: (ultimaPagina, _paginas, ultimoNumero) => {
      return ultimaPagina.next ? ultimoNumero + 1 : undefined
    },
    placeholderData: keepPreviousData,
  })

  const transacoes =
    consulta.data?.pages.flatMap((pagina) => {
      return pagina.results
    }) ?? []

  return { ...consulta, transacoes }
}
