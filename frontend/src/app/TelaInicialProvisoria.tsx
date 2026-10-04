import type { FC } from 'react'

import { Botao } from '@/core/ui'
import { useSessao } from '@/features/auth'

// Provisória do T2: prova que o login funciona. O T3 troca pelo layout com a barra de abas.
export const TelaInicialProvisoria: FC = () => {
  const { sair } = useSessao()
  return (
    <main className="mx-auto max-w-lg px-4 pt-12">
      <h1 className="px-4 text-titulo-grande font-bold tracking-tight">Início</h1>
      <p className="mt-1 px-4 text-conteudo-secundario">Você entrou. As telas chegam no T3.</p>
      <Botao className="mt-8" intencao="perigo" largura="total" onClick={sair}>
        Sair
      </Botao>
    </main>
  )
}
