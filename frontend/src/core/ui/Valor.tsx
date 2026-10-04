import type { FC } from 'react'

import { apresentarValor, cn, type TomDoValor } from '@/core/utils'

const CORES = {
  receita: 'text-receita',
  alerta: 'text-despesa',
  normal: '',
} as const

type ValorProps = {
  /** Como vem da API: texto decimal, ex.: "1500.00" ou "-30.00" */
  valor: string
  tom?: TomDoValor
  className?: string
}

export const Valor: FC<ValorProps> = ({ valor, tom = 'neutro', className }) => {
  const { texto, cor } = apresentarValor(valor, tom)
  // tabular-nums: dígitos de largura fixa, os valores ficam alinhados numa lista
  return (
    <span className={cn('whitespace-nowrap tabular-nums', CORES[cor], className)}>{texto}</span>
  )
}
