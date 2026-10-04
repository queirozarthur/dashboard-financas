import type { FC, ReactNode } from 'react'

import { ContextoDaSessao } from './hooks/contextoDaSessao'
import { useControleDaSessao } from './hooks/useControleDaSessao'

type SessaoProviderProps = {
  children: ReactNode
}

export const SessaoProvider: FC<SessaoProviderProps> = ({ children }) => {
  const sessao = useControleDaSessao()
  return <ContextoDaSessao value={sessao}>{children}</ContextoDaSessao>
}
