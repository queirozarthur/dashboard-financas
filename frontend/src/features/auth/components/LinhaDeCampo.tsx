import type { ComponentProps, FC } from 'react'

type LinhaDeCampoProps = ComponentProps<'input'> & {
  rotulo: string
}

/** Uma linha de formulário agrupado do iOS: rótulo à esquerda, campo ocupando o resto. */
export const LinhaDeCampo: FC<LinhaDeCampoProps> = ({ rotulo, ...campo }) => {
  return (
    <label className="flex items-center gap-3 px-4">
      <span className="w-20 shrink-0">{rotulo}</span>
      {/* text-base (16px): abaixo disso o Safari do iPhone dá zoom ao focar o campo */}
      <input
        {...campo}
        className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-conteudo-secundario"
      />
    </label>
  )
}
