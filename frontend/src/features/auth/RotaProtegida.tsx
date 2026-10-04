import type { FC } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { TelaCarregando } from '@/core/ui'

import { useSessao } from './hooks/contextoDaSessao'

/** Envolve as rotas que exigem login; sem sessão, manda para /entrar lembrando de onde veio. */
export const RotaProtegida: FC = () => {
  const { estado } = useSessao()
  const local = useLocation()

  if (estado === 'carregando') {
    return <TelaCarregando />
  }
  if (estado === 'anonimo') {
    return <Navigate replace state={{ de: local.pathname }} to="/entrar" />
  }
  return <Outlet />
}
