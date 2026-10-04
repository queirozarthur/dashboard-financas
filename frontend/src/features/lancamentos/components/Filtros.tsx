import { ChevronDown } from 'lucide-react'
import type { ChangeEvent, FC } from 'react'

import { cn } from '@/core/utils'

type Opcao = {
  id: number
  nome: string
}

type PilulaProps = {
  rotulo: string
  todos: string
  opcoes: readonly Opcao[]
  valor: string | null
  aoMudar: (valor: string | null) => void
}

/** Filtro em forma de pílula; por baixo é um <select> nativo (no iPhone abre a roda do iOS). */
const Pilula: FC<PilulaProps> = ({ rotulo, todos, opcoes, valor, aoMudar }) => {
  const mudar = (evento: ChangeEvent<HTMLSelectElement>) => {
    aoMudar(evento.target.value || null)
  }
  const ativo = valor !== null

  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">{rotulo}</span>
      <select
        className={cn(
          'h-9 max-w-full min-w-0 appearance-none truncate rounded-full py-1.5 pr-8 pl-3.5 text-subtitulo font-medium outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca',
          ativo ? 'bg-marca-suave text-marca' : 'bg-superficie text-conteudo',
        )}
        onChange={mudar}
        value={valor ?? ''}
      >
        <option value="">{todos}</option>
        {opcoes.map((opcao) => {
          return (
            <option key={opcao.id} value={String(opcao.id)}>
              {opcao.nome}
            </option>
          )
        })}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-3 size-4',
          ativo ? 'text-marca' : 'text-conteudo-secundario',
        )}
      />
    </label>
  )
}

type FiltrosProps = {
  contas: readonly Opcao[]
  categorias: readonly Opcao[]
  conta: string | null
  categoria: string | null
  aoMudarConta: (valor: string | null) => void
  aoMudarCategoria: (valor: string | null) => void
}

export const Filtros: FC<FiltrosProps> = ({
  contas,
  categorias,
  conta,
  categoria,
  aoMudarConta,
  aoMudarCategoria,
}) => {
  return (
    <div className="mt-3 flex gap-2">
      <Pilula
        aoMudar={aoMudarConta}
        opcoes={contas}
        rotulo="Filtrar por conta"
        todos="Todas as contas"
        valor={conta}
      />
      <Pilula
        aoMudar={aoMudarCategoria}
        opcoes={categorias}
        rotulo="Filtrar por categoria"
        todos="Todas as categorias"
        valor={categoria}
      />
    </div>
  )
}
