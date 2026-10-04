// A API manda dinheiro como texto ("1500.00"); aqui ele só é formatado, nunca vira float
const DECIMAL = /^-?\d+(\.\d+)?$/

const formatoReal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// Type guard: se passar, o TypeScript sabe que o texto é um número aceito pelo Intl
const ehDecimal = (valor: string): valor is `${number}` => {
  return DECIMAL.test(valor)
}

export const formatarDinheiro = (valor: string): string => {
  if (!ehDecimal(valor)) {
    throw new Error(`Valor em dinheiro inválido: "${valor}"`)
  }
  // Intl formata a string decimal direto, sem converter para number (e sem perder centavos)
  return formatoReal.format(valor)
}

/** receita: verde com "+"; despesa: cor normal com "−"; neutro: só negativo ganha "−" e vermelho */
export type TomDoValor = 'receita' | 'despesa' | 'neutro'

type ValorApresentado = {
  texto: string
  cor: 'receita' | 'alerta' | 'normal'
}

// Sinal de menos tipográfico (U+2212), mais largo e alinhado que o hífen
const MENOS = '−'

export const apresentarValor = (valor: string, tom: TomDoValor = 'neutro'): ValorApresentado => {
  const negativo = valor.startsWith('-')
  const absoluto = formatarDinheiro(negativo ? valor.slice(1) : valor)

  if (tom === 'receita') {
    return { texto: `+${absoluto}`, cor: 'receita' }
  }
  if (tom === 'despesa') {
    return { texto: `${MENOS}${absoluto}`, cor: 'normal' }
  }
  return negativo
    ? { texto: `${MENOS}${absoluto}`, cor: 'alerta' }
    : { texto: absoluto, cor: 'normal' }
}
