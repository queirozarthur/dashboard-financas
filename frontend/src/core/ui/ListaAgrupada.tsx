import { ChevronRight } from 'lucide-react'
import type { FC, ReactNode } from 'react'
import { Link } from 'react-router'

import { useDeslizarLinha } from '@/core/hooks'
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
  /** No celular, arrastar a linha para a esquerda revela esta ação (ex.: "Apagar") */
  acaoAoDeslizar?: AcaoAoDeslizar
}

type AcaoAoDeslizar = {
  rotulo: string
  aoTocar: () => void
}

const CLASSES_DA_LINHA =
  'flex w-full items-center gap-3 pl-4 text-left outline-none focus-visible:bg-marca-suave'

const CLASSES_INTERATIVAS = 'transition-colors duration-150 active:bg-separador/40'

const ConteudoDaLinha: FC<
  Omit<LinhaProps, 'para' | 'aoTocar' | 'acaoAoDeslizar'> & { comSeta: boolean }
> = ({ rotulo, detalhe, valor, icone, tom = 'normal', comSeta }) => {
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

type LinhaComAcaoProps = Omit<LinhaProps, 'para' | 'aoTocar' | 'acaoAoDeslizar'> & {
  aoTocar: () => void
  acao: AcaoAoDeslizar
}

/** Linha tocável que, arrastada para a esquerda com o dedo, revela uma ação vermelha atrás. */
const LinhaComAcao: FC<LinhaComAcaoProps> = ({ aoTocar, acao, ...conteudo }) => {
  const { deslocamento, arrastando, aberta, fechar, manipuladores } = useDeslizarLinha(true)

  return (
    <li className="group/linha relative overflow-hidden">
      {/* Fica atrás da linha; só entra na ordem do teclado quando está à mostra */}
      <button
        aria-hidden={!aberta}
        className="absolute inset-y-0 right-0 w-20 bg-despesa font-medium text-sobre-alerta"
        onClick={() => {
          fechar()
          acao.aoTocar()
        }}
        tabIndex={aberta ? 0 : -1}
        type="button"
      >
        {acao.rotulo}
      </button>
      <button
        {...manipuladores}
        className={cn(
          CLASSES_DA_LINHA,
          CLASSES_INTERATIVAS,
          // pan-y: o navegador cuida da rolagem vertical; o arrasto horizontal fica conosco
          // Fundo opaco também ao pressionar: um cinza transparente deixaria o vermelho vazar
          'relative translate-x-(--deslize) touch-pan-y bg-superficie active:bg-fundo',
          !arrastando && 'transition-[translate] duration-200 ease-out',
        )}
        onClick={aoTocar}
        style={{ '--deslize': `${deslocamento}px` }}
        type="button"
      >
        <ConteudoDaLinha {...conteudo} comSeta={false} />
      </button>
    </li>
  )
}

export const Linha: FC<LinhaProps> = ({ para, aoTocar, acaoAoDeslizar, ...conteudo }) => {
  if (aoTocar && acaoAoDeslizar) {
    return <LinhaComAcao {...conteudo} acao={acaoAoDeslizar} aoTocar={aoTocar} />
  }
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
