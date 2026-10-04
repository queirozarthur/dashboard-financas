import { Landmark, LogOut, Repeat, Tag, Target } from 'lucide-react'
import type { FC } from 'react'

import { Grupo, IconeColorido, Linha, Tela } from '@/core/ui'
import { useSessao } from '@/features/auth'

// Provisórias: cada uma é trocada pela tela de verdade no seu passo
// (T7 cartão, T8 recorrências e orçamentos).

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
          para="/mais/contas"
          rotulo="Contas"
        />
        <Linha
          icone={<IconeColorido Icone={Tag} cor="laranja" />}
          para="/mais/categorias"
          rotulo="Categorias"
        />
        <Linha
          icone={<IconeColorido Icone={Repeat} cor="violeta" />}
          para="/mais/recorrencias"
          rotulo="Recorrências"
        />
        <Linha
          icone={<IconeColorido Icone={Target} cor="verde" />}
          para="/mais/orcamentos"
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
