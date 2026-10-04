import type { LucideIcon } from 'lucide-react'
import type { FC } from 'react'

import { CLASSES_DA_COR, cn, type Cor, type NomeDoIcone } from '@/core/utils'

import { ICONES } from './icones'

const TAMANHOS = {
  // Topo das folhas de cadastro: a prévia de como a conta ou categoria vai aparecer
  grande: { caixa: 'size-16 rounded-2xl', icone: 'size-8' },
  // Linhas de lista, como os ícones do Ajustes do iPhone
  medio: { caixa: 'size-8 rounded-lg', icone: 'size-4.5' },
  // Linhas mais densas (categorias dentro de um gráfico)
  pequeno: { caixa: 'size-6 rounded-md', icone: 'size-3.5' },
} as const

type IconeColoridoProps = {
  cor: Cor | 'marca'
  Icone: LucideIcon
  tamanho?: keyof typeof TAMANHOS
}

/** Quadradinho colorido com um ícone por cima. Decorativo: o nome ao lado diz o que é. */
export const IconeColorido: FC<IconeColoridoProps> = ({ cor, Icone, tamanho = 'medio' }) => {
  const { fundo, tinta } = CLASSES_DA_COR[cor]
  const medidas = TAMANHOS[tamanho]
  return (
    <span
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center', medidas.caixa, fundo, tinta)}
    >
      <Icone className={medidas.icone} strokeWidth={2} />
    </span>
  )
}

type IconeDoCadastroProps = {
  cor: Cor
  icone: NomeDoIcone
  tamanho?: keyof typeof TAMANHOS
}

/** O ícone de uma categoria ou conta, como foi escolhido no cadastro. */
export const IconeDoCadastro: FC<IconeDoCadastroProps> = ({ cor, icone, tamanho }) => {
  return <IconeColorido Icone={ICONES[icone]} cor={cor} tamanho={tamanho} />
}
