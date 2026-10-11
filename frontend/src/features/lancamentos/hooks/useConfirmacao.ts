import { useMutation } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { errosDaFalha, requisitar, useAtualizarDados, type ErrosDeCampos } from '@/core/api'

import { esquemaTransacao, type Prevista } from '../consts/esquemas'
import {
  CAMPOS_DA_CONFIRMACAO,
  confirmacaoDaPrevista,
  confirmacaoParaAPI,
  validarConfirmacao,
  type CampoDaConfirmacao,
  type FormularioDeConfirmacao,
} from '../previstas'

type Confirmacao = {
  recorrencia: number
  corpo: ReturnType<typeof confirmacaoParaAPI>
}

const useConfirmar = () => {
  const atualizarDados = useAtualizarDados()
  return useMutation({
    mutationFn: ({ recorrencia, corpo }: Confirmacao) => {
      return requisitar(`/recorrencias/${recorrencia}/confirmar/`, esquemaTransacao, {
        metodo: 'POST',
        corpo,
      })
    },
    onSuccess: atualizarDados,
  })
}

type Aberta = {
  prevista: Prevista
  /** "AAAA-MM": o mês da lista em que ela estava prevista */
  mes: string
}

/** Folha "Confirmar": o previsto vira lançamento, com valor, data e conta ajustáveis. */
export const useConfirmacao = () => {
  const [aberta, setAberta] = useState(false)
  const [atual, setAtual] = useState<Aberta | null>(null)
  const [formulario, setFormulario] = useState<FormularioDeConfirmacao>({
    valor: '',
    data: '',
    conta: '',
  })
  const [erros, setErros] = useState<ErrosDeCampos<CampoDaConfirmacao>>({})
  const confirmacao = useConfirmar()

  const abrir = useCallback((prevista: Prevista, mes: string) => {
    setAtual({ prevista, mes })
    setFormulario(confirmacaoDaPrevista(prevista))
    setErros({})
    setAberta(true)
  }, [])

  const alterar = useCallback((campo: CampoDaConfirmacao, valor: string) => {
    setFormulario((anterior) => {
      return { ...anterior, [campo]: valor }
    })
    setErros((anteriores) => {
      const proximos = { ...anteriores }
      delete proximos[campo]
      return proximos
    })
  }, [])

  const confirmar = () => {
    const encontrados = validarConfirmacao(formulario)
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados)
      return
    }
    if (!atual) {
      return
    }
    confirmacao.mutate(
      {
        recorrencia: atual.prevista.recorrencia,
        corpo: confirmacaoParaAPI(formulario, atual.mes),
      },
      {
        onSuccess: () => {
          setAberta(false)
        },
        onError: (falha) => {
          setErros(errosDaFalha(falha, CAMPOS_DA_CONFIRMACAO))
        },
      },
    )
  }

  return {
    aberta,
    setAberta,
    prevista: atual?.prevista ?? null,
    formulario,
    erros,
    alterar,
    abrir,
    confirmar,
    confirmando: confirmacao.isPending,
  }
}

export type ControleDaConfirmacao = ReturnType<typeof useConfirmacao>
