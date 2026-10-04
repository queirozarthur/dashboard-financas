import type { FC, ReactNode } from 'react'

import { useMesSelecionado } from '@/core/hooks'
import { AvisoDeErro, SeletorDeMes, Tela } from '@/core/ui'
import { cn, lerMes, nomeDoMes, type Mes } from '@/core/utils'

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

type ApagavelProps = {
  desatualizado: boolean
  children: ReactNode
}

// Durante a troca de mês, o conteúdo antigo fica na tela, apagado, até o novo chegar
const Apagavel: FC<ApagavelProps> = ({ desatualizado, children }) => {
  return (
    <div
      aria-busy={desatualizado}
      className={cn('transition-opacity duration-200', desatualizado && 'opacity-60')}
    >
      {children}
    </div>
  )
}

type ConteudoDoMesProps = {
  dados: Dashboard
  desatualizado: boolean
  mes: Mes
}

// Ordem: o número principal, depois os gráficos (visão geral), depois as listas (detalhe)
const ConteudoDoMes: FC<ConteudoDoMesProps> = ({ dados, desatualizado, mes }) => {
  // Nomes vêm do mês dos dados, não da URL: durante a troca, o mês antigo continua bem rotulado
  const nomes = {
    nomeDoMes: nomeNaFrase(dados.mes),
    nomeDoMesAnterior: nomeNaFrase(dados.mes_anterior.mes),
  }

  return (
    <>
      <Apagavel desatualizado={desatualizado}>
        <CartaoDoResultado dados={dados} {...nomes} />
        {mesVazio(dados) ? (
          <p className="mt-8 px-4 text-center text-conteudo-secundario">
            Nada lançado em {nomes.nomeDoMes} ainda.
          </p>
        ) : null}
      </Apagavel>

      {/* A evolução tem a própria busca e o próprio "apagado"; termina no mês da URL */}
      <BlocoDaEvolucao mes={mes} />

      {mesVazio(dados) ? null : (
        <Apagavel desatualizado={desatualizado}>
          <GastosDoMes dados={dados} />
          <GrupoEntradasESaidas dados={dados} {...nomes} />
          <GrupoPrevisto dados={dados} {...nomes} />
          <GrupoOrcamentos dados={dados} {...nomes} />
        </Apagavel>
      )}
    </>
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
      <ConteudoDoMes dados={consulta.data} desatualizado={consulta.isPlaceholderData} mes={mes} />
    )
  }

  return (
    <Tela titulo="Início">
      <SeletorDeMes />
      {conteudo()}
    </Tela>
  )
}
