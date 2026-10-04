import type { FC } from 'react'

import { cn, formatarDinheiro } from '@/core/utils'

// Página provisória do T1: só para conferir fonte, cores e o formato de lista agrupada.
// Some no T3, quando entram o layout e os componentes de verdade.

type Exemplo = {
  nome: string
  valor: string
  tipo: 'receita' | 'despesa'
}

const EXEMPLOS: Exemplo[] = [
  { nome: 'Salário', valor: '5000.00', tipo: 'receita' },
  { nome: 'Aluguel', valor: '1500.00', tipo: 'despesa' },
  { nome: 'Mercado', valor: '623.45', tipo: 'despesa' },
]

const LinhaExemplo: FC<Exemplo> = ({ nome, valor, tipo }) => {
  return (
    <li className="flex items-center justify-between px-4 py-3">
      <span>{nome}</span>
      <span className={cn('tabular-nums', tipo === 'receita' ? 'text-receita' : 'text-despesa')}>
        {formatarDinheiro(tipo === 'despesa' ? `-${valor}` : valor)}
      </span>
    </li>
  )
}

export const App: FC = () => {
  return (
    <main className="mx-auto max-w-lg px-4 pt-12 pb-8">
      <h1 className="text-titulo-grande font-bold tracking-tight">Finanças</h1>
      <p className="mt-1 text-conteudo-secundario">Base do frontend funcionando.</p>

      <h2 className="mt-8 mb-2 px-4 text-xs text-conteudo-secundario uppercase">Outubro</h2>
      <ul className="divide-y divide-separador overflow-hidden rounded-xl bg-superficie">
        {EXEMPLOS.map((exemplo) => {
          return <LinhaExemplo key={exemplo.nome} {...exemplo} />
        })}
      </ul>

      <button
        className="mt-8 w-full rounded-xl bg-marca py-3 font-semibold text-sobre-marca transition-transform active:scale-96"
        type="button"
      >
        Botão com a cor principal
      </button>
    </main>
  )
}
