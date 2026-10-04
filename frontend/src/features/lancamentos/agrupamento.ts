import type { Transacao } from './consts/esquemas'

export type DiaDaLista = {
  data: string
  titulo: string
  transacoes: Transacao[]
}

// "2026-10-02" como data local (new Date("2026-10-02") seria meia-noite UTC: o dia anterior aqui)
const dataLocal = (texto: string): Date => {
  const [ano = 0, mes = 1, dia = 1] = texto.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

const mesmoDia = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const formatoDoDia = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const formatoComAno = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "Hoje", "Ontem" ou "Sexta-feira, 2 de outubro" (com o ano, se não for o ano corrente). */
export const tituloDoDia = (texto: string, hoje: Date): string => {
  const dia = dataLocal(texto)
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1)
  if (mesmoDia(dia, hoje)) {
    return 'Hoje'
  }
  if (mesmoDia(dia, ontem)) {
    return 'Ontem'
  }
  const formato = dia.getFullYear() === hoje.getFullYear() ? formatoDoDia : formatoComAno
  const titulo = formato.format(dia)
  return titulo.charAt(0).toUpperCase() + titulo.slice(1)
}

/**
 * Separa os lançamentos por dia, mantendo a ordem da API (mais recente primeiro).
 * Só agrupa: nenhum total por dia, porque somar dinheiro é trabalho do backend.
 */
export const agruparPorDia = (transacoes: readonly Transacao[], hoje: Date): DiaDaLista[] => {
  const dias: DiaDaLista[] = []
  for (const transacao of transacoes) {
    const atual = dias.at(-1)
    if (atual?.data === transacao.data) {
      atual.transacoes.push(transacao)
    } else {
      dias.push({
        data: transacao.data,
        titulo: tituloDoDia(transacao.data, hoje),
        transacoes: [transacao],
      })
    }
  }
  return dias
}
