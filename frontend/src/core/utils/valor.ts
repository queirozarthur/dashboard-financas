// O backend aceita até 12 dígitos no total (DecimalField max_digits=12, decimal_places=2)
export const MAXIMO_DE_DIGITOS = 12

/**
 * Digitação a partir dos centavos, como nos apps de banco: "1234" vira "12.34".
 * Tudo em texto: o valor nunca passa por float.
 */
export const digitosParaDecimal = (digitos: string): string => {
  const limpos = digitos.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAXIMO_DE_DIGITOS)
  if (!limpos) {
    return ''
  }
  const comCentavos = limpos.padStart(3, '0')
  return `${comCentavos.slice(0, -2)}.${comCentavos.slice(-2)}`
}

/** O caminho de volta, para mostrar no campo um valor que já existe ("1500.00" → "150000"). */
export const decimalParaDigitos = (decimal: string): string => {
  const [inteiro = '', centavos = ''] = decimal.split('.')
  return `${inteiro}${centavos.padEnd(2, '0').slice(0, 2)}`.replace(/^0+/, '')
}
