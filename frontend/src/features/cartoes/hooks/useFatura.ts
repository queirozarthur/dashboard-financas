import { keepPreviousData, skipToken, useMutation, useQuery } from '@tanstack/react-query'

import { requisitar, useAtualizarDados } from '@/core/api'
import { textoDoMes, type Mes } from '@/core/utils'

import { esquemaFatura } from '../consts/esquemas'

const rotaDaFatura = (cartao: number, mes: string): string => {
  return `/cartoes/${cartao}/faturas/${mes}/`
}

/** A fatura do cartão que vence no mês. */
export const useFatura = (cartao: number | null, mes: Mes) => {
  const texto = textoDoMes(mes)
  return useQuery({
    queryKey: ['faturas', cartao, texto],
    queryFn:
      cartao === null
        ? skipToken
        : () => {
            return requisitar(rotaDaFatura(cartao, texto), esquemaFatura)
          },
    // Ao trocar de mês ou de cartão, a fatura anterior fica na tela (apagada) até a nova chegar
    placeholderData: keepPreviousData,
  })
}

type Pagamento = {
  cartao: number
  /** "AAAA-MM", o mês em que a fatura vence */
  mes: string
  /** O valor não vai: o backend paga sempre o total da fatura */
  corpo: { conta: number; data: string }
}

export const usePagarFatura = () => {
  const atualizarDados = useAtualizarDados()
  return useMutation({
    mutationFn: ({ cartao, mes, corpo }: Pagamento) => {
      return requisitar(`${rotaDaFatura(cartao, mes)}pagar/`, esquemaFatura, {
        metodo: 'POST',
        corpo,
      })
    },
    onSuccess: atualizarDados,
  })
}

export const useCancelarPagamento = () => {
  const atualizarDados = useAtualizarDados()
  return useMutation({
    mutationFn: ({ cartao, mes }: Omit<Pagamento, 'corpo'>) => {
      return requisitar(`${rotaDaFatura(cartao, mes)}pagar/`, esquemaFatura, { metodo: 'DELETE' })
    },
    onSuccess: atualizarDados,
  })
}
