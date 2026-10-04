import type { ComponentProps, FC } from 'react'
import type { VariantProps } from 'tailwind-variants'

import { estiloBotao } from './Botao.estilos'
import { Indicador } from './Indicador'

type BotaoProps = ComponentProps<'button'> &
  VariantProps<typeof estiloBotao> & {
    carregando?: boolean
  }

export const Botao: FC<BotaoProps> = ({
  carregando = false,
  children,
  className,
  disabled,
  intencao,
  largura,
  type = 'button',
  ...resto
}) => {
  return (
    <button
      {...resto}
      aria-busy={carregando}
      className={estiloBotao({ class: className, intencao, largura })}
      disabled={disabled || carregando}
      type={type}
    >
      {carregando ? <Indicador /> : null}
      {children}
    </button>
  )
}
