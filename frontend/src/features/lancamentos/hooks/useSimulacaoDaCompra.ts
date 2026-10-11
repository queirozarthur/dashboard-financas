import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { requisitar } from '@/core/api'
import { useAtrasado } from '@/core/hooks'

import { esquemaSimulacao } from '../consts/esquemas'
import type { Formulario } from '../formulario'

// Tempo sem digitar antes de perguntar ao backend
const ESPERA = 300

const parametrosDaSimulacao = (formulario: Formulario, ativa: boolean): string => {
  if (!ativa || !formulario.valor || !formulario.data || !formulario.conta) {
    return ''
  }
  return new URLSearchParams({
    cartao: formulario.conta,
    valor_total: formulario.valor,
    parcelas: formulario.parcelas,
    data_compra: formulario.data,
  }).toString()
}

/**
 * Em quais faturas as parcelas da compra vão cair, e quanto vale cada uma. Quem calcula é o
 * backend (as mesmas regras que gravam a compra): aqui nenhuma data ou valor é inventado.
 */
export const useSimulacaoDaCompra = (formulario: Formulario, ativa: boolean) => {
  // Texto, não objeto: o atraso compara por igualdade
  const parametros = useAtrasado(parametrosDaSimulacao(formulario, ativa), ESPERA)
  return useQuery({
    queryKey: ['simulacao', parametros],
    queryFn: () => {
      return requisitar(`/compras/simulacao/?${parametros}`, esquemaSimulacao)
    },
    enabled: parametros !== '',
    // Enquanto a nova simulação não chega, a anterior fica na tela (apagada)
    placeholderData: keepPreviousData,
  })
}
