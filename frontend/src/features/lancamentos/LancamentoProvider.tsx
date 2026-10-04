import type { FC, ReactNode } from 'react'

import { FolhaDeLancamento } from './components/FolhaDeLancamento'
import { ContextoDoLancamento } from './hooks/contextoDoLancamento'
import { useControleDaFolha } from './hooks/useControleDaFolha'

type LancamentoProviderProps = {
  children: ReactNode
}

/**
 * Uma folha de lançamento para o app inteiro: o ＋ da barra e as linhas da lista a abrem
 * por cima da tela atual, sem trocar de rota.
 */
export const LancamentoProvider: FC<LancamentoProviderProps> = ({ children }) => {
  const controle = useControleDaFolha()
  return (
    <ContextoDoLancamento value={controle.abrirLancamento}>
      {children}
      <FolhaDeLancamento controle={controle} />
    </ContextoDoLancamento>
  )
}
