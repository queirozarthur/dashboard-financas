import type { FC, ReactNode } from 'react'

import { useTituloRecolhido } from '@/core/hooks'
import { cn } from '@/core/utils'

type TelaProps = {
  titulo: string
  /** Botão no canto direito da barra (ex.: "Editar", "+") */
  acao?: ReactNode
  children: ReactNode
}

/**
 * Estrutura de uma tela no estilo iOS: título grande que, ao rolar, dá lugar a um título
 * pequeno numa barra translúcida fixa no topo.
 */
export const Tela: FC<TelaProps> = ({ titulo, acao, children }) => {
  const { refTitulo, recolhido } = useTituloRecolhido()

  return (
    <div className="pb-8">
      <header
        className={cn(
          'sticky top-0 z-20 pt-seguro transition-[background-color,box-shadow,backdrop-filter] duration-200',
          recolhido && 'bg-fundo/80 shadow-linha backdrop-blur-xl backdrop-saturate-150',
        )}
      >
        <div className="relative mx-auto flex h-11 max-w-2xl items-center justify-end px-4">
          {/* Só visual: para leitores de tela o título é o h1 abaixo */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-x-20 truncate text-center font-semibold transition-opacity duration-200',
              recolhido ? 'opacity-100' : 'opacity-0',
            )}
          >
            {titulo}
          </span>
          {acao}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4">
        <h1 ref={refTitulo} className="px-4 pb-2 text-titulo-grande font-bold tracking-tight">
          {titulo}
        </h1>
        {children}
      </div>
    </div>
  )
}
