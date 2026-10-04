import type { ComponentProps, FC } from 'react'

import { cn } from '@/core/utils'

type BotaoDaBarraProps = ComponentProps<'button'> & {
  /** Ação principal da barra (ex.: "Salvar"): em negrito, como no iOS */
  destaque?: boolean
}

/** Botão de texto ou ícone das barras do topo (folhas e telas), na cor principal. */
export const BotaoDaBarra: FC<BotaoDaBarraProps> = ({
  destaque = false,
  className,
  type = 'button',
  ...botao
}) => {
  return (
    <button
      {...botao}
      className={cn(
        'flex min-h-11 min-w-11 items-center justify-center text-marca outline-none focus-visible:underline disabled:opacity-40',
        destaque && 'font-semibold',
        className,
      )}
      type={type}
    />
  )
}
