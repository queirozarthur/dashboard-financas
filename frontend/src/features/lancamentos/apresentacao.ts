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

/** A linha de baixo: "Mercado · Corrente", "Corrente → Investimentos", "... · parcela 3". */
export const detalheDoLancamento = (transacao: Transacao): string => {
  if (transacao.tipo === 'transferencia') {
    return `${transacao.conta_nome} → ${transacao.conta_destino_nome ?? ''}`
  }
  const partes = [transacao.categoria_nome, transacao.conta_nome]
  if (transacao.numero_parcela) {
    partes.push(`parcela ${transacao.numero_parcela}`)
  }
  return partes.filter(Boolean).join(' · ')
}
