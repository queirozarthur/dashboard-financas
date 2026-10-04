import { Navigate, type RouteObject } from 'react-router'

import { RotaProtegida, TelaEntrar } from '@/features/auth'

import { LayoutPrincipal } from './layout'
import { TelaCartoes, TelaInicio, TelaLancamentos, TelaMais, TelaNovo } from './telasProvisorias'

export const rotas: RouteObject[] = [
  { path: '/entrar', element: <TelaEntrar /> },
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <LayoutPrincipal />,
        children: [
          { index: true, element: <TelaInicio /> },
          { path: 'lancamentos', element: <TelaLancamentos /> },
          { path: 'novo', element: <TelaNovo /> },
          { path: 'cartoes', element: <TelaCartoes /> },
          { path: 'mais', element: <TelaMais /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate replace to="/" /> },
]
