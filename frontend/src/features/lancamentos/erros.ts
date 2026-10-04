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

/** Coloca cada mensagem do backend embaixo do campo certo; o resto vira um aviso geral. */
export const errosDaApi = (dados: unknown): ErrosDoFormulario => {
  return errosDoDRF(dados, CAMPOS_DO_LANCAMENTO)
}
