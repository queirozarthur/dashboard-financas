import type { FC } from 'react'
import { Outlet } from 'react-router'

import { LancamentoProvider } from '@/features/lancamentos'

import { Navegacao } from './Navegacao'

export const LayoutPrincipal: FC = () => {
  return (
    // A folha de lançamento fica aqui: abre por cima de qualquer tela logada
    <LancamentoProvider>
      <div className="md:pl-60">
        {/* pb-24 no celular: o fim da tela não fica escondido atrás da barra de abas */}
        <main className="pb-24 md:pb-0">
          <Outlet />
        </main>
        <Navegacao />
      </div>
    </LancamentoProvider>
  )
}
