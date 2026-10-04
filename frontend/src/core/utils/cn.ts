import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

import { CONFIG_DO_MERGE } from './tailwind'

const twMerge = extendTailwindMerge(CONFIG_DO_MERGE)

// twMerge resolve conflitos: em cn('p-2', 'p-4') vale a última, então um className recebido sobrescreve
export const cn = (...classes: ClassValue[]): string => {
  return twMerge(clsx(classes))
}
