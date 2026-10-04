import type { Conta } from '@/core/api'
import type { NomeDoIcone } from '@/core/utils'

export type TipoDeConta = Conta['tipo']

export const ROTULOS_DOS_TIPOS_DE_CONTA: Record<TipoDeConta, string> = {
  corrente: 'Conta corrente',
  dinheiro: 'Dinheiro',
  investimento: 'Investimento',
  cartao: 'Cartão de crédito',
}

export const TIPOS_DE_CONTA = [
  { valor: 'corrente', rotulo: ROTULOS_DOS_TIPOS_DE_CONTA.corrente },
  { valor: 'dinheiro', rotulo: ROTULOS_DOS_TIPOS_DE_CONTA.dinheiro },
  { valor: 'investimento', rotulo: ROTULOS_DOS_TIPOS_DE_CONTA.investimento },
  { valor: 'cartao', rotulo: ROTULOS_DOS_TIPOS_DE_CONTA.cartao },
] as const satisfies readonly { valor: TipoDeConta; rotulo: string }[]

// Mesma regra do backend (ICONE_DA_CONTA): o ícone que a conta ganha se ninguém escolher
export const ICONE_PADRAO_DA_CONTA: Record<TipoDeConta, NomeDoIcone> = {
  corrente: 'banco',
  dinheiro: 'carteira',
  investimento: 'investimento',
  cartao: 'cartao',
}

export const DIAS_DO_MES = Array.from({ length: 31 }, (_, indice) => {
  const dia = String(indice + 1)
  return { valor: dia, rotulo: dia }
})

export const NATUREZAS = [
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'receita', rotulo: 'Receita' },
] as const

export const TIPOS_DE_CATEGORIA = [
  { valor: 'fixo', rotulo: 'Fixa' },
  { valor: 'variavel', rotulo: 'Variável' },
] as const
