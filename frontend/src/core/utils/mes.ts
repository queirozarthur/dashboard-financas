// Mesmo formato da API: 'AAAA-MM' (?mes=2026-10)
const FORMATO = /^(\d{4})-(0[1-9]|1[0-2])$/

export type Mes = {
  ano: number
  numero: number
}

export const lerMes = (texto: string | null): Mes | null => {
  const partes = texto?.match(FORMATO)
  if (!partes?.[1] || !partes[2]) {
    return null
  }
  return { ano: Number(partes[1]), numero: Number(partes[2]) }
}

export const textoDoMes = ({ ano, numero }: Mes): string => {
  return `${ano}-${String(numero).padStart(2, '0')}`
}

export const mesDe = (data: Date): Mes => {
  return { ano: data.getFullYear(), numero: data.getMonth() + 1 }
}

export const somarMeses = ({ ano, numero }: Mes, quantidade: number): Mes => {
  const indice = ano * 12 + (numero - 1) + quantidade
  return { ano: Math.floor(indice / 12), numero: (indice % 12) + 1 }
}

export const mesmoMes = (a: Mes, b: Mes): boolean => {
  return a.ano === b.ano && a.numero === b.numero
}

const formatoNome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const formatoNomeCurto = new Intl.DateTimeFormat('pt-BR', { month: 'long' })

const maiuscula = (texto: string): string => {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** 'Outubro de 2026'; com `semAno`, só 'Outubro' (para o ano corrente). */
export const nomeDoMes = ({ ano, numero }: Mes, { semAno = false } = {}): string => {
  const data = new Date(ano, numero - 1, 1)
  return maiuscula((semAno ? formatoNomeCurto : formatoNome).format(data))
}
