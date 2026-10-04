import type { Transacao } from './consts/esquemas'

export type TipoDeLancamento = Transacao['tipo']

/** Estado do formulário: tudo em texto, como os campos entregam (ids e valor inclusive). */
export type Formulario = {
  tipo: TipoDeLancamento
  valor: string
  descricao: string
  data: string
  conta: string
  contaDestino: string
  categoria: string
}

export type CampoDoFormulario = keyof Formulario

export type ErrosDoFormulario = Partial<Record<CampoDoFormulario | 'geral', string>>

/** O que vai no corpo do POST/PATCH em /api/transacoes/ */
export type CorpoDoLancamento = {
  tipo: TipoDeLancamento
  valor: string
  data: string
  descricao: string
  conta: number
  conta_destino: number | null
  categoria: number | null
}

/** "2026-10-04" pela data local (toISOString daria o dia em UTC, que à noite já é amanhã). */
export const dataDeHoje = (agora: Date): string => {
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

export const formularioVazio = (hoje: string): Formulario => {
  return {
    tipo: 'despesa',
    valor: '',
    descricao: '',
    data: hoje,
    conta: '',
    contaDestino: '',
    categoria: '',
  }
}

export const formularioDaTransacao = (transacao: Transacao): Formulario => {
  return {
    tipo: transacao.tipo,
    valor: transacao.valor,
    descricao: transacao.descricao,
    data: transacao.data,
    conta: String(transacao.conta),
    contaDestino: transacao.conta_destino === null ? '' : String(transacao.conta_destino),
    categoria: transacao.categoria === null ? '' : String(transacao.categoria),
  }
}

/** Trocar o tipo limpa o que deixou de fazer sentido (categoria de outra natureza, destino). */
export const trocarTipo = (formulario: Formulario, tipo: TipoDeLancamento): Formulario => {
  return {
    ...formulario,
    tipo,
    categoria: tipo === formulario.tipo ? formulario.categoria : '',
    contaDestino: tipo === 'transferencia' ? formulario.contaDestino : '',
  }
}

/** Confere o básico antes de enviar; as regras completas continuam valendo no backend. */
export const validar = (formulario: Formulario): ErrosDoFormulario => {
  const erros: ErrosDoFormulario = {}
  if (!formulario.valor) {
    erros.valor = 'Informe o valor.'
  }
  if (!formulario.data) {
    erros.data = 'Informe a data.'
  }
  if (!formulario.conta) {
    erros.conta = 'Escolha a conta.'
  }
  if (formulario.tipo === 'transferencia') {
    if (!formulario.contaDestino) {
      erros.contaDestino = 'Escolha a conta de destino.'
    } else if (formulario.contaDestino === formulario.conta) {
      erros.contaDestino = 'Escolha uma conta diferente da de origem.'
    }
  } else if (!formulario.categoria) {
    erros.categoria = 'Escolha a categoria.'
  }
  return erros
}

export const temErros = (erros: ErrosDoFormulario): boolean => {
  return Object.keys(erros).length > 0
}

export const paraAPI = (formulario: Formulario): CorpoDoLancamento => {
  const transferencia = formulario.tipo === 'transferencia'
  return {
    tipo: formulario.tipo,
    // Dinheiro vai como texto, do jeito que o campo entregou
    valor: formulario.valor,
    data: formulario.data,
    descricao: formulario.descricao.trim(),
    conta: Number(formulario.conta),
    conta_destino: transferencia ? Number(formulario.contaDestino) : null,
    categoria: transferencia ? null : Number(formulario.categoria),
  }
}

/** Parcelas e pagamentos de fatura têm rotas próprias: aqui só dá para ver. */
export const motivoSomenteLeitura = (transacao: Transacao): string | null => {
  if (transacao.compra !== null) {
    return `Esta é a parcela ${transacao.numero_parcela ?? ''} de uma compra no cartão. Para mudar, apague a compra e lance de novo na aba Cartões.`
  }
  if (transacao.fatura_paga !== null) {
    return 'Este é o pagamento de uma fatura. Para desfazer, cancele o pagamento na fatura, na aba Cartões.'
  }
  return null
}
