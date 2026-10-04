import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export type Filtros = {
  conta: string | null
  categoria: string | null
}

type NomeDoFiltro = keyof Filtros

const lerId = (texto: string | null): string | null => {
  return texto && /^\d+$/.test(texto) ? texto : null
}

/** Conta e categoria na URL (?conta=3&categoria=7), como o mês: recarregar mantém o filtro. */
export const useFiltros = () => {
  const [parametros, setParametros] = useSearchParams()

  const filtros = useMemo<Filtros>(() => {
    return { conta: lerId(parametros.get('conta')), categoria: lerId(parametros.get('categoria')) }
  }, [parametros])

  const alterar = useCallback(
    (nome: NomeDoFiltro, valor: string | null) => {
      setParametros(
        (atuais) => {
          const proximos = new URLSearchParams(atuais)
          if (valor) {
            proximos.set(nome, valor)
          } else {
            proximos.delete(nome)
          }
          return proximos
        },
        { replace: true },
      )
    },
    [setParametros],
  )

  // Uma atualização só: duas chamadas seguidas a setParametros podem não enxergar uma à outra
  const limpar = useCallback(() => {
    setParametros(
      (atuais) => {
        const proximos = new URLSearchParams(atuais)
        proximos.delete('conta')
        proximos.delete('categoria')
        return proximos
      },
      { replace: true },
    )
  }, [setParametros])

  const ativos = filtros.conta !== null || filtros.categoria !== null

  return { filtros, alterar, limpar, ativos }
}
