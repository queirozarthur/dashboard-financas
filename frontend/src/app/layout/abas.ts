import {
  ArrowLeftRight,
  CirclePlus,
  CreditCard,
  Ellipsis,
  House,
  type LucideIcon,
} from 'lucide-react'

type Aba = {
  rotulo: string
  para: string
  Icone: LucideIcon
  /** Só ativa na rota exata (senão "/" ficaria ativa em todas as telas) */
  exata?: boolean
}

export const ABAS = [
  { rotulo: 'Início', para: '/', Icone: House, exata: true },
  { rotulo: 'Lançamentos', para: '/lancamentos', Icone: ArrowLeftRight },
  { rotulo: 'Novo', para: '/novo', Icone: CirclePlus },
  { rotulo: 'Cartões', para: '/cartoes', Icone: CreditCard },
  { rotulo: 'Mais', para: '/mais', Icone: Ellipsis },
] as const satisfies readonly Aba[]
