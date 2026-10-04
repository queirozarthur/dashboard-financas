import type { FC } from 'react'

import { useMesSelecionado } from '@/core/hooks'
import { AvisoDeErro, SeletorDeMes, Tela } from '@/core/ui'
import { cn, lerMes, nomeDoMes } from '@/core/utils'

import { temValor } from './comparacao'
import { BlocoDaEvolucao } from './components/BlocoDaEvolucao'
import { GrupoEntradasESaidas, GrupoOrcamentos, GrupoPrevisto } from './components/BlocosDoMes'
import { GastosDoMes } from './components/GastosDoMes'
import { CartaoDoResultado } from './components/CartaoDoResultado'
import { EsqueletoDaDashboard } from './components/EsqueletoDaDashboard'
import type { Dashboard } from './consts/esquemas'
import { useDashboard } from './hooks/useDashboard'

// "setembro": nome curto, minúsculo, para usar no meio de frases
const nomeNaFrase = (texto: string): string => {
  const mes = lerMes(texto)
  return mes ? nomeDoMes(mes, { semAno: true }).toLowerCase() : texto
}

const mesVazio = (dados: Dashboard): boolean => {
  return ![dados.receitas, dados.despesas, dados.previsto.receitas, dados.previsto.despesas].some(
    temValor,
  )
}

type ConteudoDoMesProps = {
  dados: Dashboard
  desatualizado: boolean
}

const ConteudoDoMes: FC<ConteudoDoMesProps> = ({ dados, desatualizado }) => {
  // Nomes vêm do mês dos dados, não da URL: durante a troca, o mês antigo continua bem rotulado
  const nomes = {
    nomeDoMes: nomeNaFrase(dados.mes),
    nomeDoMesAnterior: nomeNaFrase(dados.mes_anterior.mes),
  }

  return (
    <div
      className={cn('transition-opacity duration-200', desatualizado && 'opacity-60')}
      aria-busy={desatualizado}
    >
      <CartaoDoResultado dados={dados} {...nomes} />
      {mesVazio(dados) ? (
        <p className="mt-8 px-4 text-center text-conteudo-secundario">
          Nada lançado em {nomes.nomeDoMes} ainda.
        </p>
      ) : (
        <>
          <GrupoEntradasESaidas dados={dados} {...nomes} />
          <GrupoPrevisto dados={dados} {...nomes} />
          <GrupoOrcamentos dados={dados} {...nomes} />
          <GastosDoMes dados={dados} />
        </>
      )}
    </div>
  )
}

export const TelaDashboard: FC = () => {
  const { mes } = useMesSelecionado()
  const consulta = useDashboard(mes)

  const conteudo = () => {
    if (consulta.isPending) {
      return <EsqueletoDaDashboard />
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
    return (
      <>
        <ConteudoDoMes dados={consulta.data} desatualizado={consulta.isPlaceholderData} />
        {/* A evolução termina no mês escolhido na URL, mesmo enquanto o mês ainda carrega */}
        <BlocoDaEvolucao mes={mes} />
      </>
    )
  }

  return (
    <Tela titulo="Início">
      <SeletorDeMes />
      {conteudo()}
    </Tela>
  )
}
