import { LogOut } from 'lucide-react'
import type { FC } from 'react'

import { Grupo, Linha, SeletorDeMes, Tela, Valor } from '@/core/ui'
import { useSessao } from '@/features/auth'

// Provisórias do T3a: mostram o layout e os componentes. Cada uma é trocada pela tela
// de verdade no seu passo (T4 dashboard, T5 lançamentos, T6 contas, T7 cartão, T8 recorrências).

export const TelaInicio: FC = () => {
  return (
    <Tela titulo="Início">
      <SeletorDeMes />
      <Grupo
        rodape="Valores de exemplo. A dashboard de verdade chega no T4."
        titulo="Resumo do mês"
      >
        <Linha rotulo="Receitas" valor={<Valor tom="receita" valor="5000.00" />} />
        <Linha rotulo="Despesas" valor={<Valor tom="despesa" valor="3218.40" />} />
        <Linha rotulo="Saldo da Carteira" valor={<Valor valor="-30.00" />} />
      </Grupo>
      {/* Conteúdo extra só para dar o que rolar e ver o título encolher */}
      <Grupo titulo="Para testar a rolagem">
        {Array.from({ length: 12 }, (_, indice) => {
          return <Linha key={indice} detalhe="Detalhe da linha" rotulo={`Linha ${indice + 1}`} />
        })}
      </Grupo>
    </Tela>
  )
}

export const TelaLancamentos: FC = () => {
  return (
    <Tela titulo="Lançamentos">
      <SeletorDeMes />
      <p className="mt-6 px-4 text-conteudo-secundario">A lista do mês chega no T5.</p>
    </Tela>
  )
}

export const TelaNovo: FC = () => {
  return (
    <Tela titulo="Novo">
      <p className="px-4 text-conteudo-secundario">O formulário de lançamento chega no T5.</p>
    </Tela>
  )
}

export const TelaCartoes: FC = () => {
  return (
    <Tela titulo="Cartões">
      <p className="px-4 text-conteudo-secundario">Faturas e compras chegam no T7.</p>
    </Tela>
  )
}

export const TelaMais: FC = () => {
  const { sair } = useSessao()
  return (
    <Tela titulo="Mais">
      <Grupo titulo="Cadastros">
        <Linha para="/contas" rotulo="Contas" />
        <Linha para="/categorias" rotulo="Categorias" />
        <Linha para="/recorrencias" rotulo="Recorrências" />
        <Linha para="/orcamentos" rotulo="Orçamentos" />
      </Grupo>
      <Grupo>
        <Linha
          aoTocar={sair}
          icone={<LogOut aria-hidden="true" className="size-5 text-despesa" />}
          rotulo="Sair"
          tom="perigo"
        />
      </Grupo>
    </Tela>
  )
}
