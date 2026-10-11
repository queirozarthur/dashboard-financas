import { errosDoDRF } from '@/core/api'

import type { CampoDoFormulario, ErrosDoFormulario } from './formulario'

// Nome do campo na API → nome no formulário de lançamento
export const CAMPOS_DO_LANCAMENTO: Readonly<Record<string, CampoDoFormulario>> = {
  valor: 'valor',
  data: 'data',
  descricao: 'descricao',
  conta: 'conta',
  conta_destino: 'contaDestino',
  categoria: 'categoria',
}

// Nome do campo em /api/compras/ → nome no mesmo formulário (a compra usa a folha de lançamento)
export const CAMPOS_DA_COMPRA: Readonly<Record<string, CampoDoFormulario>> = {
  cartao: 'conta',
  categoria: 'categoria',
  descricao: 'descricao',
  valor_total: 'valor',
  parcelas: 'parcelas',
  data_compra: 'data',
}

/** Coloca cada mensagem do backend embaixo do campo certo; o resto vira um aviso geral. */
export const errosDaApi = (dados: unknown): ErrosDoFormulario => {
  return errosDoDRF(dados, CAMPOS_DO_LANCAMENTO)
}
