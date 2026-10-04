import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  aoEncerrarSessao,
  encerrarSessao,
  esquemaTokens,
  guardarTokens,
  obterRefresh,
  renovarAccess,
  requisitar,
} from '@/core/api'

import type { EstadoDaSessao, ValorDaSessao } from './contextoDaSessao'

export const useControleDaSessao = (): ValorDaSessao => {
  const clienteQuery = useQueryClient()
  // Com refresh guardado, o app abre "carregando" e tenta renovar antes de decidir
  const [estado, setEstado] = useState<EstadoDaSessao>(() => {
    return obterRefresh() ? 'carregando' : 'anonimo'
  })

  useEffect(() => {
    return aoEncerrarSessao(() => {
      setEstado('anonimo')
      // Dados em cache são do usuário que saiu; o próximo login não pode enxergá-los
      clienteQuery.clear()
    })
  }, [clienteQuery])

  useEffect(() => {
    if (estado !== 'carregando') {
      return
    }
    renovarAccess().then(
      () => {
        setEstado('autenticado')
      },
      () => {
        setEstado('anonimo')
      },
    )
  }, [estado])

  const entrar = useCallback(async (usuario: string, senha: string) => {
    const tokens = await requisitar('/token/', esquemaTokens, {
      metodo: 'POST',
      corpo: { username: usuario, password: senha },
      publica: true,
    })
    guardarTokens(tokens)
    setEstado('autenticado')
  }, [])

  const sair = useCallback(() => {
    encerrarSessao()
  }, [])

  return useMemo(() => {
    return { estado, entrar, sair }
  }, [estado, entrar, sair])
}
