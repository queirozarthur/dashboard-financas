import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// twMerge resolve conflitos: em cn('p-2', 'p-4') vale a última, então um className recebido sobrescreve
export const cn = (...classes: ClassValue[]): string => {
  return twMerge(clsx(classes))
}
