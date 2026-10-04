import type { FC } from 'react'

// Mesmos tamanhos dos blocos de verdade: quando os dados chegam, nada pula de lugar
export const EsqueletoDaDashboard: FC = () => {
  return (
    <div aria-busy="true" className="motion-safe:animate-pulse">
      <span className="sr-only">Carregando o mês…</span>
      <div className="mt-4 h-48 rounded-2xl bg-superficie" />
      <div className="mt-8 h-4 w-32 rounded bg-separador/50" />
      <div className="mt-2 h-28 rounded-xl bg-superficie" />
      <div className="mt-8 h-4 w-24 rounded bg-separador/50" />
      <div className="mt-2 h-40 rounded-xl bg-superficie" />
    </div>
  )
}
