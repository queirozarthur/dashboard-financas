import { useMutation } from '@tanstack/react-query'
import type { FC, ReactNode } from 'react'
import { z } from 'zod'

import { errosDaFalha, requisitar, useAtualizarDados } from '@/core/api'
import { Linha } from '@/core/ui'

type LinhaDeCadastroProps = {
  /** Rota da API, com barra no fim (ex.: "/contas/") */
  caminho: string
  id: number
  rotulo: string
  detalhe: string
  icone: ReactNode
  valor?: ReactNode
  aoTocar: () => void
  /** Apagar arrastando pode falhar (ex.: conta com lançamentos): a tela mostra o aviso */
  aoFalhar: (mensagem: string) => void
}

/** Linha de conta ou categoria: tocar abre a edição; arrastar para a esquerda revela "Apagar". */
export const LinhaDeCadastro: FC<LinhaDeCadastroProps> = ({ caminho, id, aoFalhar, ...linha }) => {
  const atualizarDados = useAtualizarDados()
  const exclusao = useMutation({
    mutationFn: () => {
      return requisitar(`${caminho}${id}/`, z.null(), { metodo: 'DELETE' })
    },
    onSuccess: atualizarDados,
    onError: (falha) => {
      aoFalhar(errosDaFalha(falha, {}).geral ?? 'Não foi possível apagar.')
    },
  })

  return (
    <Linha
      {...linha}
      acaoAoDeslizar={{
        rotulo: 'Apagar',
        aoTocar: () => {
          exclusao.mutate()
        },
      }}
    />
  )
}
