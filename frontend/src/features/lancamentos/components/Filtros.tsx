import { ChevronDown } from 'lucide-react'
import type { ChangeEvent, FC } from 'react'

import { cn } from '@/core/utils'

type Opcao = {
  id: number
  nome: string
}

type PilulaProps = {
  /** Nome para o leitor de tela (ex.: "Filtrar por conta") */
  rotulo: string
  /** O que a pílula mostra sem filtro (ex.: "Contas") */
  titulo: string
  /** A opção sem filtro, dentro da lista (ex.: "Todas as contas") */
  todos: string
  opcoes: readonly Opcao[]
  valor: string | null
  aoMudar: (valor: string | null) => void
}

/**
 * Filtro em forma de pílula. Mostra um texto curto (ou o nome escolhido) e, por cima, fica um
 * <select> nativo invisível: o toque abre a roda do iOS. Visível, o select teria a largura da
 * opção mais longa, e as duas pílulas não caberiam lado a lado no celular.
 */
const Pilula: FC<PilulaProps> = ({ rotulo, titulo, todos, opcoes, valor, aoMudar }) => {
  const mudar = (evento: ChangeEvent<HTMLSelectElement>) => {
    aoMudar(evento.target.value || null)
  }
  const escolhida = opcoes.find((opcao) => {
    return String(opcao.id) === valor
  })
  const ativo = valor !== null

  return (
    // O select cobre a pílula inteira: o toque sempre cai nele, sem precisar de <label>
    <div
      className={cn(
        'relative flex h-9 min-w-0 items-center gap-1 rounded-full pr-3 pl-3.5 text-subtitulo font-medium',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-marca',
        ativo ? 'bg-marca-suave text-marca' : 'bg-superficie text-conteudo',
      )}
    >
      <span aria-hidden="true" className="truncate">
        {escolhida?.nome ?? titulo}
      </span>
      <ChevronDown
        aria-hidden="true"
        className={cn('size-4 shrink-0', ativo ? 'text-marca' : 'text-conteudo-secundario')}
      />
      {/* text-corpo (17px) mesmo invisível: abaixo de 16px o Safari dá zoom ao tocar */}
      <select
        aria-label={rotulo}
        className="absolute inset-0 cursor-pointer appearance-none text-corpo opacity-0"
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
    </div>
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
        titulo="Contas"
        todos="Todas as contas"
        valor={conta}
      />
      <Pilula
        aoMudar={aoMudarCategoria}
        opcoes={categorias}
        rotulo="Filtrar por categoria"
        titulo="Categorias"
        todos="Todas as categorias"
        valor={categoria}
      />
    </div>
  )
}
