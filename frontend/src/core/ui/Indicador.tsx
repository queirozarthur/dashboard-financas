import type { FC } from 'react'

import { cn } from '@/core/utils'

type IndicadorProps = {
  className?: string
}

/** Círculo girando, como o indicador de atividade do iOS; herda a cor do texto. */
export const Indicador: FC<IndicadorProps> = ({ className }) => {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none',
        className,
      )}
    />
  )
}
