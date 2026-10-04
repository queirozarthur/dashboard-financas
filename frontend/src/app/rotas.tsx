import { Navigate, type RouteObject } from 'react-router'

import { RotaProtegida, TelaEntrar } from '@/features/auth'

import { TelaInicialProvisoria } from './TelaInicialProvisoria'

export const rotas: RouteObject[] = [
  { path: '/entrar', element: <TelaEntrar /> },
  {
    element: <RotaProtegida />,
    children: [{ index: true, element: <TelaInicialProvisoria /> }],
  },
  { path: '*', element: <Navigate replace to="/" /> },
]
