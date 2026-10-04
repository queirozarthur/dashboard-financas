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
