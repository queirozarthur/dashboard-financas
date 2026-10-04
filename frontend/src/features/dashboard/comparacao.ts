import { formatarDinheiro } from '@/core/utils'

// O sinal vem no texto da API ("-30.00"): comparar texto, sem converter para número
const ehZero = (valor: string): boolean => {
  return /^-?0+(\.0+)?$/.test(valor)
}

/** "R$ 200,00 a mais que em setembro" a partir da diferença que a API já calculou. */
export const textoDaVariacao = (diferenca: string, mesAnterior: string): string => {
  if (ehZero(diferenca)) {
    return `Igual a ${mesAnterior}`
  }
  if (diferenca.startsWith('-')) {
    return `${formatarDinheiro(diferenca.slice(1))} a menos que em ${mesAnterior}`
  }
  return `${formatarDinheiro(diferenca)} a mais que em ${mesAnterior}`
}

export const temValor = (valor: string): boolean => {
  return !ehZero(valor)
}

export type SituacaoDoOrcamento = 'tranquilo' | 'perto' | 'estourado'

// A partir de 85% comprometido, o orçamento merece atenção
const LIMITE_DE_ATENCAO = 85

export const situacaoDoOrcamento = (
  restante: string,
  percentual: string | null,
): SituacaoDoOrcamento => {
  if (restante.startsWith('-')) {
    return 'estourado'
  }
  // Percentual não é dinheiro: aqui converter para número é seguro
  return percentual !== null && Number(percentual) >= LIMITE_DE_ATENCAO ? 'perto' : 'tranquilo'
}
