import { z } from 'zod'

// Mesmas listas do backend (nucleo/aparencia.py), na mesma ordem
export const CORES = [
  'azul',
  'laranja',
  'turquesa',
  'amarelo',
  'rosa',
  'verde',
  'violeta',
  'vermelho',
] as const

export const NOMES_DOS_ICONES = [
  'casa',
  'carrinho',
  'refeicao',
  'carro',
  'onibus',
  'saude',
  'academia',
  'educacao',
  'lazer',
  'viagem',
  'roupa',
  'presente',
  'pet',
  'celular',
  'internet',
  'energia',
  'agua',
  'trabalho',
  'dinheiro',
  'cofrinho',
  'investimento',
  'banco',
  'carteira',
  'cartao',
  'recibo',
  'etiqueta',
] as const

export type Cor = (typeof CORES)[number]
export type NomeDoIcone = (typeof NOMES_DOS_ICONES)[number]

// .catch: uma cor ou ícone que o frontend ainda não conhece vira o padrão, sem quebrar a tela
export const esquemaCor = z.enum(CORES).catch('azul')
export const esquemaIcone = z.enum(NOMES_DOS_ICONES).catch('etiqueta')

type ClassesDaCor = {
  fundo: string
  /** Cor do ícone por cima: branco, ou escuro onde o branco não passaria de 3:1 */
  tinta: string
}

/** 'marca' é para o que não tem categoria (transferências): usa a cor principal do app. */
export const CLASSES_DA_COR: Record<Cor | 'marca', ClassesDaCor> = {
  azul: { fundo: 'bg-paleta-azul', tinta: 'text-sobre-marca' },
  laranja: { fundo: 'bg-paleta-laranja', tinta: 'text-sobre-marca' },
  turquesa: { fundo: 'bg-paleta-turquesa', tinta: 'text-conteudo' },
  amarelo: { fundo: 'bg-paleta-amarelo', tinta: 'text-conteudo' },
  rosa: { fundo: 'bg-paleta-rosa', tinta: 'text-conteudo' },
  verde: { fundo: 'bg-paleta-verde', tinta: 'text-sobre-marca' },
  violeta: { fundo: 'bg-paleta-violeta', tinta: 'text-sobre-marca' },
  vermelho: { fundo: 'bg-paleta-vermelho', tinta: 'text-sobre-marca' },
  marca: { fundo: 'bg-marca', tinta: 'text-sobre-marca' },
}
