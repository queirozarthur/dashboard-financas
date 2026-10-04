import { useMutation } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { z } from 'zod'

import { errosDaFalha, requisitar, useAtualizarDados, type ErrosDeCampos } from '@/core/api'

export type ConfiguracaoDoCadastro<Formulario, Item, Campo extends string> = {
  /** Rota da API, com barra no fim (ex.: "/contas/") */
  caminho: string
  esquema: z.ZodType<Item>
  /** Nome do campo na API → nome no formulário, para os erros caírem no lugar certo */
  campos: Readonly<Record<string, Campo>>
  doItem: (item: Item) => Formulario
  validar: (formulario: Formulario) => ErrosDeCampos<Campo>
  paraAPI: (formulario: Formulario) => unknown
}

/**
 * Estado de uma folha de cadastro (conta, categoria): aberta, o que está sendo editado,
 * campos, erros, salvar e apagar. Cada tela passa a sua configuração.
 */
export const useFolhaDeCadastro = <
  Formulario extends object,
  Item extends { id: number },
  Campo extends keyof Formulario & string,
>(
  configuracao: ConfiguracaoDoCadastro<Formulario, Item, Campo>,
  inicial: Formulario,
) => {
  const { caminho, esquema, campos, doItem, validar, paraAPI } = configuracao
  const [aberta, setAberta] = useState(false)
  const [editando, setEditando] = useState<Item | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(inicial)
  const [erros, setErros] = useState<ErrosDeCampos<Campo>>({})
  const atualizarDados = useAtualizarDados()

  const salvamento = useMutation({
    mutationFn: ({ id, corpo }: { id: number | null; corpo: unknown }) => {
      return id === null
        ? requisitar(caminho, esquema, { metodo: 'POST', corpo })
        : requisitar(`${caminho}${id}/`, esquema, { metodo: 'PATCH', corpo })
    },
    onSuccess: atualizarDados,
  })

  const exclusao = useMutation({
    mutationFn: (id: number) => {
      // DELETE responde 204 sem corpo
      return requisitar(`${caminho}${id}/`, z.null(), { metodo: 'DELETE' })
    },
    onSuccess: atualizarDados,
  })

  /** `novo` vem de quem abre: a conta nova já sabe a próxima cor da paleta */
  const abrirNovo = useCallback((novo: Formulario) => {
    setEditando(null)
    setFormulario(novo)
    setErros({})
    setAberta(true)
  }, [])

  const abrirEdicao = useCallback(
    (item: Item) => {
      setEditando(item)
      setFormulario(doItem(item))
      setErros({})
      setAberta(true)
    },
    [doItem],
  )

  const alterar = useCallback(<Chave extends Campo>(campo: Chave, valor: Formulario[Chave]) => {
    setFormulario((anterior) => {
      return { ...anterior, [campo]: valor }
    })
    // O erro daquele campo some assim que a pessoa mexe nele
    setErros((anteriores) => {
      const proximos = { ...anteriores }
      delete proximos[campo]
      return proximos
    })
  }, [])

  /** Para mudanças que mexem em vários campos de uma vez (ex.: trocar o tipo da conta) */
  const transformar = useCallback((mudanca: (anterior: Formulario) => Formulario) => {
    setFormulario(mudanca)
    setErros({})
  }, [])

  const salvar = () => {
    const encontrados = validar(formulario)
    if (Object.keys(encontrados).length > 0) {
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
          setErros(errosDaFalha(falha, campos))
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
        setErros(errosDaFalha(falha, campos))
      },
    })
  }

  return {
    aberta,
    setAberta,
    editando,
    formulario,
    erros,
    alterar,
    transformar,
    abrirNovo,
    abrirEdicao,
    salvar,
    salvando: salvamento.isPending,
    apagar,
    apagando: exclusao.isPending,
  }
}
