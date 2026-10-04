import {
  ArrowLeftRight,
  CirclePlus,
  CreditCard,
  Ellipsis,
  House,
  type LucideIcon,
} from 'lucide-react'

type AbaDeTela = {
  tipo: 'tela'
  rotulo: string
  para: string
  Icone: LucideIcon
  /** Só ativa na rota exata (senão "/" ficaria ativa em todas as telas) */
  exata?: boolean
}

/** Não troca de tela: abre algo por cima da tela atual (o ＋ abre a folha de lançamento) */
type AbaDeAcao = {
  tipo: 'novo-lancamento'
  rotulo: string
  Icone: LucideIcon
}

export type Aba = AbaDeTela | AbaDeAcao

export const ABAS = [
  { tipo: 'tela', rotulo: 'Início', para: '/', Icone: House, exata: true },
  { tipo: 'tela', rotulo: 'Lançamentos', para: '/lancamentos', Icone: ArrowLeftRight },
  { tipo: 'novo-lancamento', rotulo: 'Novo', Icone: CirclePlus },
  { tipo: 'tela', rotulo: 'Cartões', para: '/cartoes', Icone: CreditCard },
  { tipo: 'tela', rotulo: 'Mais', para: '/mais', Icone: Ellipsis },
] as const satisfies readonly Aba[]
