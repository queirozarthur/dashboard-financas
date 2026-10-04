import { ChevronRight } from 'lucide-react'
import type { FC, ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/core/utils'

type GrupoProps = {
  titulo?: string
  rodape?: string
  children: ReactNode
}

/** Bloco arredondado de linhas sobre o fundo cinza, como no app Ajustes do iPhone. */
export const Grupo: FC<GrupoProps> = ({ titulo, rodape, children }) => {
  return (
    <section className="mt-8 first:mt-4">
      {titulo ? (
        <h2 className="mb-1.5 px-4 text-nota text-conteudo-secundario uppercase">{titulo}</h2>
      ) : null}
      <ul className="overflow-hidden rounded-xl bg-superficie">{children}</ul>
      {rodape ? <p className="mt-1.5 px-4 text-nota text-conteudo-secundario">{rodape}</p> : null}
    </section>
  )
}

type LinhaProps = {
  rotulo: ReactNode
  /** Texto menor embaixo do rótulo */
  detalhe?: ReactNode
  /** Conteúdo à direita (valor, contagem) */
  valor?: ReactNode
  icone?: ReactNode
  /** Abre outra tela: vira link e ganha a seta ">" */
  para?: string
  /** Ação na própria tela: vira botão */
  aoTocar?: () => void
  tom?: 'normal' | 'perigo'
}

const CLASSES_DA_LINHA =
  'flex w-full items-center gap-3 pl-4 text-left outline-none focus-visible:bg-marca-suave'

const CLASSES_INTERATIVAS = 'transition-colors duration-150 active:bg-separador/40'

const ConteudoDaLinha: FC<Omit<LinhaProps, 'para' | 'aoTocar'> & { comSeta: boolean }> = ({
  rotulo,
  detalhe,
  valor,
  icone,
  tom = 'normal',
  comSeta,
}) => {
  return (
    <>
      {icone ? <span className="shrink-0 text-marca">{icone}</span> : null}
      {/* O separador começa depois do recuo, como no iOS; a primeira linha não tem */}
      <span className="flex min-h-11 min-w-0 flex-1 items-center gap-3 border-separador py-2.5 pr-4 group-not-first/linha:border-t">
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate', tom === 'perigo' && 'text-despesa')}>{rotulo}</span>
          {detalhe ? (
            <span className="block truncate text-subtitulo text-conteudo-secundario">
              {detalhe}
            </span>
          ) : null}
        </span>
        {valor ? <span className="shrink-0 text-conteudo-secundario">{valor}</span> : null}
        {comSeta ? (
          <ChevronRight aria-hidden="true" className="-mr-1 size-5 shrink-0 text-separador" />
        ) : null}
      </span>
    </>
  )
}

export const Linha: FC<LinhaProps> = ({ para, aoTocar, ...conteudo }) => {
  if (para) {
    return (
      <li className="group/linha">
        <Link className={cn(CLASSES_DA_LINHA, CLASSES_INTERATIVAS)} to={para}>
          <ConteudoDaLinha {...conteudo} comSeta />
        </Link>
      </li>
    )
  }
  if (aoTocar) {
    return (
      <li className="group/linha">
        <button
          className={cn(CLASSES_DA_LINHA, CLASSES_INTERATIVAS)}
          onClick={aoTocar}
          type="button"
        >
          <ConteudoDaLinha {...conteudo} comSeta={false} />
        </button>
      </li>
    )
  }
  return (
    <li className="group/linha">
      <div className={CLASSES_DA_LINHA}>
        <ConteudoDaLinha {...conteudo} comSeta={false} />
      </div>
    </li>
  )
}
