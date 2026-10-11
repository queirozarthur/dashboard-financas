import { Landmark, LogOut, Repeat, Tag, Target } from 'lucide-react'
import type { FC } from 'react'

import { Grupo, IconeColorido, Linha, Tela } from '@/core/ui'
import { useSessao } from '@/features/auth'
import { TelaCartoes } from '@/features/cartoes'
import { useAbrirLancamento } from '@/features/lancamentos'

// Telas montadas pelo app: juntam peças de features diferentes, que não se importam entre si

/** A aba Cartões com o ＋ ligado à folha de lançamento: uma despesa nova no cartão escolhido. */
export const TelaCartoesComLancamento: FC = () => {
  const { abrirNovo } = useAbrirLancamento()
  return (
    <TelaCartoes
      aoNovaCompra={(cartao) => {
        abrirNovo({ tipo: 'despesa', conta: String(cartao) })
      }}
    />
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
