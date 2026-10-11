// Datas chegam da API como texto "AAAA-MM-DD", sem hora nem fuso

/** "2026-10-02" como data local (new Date("2026-10-02") seria meia-noite UTC: o dia anterior aqui). */
export const lerData = (texto: string): Date => {
  const [ano = 0, mes = 1, dia = 1] = texto.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

/** "2026-10-04" pela data local (toISOString daria o dia em UTC, que à noite já é amanhã). */
export const dataDeHoje = (agora: Date): string => {
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

const formatoSemAno = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })
const formatoComAno = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "5 de novembro"; com `comAno`, "5 de novembro de 2026". */
export const dataPorExtenso = (texto: string, { comAno = false } = {}): string => {
  return (comAno ? formatoComAno : formatoSemAno).format(lerData(texto))
}

const formatoCurto = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const formatoNumerico = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** "14 de ago.": para a linha de baixo das listas, onde o mês inteiro não cabe no celular. */
export const dataCurta = (texto: string): string => {
  return formatoCurto.format(lerData(texto))
}

/** "05/09/2026": datas de anos diferentes lado a lado (parcelas de uma compra). */
export const dataNumerica = (texto: string): string => {
  return formatoNumerico.format(lerData(texto))
}
