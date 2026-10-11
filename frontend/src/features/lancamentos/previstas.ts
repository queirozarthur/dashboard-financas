import type { ErrosDeCampos } from '@/core/api'
import { dataCurta } from '@/core/utils'

import type { Prevista } from './consts/esquemas'
import type { Filtros } from './hooks/useFiltros'

/** Os mesmos filtros da lista: a conta vale como origem ou destino (extrato). Só filtra, não soma. */
export const previstasDoFiltro = (previstas: readonly Prevista[], filtros: Filtros): Prevista[] => {
  return previstas.filter((prevista) => {
    const conta =
      !filtros.conta ||
      String(prevista.conta) === filtros.conta ||
      String(prevista.conta_destino) === filtros.conta
    const categoria = !filtros.categoria || String(prevista.categoria) === filtros.categoria
    return conta && categoria
  })
}

/** A linha de baixo: a conta, ou "Corrente → Investimentos" na transferência. */
export const detalheDaPrevista = (prevista: Prevista): string => {
  return prevista.tipo === 'transferencia'
    ? `${prevista.conta_nome} → ${prevista.conta_destino_nome ?? ''}`
    : prevista.conta_nome
}

/** Embaixo do valor: a data sugerida ("10 de nov."). */
export const notaDaPrevista = (prevista: Prevista): string => {
  return dataCurta(prevista.data)
}

export type FormularioDeConfirmacao = {
  valor: string
  data: string
  conta: string
}

export type CampoDaConfirmacao = keyof FormularioDeConfirmacao

// `mes` e o 409 ("já confirmada") viram aviso geral: não são campos da folha
export const CAMPOS_DA_CONFIRMACAO: Readonly<Record<string, CampoDaConfirmacao>> = {
  valor: 'valor',
  data: 'data',
  conta: 'conta',
}

/** A folha abre com o que foi previsto: valor, data sugerida e conta. */
export const confirmacaoDaPrevista = (prevista: Prevista): FormularioDeConfirmacao => {
  return { valor: prevista.valor, data: prevista.data, conta: String(prevista.conta) }
}

export const validarConfirmacao = (
  formulario: FormularioDeConfirmacao,
): ErrosDeCampos<CampoDaConfirmacao> => {
  const erros: ErrosDeCampos<CampoDaConfirmacao> = {}
  if (!formulario.valor) {
    erros.valor = 'Informe o valor.'
  }
  if (!formulario.data) {
    erros.data = 'Informe a data.'
  }
  if (!formulario.conta) {
    erros.conta = 'Escolha a conta.'
  }
  return erros
}

/** `mes` é a competência: o mês a que o lançamento se refere, mesmo pago em outro. */
export const confirmacaoParaAPI = (formulario: FormularioDeConfirmacao, mes: string) => {
  return {
    mes,
    valor: formulario.valor,
    data: formulario.data,
    conta: Number(formulario.conta),
  }
}
