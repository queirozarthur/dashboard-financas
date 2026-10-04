import { z } from 'zod'

import { ErroDaApi } from './erros'

// O DRF devolve { campo: ["mensagem"] } ou { detail: "mensagem" }
const esquemaDeErros = z.record(z.string(), z.union([z.array(z.string()), z.string()]))

const MENSAGEM_PADRAO = 'Não foi possível salvar. Confira os dados e tente de novo.'
const MENSAGEM_DE_CONEXAO = 'Não foi possível falar com o servidor. Confira se ele está ligado.'

export type ErrosDeCampos<Campo extends string> = Partial<Record<Campo | 'geral', string>>

// Montado campo a campo: com o tipo genérico, o TypeScript não aceita o literal { geral }
const soGeral = <Campo extends string>(mensagem: string): ErrosDeCampos<Campo> => {
  const erros: ErrosDeCampos<Campo> = {}
  erros.geral = mensagem
  return erros
}

/**
 * Coloca cada mensagem do backend embaixo do campo certo do formulário.
 * `campos` liga o nome na API ao nome no formulário (ex.: conta_destino → contaDestino);
 * o que não estiver ali (detail, non_field_errors...) vira um aviso geral.
 */
export const errosDoDRF = <Campo extends string>(
  dados: unknown,
  campos: Readonly<Record<string, Campo>>,
): ErrosDeCampos<Campo> => {
  const lidos = esquemaDeErros.safeParse(dados)
  if (!lidos.success) {
    return soGeral(MENSAGEM_PADRAO)
  }
  const erros: ErrosDeCampos<Campo> = {}
  for (const [campo, mensagens] of Object.entries(lidos.data)) {
    const mensagem = Array.isArray(mensagens) ? mensagens.join(' ') : mensagens
    const destino = campos[campo] ?? 'geral'
    const anterior = erros[destino]
    erros[destino] = anterior ? `${anterior} ${mensagem}` : mensagem
  }
  return Object.keys(erros).length > 0 ? erros : soGeral(MENSAGEM_PADRAO)
}

/** Erro de uma chamada qualquer: se a API respondeu, usa as mensagens dela; se não, falta de conexão. */
export const errosDaFalha = <Campo extends string>(
  falha: unknown,
  campos: Readonly<Record<string, Campo>>,
): ErrosDeCampos<Campo> => {
  return falha instanceof ErroDaApi ? errosDoDRF(falha.dados, campos) : soGeral(MENSAGEM_DE_CONEXAO)
}
