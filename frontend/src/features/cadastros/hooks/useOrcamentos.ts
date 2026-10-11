import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { z } from 'zod'

import { errosDaFalha, requisitar, useAtualizarDados, type ErrosDeCampos } from '@/core/api'

import { esquemaOrcamento, type Orcamento } from '../consts/esquemas'
import {
  CAMPOS_DO_ORCAMENTO,
  formularioDoOrcamento,
  orcamentoVazio,
  pedidoDoOrcamento,
  validarOrcamento,
  type CampoDoOrcamento,
  type FormularioDeOrcamento,
  type PedidoDoOrcamento,
} from '../orcamentos'

/** Os limites que valem no mês (o vigente de cada categoria, calculado no backend). */
export const useOrcamentos = (mes: string) => {
  return useQuery({
    queryKey: ['orcamentos', mes],
    queryFn: () => {
      return requisitar(`/orcamentos/?mes=${mes}`, z.array(esquemaOrcamento))
    },
    placeholderData: keepPreviousData,
  })
}

/**
 * Folha de limite. Não usa a folha genérica de cadastro: mudar o valor pode criar uma
 * vigência nova (POST) em vez de editar a que existe (PATCH), conforme o mês.
 */
export const useFolhaDeOrcamento = () => {
  const [aberta, setAberta] = useState(false)
  const [editando, setEditando] = useState<Orcamento | null>(null)
  const [mes, setMes] = useState('')
  const [formulario, setFormulario] = useState<FormularioDeOrcamento>(orcamentoVazio)
  const [erros, setErros] = useState<ErrosDeCampos<CampoDoOrcamento>>({})
  const atualizarDados = useAtualizarDados()

  const salvamento = useMutation({
    mutationFn: (pedido: PedidoDoOrcamento) => {
      return requisitar(pedido.caminho, esquemaOrcamento, {
        metodo: pedido.metodo,
        corpo: pedido.corpo,
      })
    },
    onSuccess: atualizarDados,
  })

  const exclusao = useMutation({
    mutationFn: (id: number) => {
      return requisitar(`/orcamentos/${id}/`, z.null(), { metodo: 'DELETE' })
    },
    onSuccess: atualizarDados,
  })

  /** `mesDaTela` ("AAAA-MM"): o limite novo, ou o valor novo, vale dele em diante */
  const abrirNovo = useCallback((mesDaTela: string) => {
    setEditando(null)
    setMes(mesDaTela)
    setFormulario(orcamentoVazio())
    setErros({})
    setAberta(true)
  }, [])

  const abrirEdicao = useCallback((orcamento: Orcamento, mesDaTela: string) => {
    setEditando(orcamento)
    setMes(mesDaTela)
    setFormulario(formularioDoOrcamento(orcamento))
    setErros({})
    setAberta(true)
  }, [])

  const alterar = useCallback((campo: CampoDoOrcamento, valor: string) => {
    setFormulario((anterior) => {
      return { ...anterior, [campo]: valor }
    })
    setErros((anteriores) => {
      const proximos = { ...anteriores }
      delete proximos[campo]
      return proximos
    })
  }, [])

  const fechar = () => {
    setAberta(false)
  }

  const salvar = () => {
    const encontrados = validarOrcamento(formulario)
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados)
      return
    }
    const pedido = pedidoDoOrcamento(formulario, editando, mes)
    if (!pedido) {
      fechar()
      return
    }
    salvamento.mutate(pedido, {
      onSuccess: fechar,
      onError: (falha) => {
        setErros(errosDaFalha(falha, CAMPOS_DO_ORCAMENTO))
      },
    })
  }

  const apagar = () => {
    if (!editando) {
      return
    }
    exclusao.mutate(editando.id, {
      onSuccess: fechar,
      onError: (falha) => {
        setErros(errosDaFalha(falha, CAMPOS_DO_ORCAMENTO))
      },
    })
  }

  return {
    aberta,
    setAberta,
    editando,
    mes,
    formulario,
    erros,
    alterar,
    abrirNovo,
    abrirEdicao,
    salvar,
    salvando: salvamento.isPending,
    apagar,
    apagando: exclusao.isPending,
  }
}

export type ControleDaFolhaDeOrcamento = ReturnType<typeof useFolhaDeOrcamento>
