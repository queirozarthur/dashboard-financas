import type { FC } from 'react'
import { NavLink } from 'react-router'

import { cn } from '@/core/utils'
import { useAbrirLancamento } from '@/features/lancamentos'

import { ABAS } from './abas'

const CLASSES_DO_ITEM = cn(
  'flex h-12 w-full flex-col items-center justify-center gap-0.5 text-legenda font-medium outline-none',
  'transition-colors duration-150 focus-visible:bg-marca-suave',
  'md:h-10 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-corpo md:font-normal',
)

/** Barra de abas translúcida embaixo no celular; barra lateral a partir de md (768px). */
export const Navegacao: FC = () => {
  const { abrirNovo } = useAbrirLancamento()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-separador/70 bg-superficie/80 pb-seguro backdrop-blur-xl backdrop-saturate-150 md:inset-y-0 md:right-auto md:w-60 md:border-t-0 md:border-r md:pt-6 md:pb-0"
    >
      <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1 md:px-3">
        {ABAS.map((aba) => {
          const { rotulo, Icone } = aba
          const icone = <Icone aria-hidden="true" className="size-5" strokeWidth={1.75} />

          if (aba.tipo === 'novo-lancamento') {
            return (
              <li key={rotulo}>
                {/* Um botão, não um link: abre a folha por cima da tela atual */}
                <button
                  aria-label="Novo lançamento"
                  className={cn(CLASSES_DO_ITEM, 'text-marca md:text-marca')}
                  onClick={abrirNovo}
                  type="button"
                >
                  {icone}
                  {rotulo}
                </button>
              </li>
            )
          }

          return (
            <li key={rotulo}>
              <NavLink
                className={({ isActive }) => {
                  return cn(
                    CLASSES_DO_ITEM,
                    isActive
                      ? 'text-marca md:bg-marca-suave'
                      : 'text-conteudo-secundario md:text-conteudo',
                  )
                }}
                end={'exata' in aba}
                to={aba.para}
              >
                {icone}
                {rotulo}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
