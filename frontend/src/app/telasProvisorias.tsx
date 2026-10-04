import { Landmark, LogOut, Repeat, Tag, Target } from 'lucide-react'
import type { FC } from 'react'

import { Grupo, IconeColorido, Linha, Tela } from '@/core/ui'
import { useSessao } from '@/features/auth'

// Provisórias: cada uma é trocada pela tela de verdade no seu passo
// (T6c contas e categorias, T7 cartão, T8 recorrências e orçamentos).

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
        <Linha
          icone={<IconeColorido Icone={Landmark} cor="azul" />}
          para="/contas"
          rotulo="Contas"
        />
        <Linha
          icone={<IconeColorido Icone={Tag} cor="laranja" />}
          para="/categorias"
          rotulo="Categorias"
        />
        <Linha
          icone={<IconeColorido Icone={Repeat} cor="violeta" />}
          para="/recorrencias"
          rotulo="Recorrências"
        />
        <Linha
          icone={<IconeColorido Icone={Target} cor="verde" />}
          para="/orcamentos"
          rotulo="Orçamentos"
        />
      </Grupo>
      <Grupo>
        <Linha
          aoTocar={sair}
          icone={<IconeColorido Icone={LogOut} cor="vermelho" />}
          rotulo="Sair"
          tom="perigo"
        />
      </Grupo>
    </Tela>
  )
}
