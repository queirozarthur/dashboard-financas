import { LogOut } from 'lucide-react'
import type { FC } from 'react'

import { Grupo, Linha, Tela } from '@/core/ui'
import { useSessao } from '@/features/auth'

// Provisórias: cada uma é trocada pela tela de verdade no seu passo
// (T6 contas e categorias, T7 cartão, T8 recorrências e orçamentos).

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
