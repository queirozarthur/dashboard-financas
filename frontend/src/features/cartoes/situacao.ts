import { dataCurta, dataNumerica, dataPorExtenso } from '@/core/utils'

import type { Fatura, ParcelaDaCompra, ParcelaDaFatura } from './consts/esquemas'

/**
 * aberta: ainda recebe compras; fechada: pronta para pagar; vencida: fechada e o vencimento
 * já passou; paga; sem-compras: nada para pagar.
 */
export type SituacaoDaFatura = 'aberta' | 'fechada' | 'vencida' | 'paga' | 'sem-compras'

/** `hoje` no formato da API ("2026-10-11"): datas nesse formato se comparam como texto. */
export const situacaoDaFatura = (fatura: Fatura, hoje: string): SituacaoDaFatura => {
  if (fatura.situacao === 'paga') {
    return 'paga'
  }
  if (fatura.parcelas.length === 0) {
    return 'sem-compras'
  }
  // "Fechada" é regra de negócio e vem do backend; "vencida" é só aviso, conferido aqui
  if (!fatura.fechada) {
    return 'aberta'
  }
  return hoje > fatura.vencimento ? 'vencida' : 'fechada'
}

export const podePagar = (situacao: SituacaoDaFatura): boolean => {
  return situacao === 'fechada' || situacao === 'vencida'
}

/**
 * As datas que importam em cada situação, uma frase por item: a tela junta com " · " e
 * não deixa quebrar a linha no meio de uma data.
 */
export const datasDaFatura = (fatura: Fatura, situacao: SituacaoDaFatura): string[] => {
  const fecha = dataPorExtenso(fatura.fechamento)
  const vence = dataPorExtenso(fatura.vencimento)
  switch (situacao) {
    case 'paga':
      return fatura.pagamento
        ? [`Paga em ${dataPorExtenso(fatura.pagamento.data)}`, fatura.pagamento.conta_nome]
        : ['Paga']
    case 'aberta':
      return [`Fecha em ${fecha}`, `vence em ${vence}`]
    case 'fechada':
      return [`Fechou em ${fecha}`, `vence em ${vence}`]
    case 'vencida':
      return [`Venceu em ${vence}`]
    case 'sem-compras':
      return [`Vence em ${vence}`]
  }
}

/** Linha de baixo de uma compra na fatura: a categoria (se não for o título) e quando comprou. */
export const detalheDaParcela = (parcela: ParcelaDaFatura): string => {
  const partes = [
    // Com descrição, a categoria vai para a linha de baixo; sem, ela já é o título
    parcela.descricao ? parcela.categoria_nome : null,
    dataCurta(parcela.data_compra),
  ]
  return partes.filter(Boolean).join(' · ')
}

/** "3/12" embaixo do valor; compra à vista não tem número de parcela. */
export const numeroDaParcela = (parcela: ParcelaDaFatura): string | null => {
  return parcela.numero === '1/1' ? null : parcela.numero
}

/** Situação de cada parcela de uma compra: paga (pelo backend), vencida ou a vencer. */
export const situacaoDaParcela = (parcela: ParcelaDaCompra, hoje: string): string => {
  if (parcela.situacao === 'paga' && parcela.data_pagamento) {
    return `Paga em ${dataNumerica(parcela.data_pagamento)}`
  }
  const quando = dataNumerica(parcela.vencimento)
  return hoje > parcela.vencimento ? `Venceu em ${quando}` : `Vence em ${quando}`
}
