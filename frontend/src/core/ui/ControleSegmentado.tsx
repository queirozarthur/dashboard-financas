import type { ReactElement } from 'react'

import { cn } from '@/core/utils'

type Opcao<T extends string> = {
  valor: T
  rotulo: string
}

type ControleSegmentadoProps<T extends string> = {
  /** Nome acessível do grupo (lido por leitores de tela, não aparece) */
  rotulo: string
  /** name dos rádios: precisa ser único na tela */
  nome: string
  opcoes: readonly Opcao<T>[]
  valor: T
  aoMudar: (valor: T) => void
}

/**
 * Controle segmentado do iOS. Por baixo são botões de rádio de verdade: as setas do
 * teclado trocam a opção e leitores de tela anunciam "1 de 3" sem código extra.
 */
export const ControleSegmentado = <T extends string>({
  rotulo,
  nome,
  opcoes,
  valor,
  aoMudar,
}: ControleSegmentadoProps<T>): ReactElement => {
  const indice = Math.max(
    0,
    opcoes.findIndex((opcao) => {
      return opcao.valor === valor
    }),
  )

  return (
    // Raios concêntricos: 8px por fora, 2px de recuo, 6px no destaque (8 = 6 + 2)
    <fieldset className="relative grid auto-cols-fr grid-flow-col rounded-lg bg-separador/40 p-0.5">
      <legend className="sr-only">{rotulo}</legend>
      {/* O destaque branco desliza até a opção escolhida; a geometria depende da quantidade */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 rounded-md bg-superficie shadow-flutuante transition-transform duration-250 ease-out motion-reduce:transition-none"
        style={{
          width: `calc((100% - 4px) / ${opcoes.length})`,
          transform: `translateX(${indice * 100}%)`,
        }}
      />
      {opcoes.map((opcao) => {
        const escolhida = opcao.valor === valor
        return (
          <label
            className={cn(
              'relative flex h-8 cursor-pointer items-center justify-center rounded-md px-2 text-nota select-none',
              'has-focus-visible:outline-2 has-focus-visible:outline-marca',
              escolhida ? 'font-semibold' : 'font-medium',
            )}
            key={opcao.valor}
          >
            <input
              checked={escolhida}
              className="sr-only"
              name={nome}
              onChange={() => {
                aoMudar(opcao.valor)
              }}
              type="radio"
              value={opcao.valor}
            />
            {opcao.rotulo}
          </label>
        )
      })}
    </fieldset>
  )
}
