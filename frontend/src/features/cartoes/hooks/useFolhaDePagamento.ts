import { useCallback, useState } from 'react'

import { errosDaFalha, type Conta, type ErrosDeCampos } from '@/core/api'
import { dataDeHoje } from '@/core/utils'

import {
  CAMPOS_DO_PAGAMENTO,
  pagamentoParaAPI,
  pagamentoVazio,
  validarPagamento,
  type CampoDoPagamento,
  type FormularioDePagamento,
} from '../pagamento'
import { usePagarFatura } from './useFatura'

type FaturaParaPagar = {
  cartao: number
  mes: string
}

/** Folha "Pagar fatura": conta e data; o valor é sempre o total, decidido pelo backend. */
export const useFolhaDePagamento = () => {
  const [aberta, setAberta] = useState(false)
  const [fatura, setFatura] = useState<FaturaParaPagar | null>(null)
  const [formulario, setFormulario] = useState<FormularioDePagamento>({ conta: '', data: '' })
  const [erros, setErros] = useState<ErrosDeCampos<CampoDoPagamento>>({})
  const pagamento = usePagarFatura()

  const abrir = useCallback((paraPagar: FaturaParaPagar, contas: readonly Conta[]) => {
    setFatura(paraPagar)
    // Data lida na hora do toque (num evento), não durante a renderização
    setFormulario(pagamentoVazio(contas, dataDeHoje(new Date())))
    setErros({})
    setAberta(true)
  }, [])

  const alterar = useCallback((campo: CampoDoPagamento, valor: string) => {
    setFormulario((anterior) => {
      return { ...anterior, [campo]: valor }
    })
    setErros((anteriores) => {
      const proximos = { ...anteriores }
      delete proximos[campo]
      return proximos
    })
  }, [])

  const pagar = () => {
    const encontrados = validarPagamento(formulario)
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados)
      return
    }
    if (!fatura) {
      return
    }
    pagamento.mutate(
      { ...fatura, corpo: pagamentoParaAPI(formulario) },
      {
        onSuccess: () => {
          setAberta(false)
        },
        onError: (falha) => {
          setErros(errosDaFalha(falha, CAMPOS_DO_PAGAMENTO))
        },
      },
    )
  }

  return {
    aberta,
    setAberta,
    formulario,
    erros,
    alterar,
    abrir,
    pagar,
    pagando: pagamento.isPending,
  }
}

export type ControleDoPagamento = ReturnType<typeof useFolhaDePagamento>
