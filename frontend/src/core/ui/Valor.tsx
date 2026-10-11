import type { FC } from 'react'

import { apresentarValor, cn, type TomDoValor } from '@/core/utils'

// Cor explícita também no "normal": dentro de uma Linha, o lado direito é cinza secundário,
// e valor de dinheiro precisa da cor de texto principal
const CORES = {
  receita: 'text-receita',
  alerta: 'text-despesa',
  normal: 'text-conteudo',
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

type ValorComNotaProps = ValorProps & {
  /** Texto pequeno embaixo do valor (ex.: "3/10"); sem ele, fica só o valor */
  nota: string | null
  /** O que a nota é, lido só pelo leitor de tela (ex.: "parcela") */
  rotuloDaNota?: string
}

/**
 * Valor com uma nota embaixo, como as compras do Apple Card: libera a linha de baixo,
 * à esquerda, que no celular não cabe tudo.
 */
export const ValorComNota: FC<ValorComNotaProps> = ({ nota, rotuloDaNota, ...valor }) => {
  return (
    <span className="flex flex-col items-end">
      <Valor {...valor} />
      {nota ? (
        <span className="text-nota text-conteudo-secundario tabular-nums">
          {rotuloDaNota ? <span className="sr-only">{rotuloDaNota} </span> : null}
          {nota}
        </span>
      ) : null}
    </span>
  )
}
