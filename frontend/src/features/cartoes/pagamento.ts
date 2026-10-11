import type { Conta, ErrosDeCampos } from '@/core/api'

export type FormularioDePagamento = {
  /** Id da conta que paga, em texto como a seleção entrega */
  conta: string
  data: string
}

export type CampoDoPagamento = keyof FormularioDePagamento

export const CAMPOS_DO_PAGAMENTO: Readonly<Record<string, CampoDoPagamento>> = {
  conta: 'conta',
  data: 'data',
}

/** Pagamento é uma transferência de uma conta comum: cartão não paga cartão. */
export const contasQuePagam = (contas: readonly Conta[]): Conta[] => {
  return contas.filter((conta) => {
    return conta.tipo !== 'cartao'
  })
}

/** Com uma conta só, ela já vem escolhida; com mais, a pessoa escolhe. */
export const pagamentoVazio = (contas: readonly Conta[], hoje: string): FormularioDePagamento => {
  const [unica, ...outras] = contasQuePagam(contas)
  return { conta: unica && outras.length === 0 ? String(unica.id) : '', data: hoje }
}

export const validarPagamento = (
  formulario: FormularioDePagamento,
): ErrosDeCampos<CampoDoPagamento> => {
  const erros: ErrosDeCampos<CampoDoPagamento> = {}
  if (!formulario.conta) {
    erros.conta = 'Escolha a conta que pagou.'
  }
  if (!formulario.data) {
    erros.data = 'Informe a data do pagamento.'
  }
  return erros
}

export const pagamentoParaAPI = (formulario: FormularioDePagamento) => {
  return { conta: Number(formulario.conta), data: formulario.data }
}
