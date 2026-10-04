import { CircleAlert, X } from 'lucide-react'
import type { FC } from 'react'

type AvisoProps = {
  mensagem: string
  aoFechar: () => void
}

/** Faixa de aviso no topo da tela, para erros de ações sem formulário (ex.: apagar arrastando). */
export const Aviso: FC<AvisoProps> = ({ mensagem, aoFechar }) => {
  return (
    <div
      className="mt-4 flex items-start gap-3 rounded-xl bg-superficie py-3 pr-1 pl-4 shadow-flutuante"
      role="alert"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-despesa" />
      <p className="flex-1 text-subtitulo">{mensagem}</p>
      <button
        aria-label="Fechar aviso"
        className="-my-2 flex size-11 shrink-0 items-center justify-center rounded-full text-conteudo-secundario outline-none focus-visible:bg-fundo"
        onClick={aoFechar}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
