import { ChevronLeft } from 'lucide-react'
import type { FC, ReactNode } from 'react'
import { Link } from 'react-router'

import { useTituloRecolhido } from '@/core/hooks'
import { cn } from '@/core/utils'

type Voltar = {
  /** Para onde volta (ex.: "/mais") */
  para: string
  /** Nome da tela anterior, como no iOS (ex.: "Mais") */
  rotulo: string
}

type TelaProps = {
  titulo: string
  /** Botão "‹ Anterior" no canto esquerdo, para telas abertas a partir de outra */
  voltar?: Voltar
  /** Botão no canto direito da barra (ex.: "Editar", "+") */
  acao?: ReactNode
  children: ReactNode
}

/**
 * Estrutura de uma tela no estilo iOS: título grande que, ao rolar, dá lugar a um título
 * pequeno numa barra translúcida fixa no topo.
 */
export const Tela: FC<TelaProps> = ({ titulo, voltar, acao, children }) => {
  const { refTitulo, recolhido } = useTituloRecolhido()

  return (
    <div className="pb-8">
      <header
        className={cn(
          'sticky top-0 z-20 pt-seguro transition-[background-color,box-shadow,backdrop-filter] duration-200',
          recolhido && 'bg-fundo/80 shadow-linha backdrop-blur-xl backdrop-saturate-150',
        )}
      >
        <div className="relative mx-auto flex h-11 max-w-2xl items-center justify-between px-2">
          {voltar ? (
            <Link
              className="relative z-10 -ml-1 flex min-h-11 items-center pr-2 text-marca outline-none focus-visible:underline"
              to={voltar.para}
            >
              <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2.25} />
              {voltar.rotulo}
            </Link>
          ) : (
            <span />
          )}
          {/* Só visual: para leitores de tela o título é o h1 abaixo */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-x-24 truncate text-center font-semibold transition-opacity duration-200',
              recolhido ? 'opacity-100' : 'opacity-0',
            )}
          >
            {titulo}
          </span>
          <span className="relative z-10 flex items-center pr-2">{acao}</span>
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
