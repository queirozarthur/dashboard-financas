import type { FC } from 'react'

import { IconeDoCadastro } from '@/core/ui'
import type { Cor, NomeDoIcone } from '@/core/utils'

type PreviaDoCadastroProps = {
  cor: Cor
  icone: NomeDoIcone
  nome: string
  /** Mostrado enquanto o nome está vazio */
  semNome: string
}

/** Topo da folha: como a conta ou categoria vai aparecer, mudando enquanto se edita. */
export const PreviaDoCadastro: FC<PreviaDoCadastroProps> = ({ cor, icone, nome, semNome }) => {
  return (
    <div aria-hidden="true" className="flex flex-col items-center gap-2 pt-2 pb-4">
      <IconeDoCadastro cor={cor} icone={icone} tamanho="grande" />
      <p className="max-w-full truncate text-corpo font-semibold">
        {nome.trim() || <span className="text-conteudo-secundario">{semNome}</span>}
      </p>
    </div>
  )
}
