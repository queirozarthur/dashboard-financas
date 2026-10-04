import type { FC } from 'react'

import { Grupo, Linha, Valor } from '@/core/ui'
import { formatarDinheiro } from '@/core/utils'

import { temValor, textoDaVariacao } from '../comparacao'
import type { Dashboard } from '../consts/esquemas'
import { LinhaDeOrcamento } from './LinhaDeOrcamento'

type BlocoProps = {
  dados: Dashboard
  nomeDoMes: string
  nomeDoMesAnterior: string
}

export const GrupoEntradasESaidas: FC<BlocoProps> = ({ dados, nomeDoMesAnterior }) => {
  return (
    <Grupo titulo="Entradas e saídas">
      <Linha
        detalhe={textoDaVariacao(dados.variacao.receitas, nomeDoMesAnterior)}
        rotulo="Receitas"
        valor={<Valor tom="receita" valor={dados.receitas} />}
      />
      <Linha
        detalhe={textoDaVariacao(dados.variacao.despesas, nomeDoMesAnterior)}
        rotulo="Despesas"
        valor={<Valor tom="despesa" valor={dados.despesas} />}
      />
    </Grupo>
  )
}

export const GrupoPrevisto: FC<BlocoProps> = ({ dados, nomeDoMes }) => {
  const { receitas, despesas } = dados.previsto
  if (!temValor(receitas) && !temValor(despesas)) {
    return null
  }
  return (
    <Grupo
      rodape="Recorrências que você ainda não confirmou neste mês."
      titulo={`Ainda previsto em ${nomeDoMes}`}
    >
      {temValor(receitas) ? (
        <Linha rotulo="A receber" valor={<Valor tom="receita" valor={receitas} />} />
      ) : null}
      {temValor(despesas) ? (
        <Linha rotulo="A pagar" valor={<Valor tom="despesa" valor={despesas} />} />
      ) : null}
    </Grupo>
  )
}

const rodapeDosOrcamentos = ({ restante, limite }: Dashboard['orcamentos']['total']): string => {
  if (restante.startsWith('-')) {
    return `No total, passou ${formatarDinheiro(restante.slice(1))} dos ${formatarDinheiro(limite)} planejados.`
  }
  return `No total, restam ${formatarDinheiro(restante)} de ${formatarDinheiro(limite)}.`
}

export const GrupoOrcamentos: FC<BlocoProps> = ({ dados }) => {
  const { categorias, total } = dados.orcamentos
  if (categorias.length === 0) {
    return null
  }
  return (
    <Grupo rodape={rodapeDosOrcamentos(total)} titulo="Orçamentos">
      {categorias.map((orcamento) => {
        return <LinhaDeOrcamento dados={orcamento} key={orcamento.categoria_id} />
      })}
    </Grupo>
  )
}
