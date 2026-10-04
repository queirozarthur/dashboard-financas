import { useMutation } from '@tanstack/react-query'

import { ErroDaApi } from '@/core/api'

import { MENSAGENS_DE_ENTRADA } from '../consts/mensagens'
import { useSessao } from './contextoDaSessao'

type Credenciais = {
  usuario: string
  senha: string
}

const mensagemDoErro = (erro: Error): string => {
  if (erro instanceof ErroDaApi && erro.status === 401) {
    return MENSAGENS_DE_ENTRADA.credenciaisInvalidas
  }
  return MENSAGENS_DE_ENTRADA.semConexao
}

export const useEntrar = () => {
  const { entrar } = useSessao()
  const mutacao = useMutation({
    mutationFn: ({ usuario, senha }: Credenciais) => {
      return entrar(usuario, senha)
    },
  })

  return {
    entrar: mutacao.mutate,
    enviando: mutacao.isPending,
    erro: mutacao.error ? mensagemDoErro(mutacao.error) : null,
  }
}
