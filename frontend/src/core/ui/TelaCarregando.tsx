import type { FC } from 'react'

import { Indicador } from './Indicador'

export const TelaCarregando: FC = () => {
  return (
    <div
      className="flex min-h-dvh items-center justify-center text-conteudo-secundario"
      role="status"
    >
      <Indicador />
      <span className="sr-only">Carregando…</span>
    </div>
  )
}
