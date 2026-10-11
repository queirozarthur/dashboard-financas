import { useCallback, useMemo, useState } from 'react'

import { errosDaFalha as errosDaFalhaGenerico, useContas } from '@/core/api'
import { dataDeHoje } from '@/core/utils'

import type { Transacao } from '../consts/esquemas'
import { CAMPOS_DA_COMPRA, CAMPOS_DO_LANCAMENTO } from '../erros'
import {
  compraParaAPI,
  ehCompra,
  formularioDaTransacao,
  formularioVazio,
  motivoSomenteLeitura,
  paraAPI,
  temErros,
  trocarTipo,
  validar,
  type CampoDoFormulario,
  type ErrosDoFormulario,
  type Formulario,
  type Preenchimento,
  type TipoDeLancamento,
} from '../formulario'
import {
  useApagarLancamento,
  useSalvarCompra,
  useSalvarLancamento,
} from './useMutacoesDeLancamento'

const errosDaFalha = (falha: unknown): ErrosDoFormulario => {
  return errosDaFalhaGenerico(falha, CAMPOS_DO_LANCAMENTO)
}

/** Estado da folha de lançamento: aberta ou não, o que está sendo editado, campos e erros. */
export const useControleDaFolha = () => {
  const [aberta, setAberta] = useState(false)
  const [editando, setEditando] = useState<Transacao | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(() => {
    return formularioVazio('')
  })
  const [erros, setErros] = useState<ErrosDoFormulario>({})
  const salvamento = useSalvarLancamento()
  const salvamentoDaCompra = useSalvarCompra()
  const exclusao = useApagarLancamento()
  const contas = useContas()

  // Ids (em texto, como no formulário) das contas que são cartão
  const cartoes = useMemo(() => {
    return new Set(
      (contas.data ?? [])
        .filter((conta) => {
          return conta.tipo === 'cartao'
        })
        .map((conta) => {
          return String(conta.id)
        }),
    )
  }, [contas.data])

  // Só um lançamento novo vira compra: um lançamento salvo não muda de rota
  const compra = editando === null && ehCompra(formulario, cartoes)

  const abrirNovo = useCallback((preenchimento: Preenchimento = {}) => {
    setEditando(null)
    // Data lida na hora do toque (num evento), não durante a renderização
    setFormulario(formularioVazio(dataDeHoje(new Date()), preenchimento))
    setErros({})
    setAberta(true)
  }, [])

  const abrirEdicao = useCallback((transacao: Transacao) => {
    setEditando(transacao)
    setFormulario(formularioDaTransacao(transacao))
    setErros({})
    setAberta(true)
  }, [])

  const alterar = useCallback((campo: CampoDoFormulario, valor: string) => {
    setFormulario((anterior) => {
      return { ...anterior, [campo]: valor }
    })
    // O erro daquele campo some assim que a pessoa mexe nele
    setErros((anteriores) => {
      const { [campo]: _resolvido, ...resto } = anteriores
      return resto
    })
  }, [])

  const mudarTipo = useCallback(
    (tipo: TipoDeLancamento) => {
      setFormulario((anterior) => {
        return trocarTipo(anterior, tipo, cartoes)
      })
      setErros({})
    },
    [cartoes],
  )

  const aoSalvar = {
    onSuccess: () => {
      setAberta(false)
    },
  }

  const salvar = () => {
    const encontrados = validar(formulario)
    if (temErros(encontrados)) {
      setErros(encontrados)
      return
    }
    if (compra) {
      salvamentoDaCompra.mutate(compraParaAPI(formulario), {
        ...aoSalvar,
        onError: (falha) => {
          setErros(errosDaFalhaGenerico(falha, CAMPOS_DA_COMPRA))
        },
      })
      return
    }
    salvamento.mutate(
      { id: editando?.id ?? null, corpo: paraAPI(formulario) },
      {
        ...aoSalvar,
        onError: (falha) => {
          setErros(errosDaFalha(falha))
        },
      },
    )
  }

  const apagar = () => {
    if (!editando) {
      return
    }
    exclusao.mutate(editando.id, {
      ...aoSalvar,
      onError: (falha) => {
        setErros(errosDaFalha(falha))
      },
    })
  }

  const abrirLancamento = useMemo(() => {
    return { abrirNovo, abrirEdicao }
  }, [abrirNovo, abrirEdicao])

  return {
    abrirLancamento,
    aberta,
    setAberta,
    editando,
    somenteLeitura: editando ? motivoSomenteLeitura(editando) : null,
    formulario,
    erros,
    alterar,
    mudarTipo,
    compra,
    salvar,
    salvando: salvamento.isPending || salvamentoDaCompra.isPending,
    apagar,
    apagando: exclusao.isPending,
  }
}

export type ControleDaFolha = ReturnType<typeof useControleDaFolha>
