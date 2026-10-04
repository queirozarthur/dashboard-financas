import { Navigate, type RouteObject } from 'react-router'

import { RotaProtegida, TelaEntrar } from '@/features/auth'
import { TelaDashboard } from '@/features/dashboard'
import { TelaLancamentos } from '@/features/lancamentos'

import { LayoutPrincipal } from './layout'
import { TelaCartoes, TelaMais } from './telasProvisorias'

export const rotas: RouteObject[] = [
  { path: '/entrar', element: <TelaEntrar /> },
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <LayoutPrincipal />,
        children: [
          { index: true, element: <TelaDashboard /> },
          { path: 'lancamentos', element: <TelaLancamentos /> },
          { path: 'cartoes', element: <TelaCartoes /> },
          { path: 'mais', element: <TelaMais /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate replace to="/" /> },
]
