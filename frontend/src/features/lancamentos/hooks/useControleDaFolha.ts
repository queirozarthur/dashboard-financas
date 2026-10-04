import { useCallback, useMemo, useState } from 'react'

import { ErroDaApi } from '@/core/api'

import type { Transacao } from '../consts/esquemas'
import { errosDaApi } from '../erros'
import {
  dataDeHoje,
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
  type TipoDeLancamento,
} from '../formulario'
import { useApagarLancamento, useSalvarLancamento } from './useMutacoesDeLancamento'

const MENSAGEM_DE_CONEXAO = 'Não foi possível falar com o servidor. Confira se ele está ligado.'

const errosDaFalha = (falha: unknown): ErrosDoFormulario => {
  return falha instanceof ErroDaApi ? errosDaApi(falha.dados) : { geral: MENSAGEM_DE_CONEXAO }
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
  const exclusao = useApagarLancamento()

  const abrirNovo = useCallback(() => {
    setEditando(null)
    // Data lida na hora do toque (num evento), não durante a renderização
    setFormulario(formularioVazio(dataDeHoje(new Date())))
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

  const mudarTipo = useCallback((tipo: TipoDeLancamento) => {
    setFormulario((anterior) => {
      return trocarTipo(anterior, tipo)
    })
    setErros({})
  }, [])

  const salvar = () => {
    const encontrados = validar(formulario)
    if (temErros(encontrados)) {
      setErros(encontrados)
      return
    }
    salvamento.mutate(
      { id: editando?.id ?? null, corpo: paraAPI(formulario) },
      {
        onSuccess: () => {
          setAberta(false)
        },
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
      onSuccess: () => {
        setAberta(false)
      },
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
    salvar,
    salvando: salvamento.isPending,
    apagar,
    apagando: exclusao.isPending,
  }
}

export type ControleDaFolha = ReturnType<typeof useControleDaFolha>
