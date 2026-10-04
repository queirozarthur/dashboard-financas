import { z } from 'zod'

import type { CampoDoFormulario, ErrosDoFormulario } from './formulario'

// O DRF devolve { campo: ["mensagem"] } ou { detail: "mensagem" }
const esquemaDeErros = z.record(z.string(), z.union([z.array(z.string()), z.string()]))

const CAMPOS_DA_API: Record<string, CampoDoFormulario> = {
  valor: 'valor',
  data: 'data',
  descricao: 'descricao',
  conta: 'conta',
  conta_destino: 'contaDestino',
  categoria: 'categoria',
}

const MENSAGEM_PADRAO = 'Não foi possível salvar. Confira os dados e tente de novo.'

/** Coloca cada mensagem do backend embaixo do campo certo; o resto vira um aviso geral. */
export const errosDaApi = (dados: unknown): ErrosDoFormulario => {
  const lidos = esquemaDeErros.safeParse(dados)
  if (!lidos.success) {
    return { geral: MENSAGEM_PADRAO }
  }
  const erros: ErrosDoFormulario = {}
  for (const [campo, mensagens] of Object.entries(lidos.data)) {
    const mensagem = Array.isArray(mensagens) ? mensagens.join(' ') : mensagens
    const destino = CAMPOS_DA_API[campo] ?? 'geral'
    erros[destino] = erros[destino] ? `${erros[destino]} ${mensagem}` : mensagem
  }
  return Object.keys(erros).length > 0 ? erros : { geral: MENSAGEM_PADRAO }
}
