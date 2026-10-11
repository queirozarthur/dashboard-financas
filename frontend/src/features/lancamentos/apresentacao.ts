import type { Transacao } from './consts/esquemas'

/** O que a linha mostra em destaque: a descrição; sem ela, o que o lançamento é. */
export const tituloDoLancamento = (transacao: Transacao): string => {
  if (transacao.descricao) {
    return transacao.descricao
  }
  if (transacao.fatura_paga) {
    return 'Pagamento de fatura'
  }
  return transacao.categoria_nome ?? 'Transferência'
}

/** A linha de baixo: "Mercado · Corrente" ou "Corrente → Investimentos". */
export const detalheDoLancamento = (transacao: Transacao): string => {
  if (transacao.tipo === 'transferencia') {
    return `${transacao.conta_nome} → ${transacao.conta_destino_nome ?? ''}`
  }
  return [transacao.categoria_nome, transacao.conta_nome].filter(Boolean).join(' · ')
}

/** "3/10" embaixo do valor, nas parcelas de compras no cartão (à vista não tem número). */
export const numeroDaParcela = (transacao: Transacao): string | null => {
  const { numero_parcela: numero, parcelas_da_compra: total } = transacao
  if (numero === null || total === null || total === 1) {
    return null
  }
  return `${numero}/${total}`
}
