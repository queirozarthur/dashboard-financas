import { Navigate, type RouteObject } from 'react-router'

import { RotaProtegida, TelaEntrar } from '@/features/auth'
import { TelaCategorias, TelaContas, TelaOrcamentos, TelaRecorrencias } from '@/features/cadastros'
import { TelaDashboard } from '@/features/dashboard'
import { TelaLancamentos } from '@/features/lancamentos'

import { LayoutPrincipal } from './layout'
import { TelaCartoesComLancamento, TelaMais } from './telas'

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
          { path: 'cartoes', element: <TelaCartoesComLancamento /> },
          { path: 'mais', element: <TelaMais /> },
          // Dentro de /mais: a aba "Mais" continua acesa, como no iPhone
          { path: 'mais/contas', element: <TelaContas /> },
          { path: 'mais/categorias', element: <TelaCategorias /> },
          { path: 'mais/recorrencias', element: <TelaRecorrencias /> },
          { path: 'mais/orcamentos', element: <TelaOrcamentos /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate replace to="/" /> },
]
