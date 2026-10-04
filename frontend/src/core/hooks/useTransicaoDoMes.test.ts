import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useTransicaoDoMes } from './useTransicaoDoMes'

const OUTUBRO = { ano: 2026, numero: 10 }
const NOVEMBRO = { ano: 2026, numero: 11 }
const DEZEMBRO_ANTERIOR = { ano: 2025, numero: 12 }

describe('useTransicaoDoMes', () => {
  it('começa parado: sem mês saindo e sem direção', () => {
    const { result } = renderHook(() => useTransicaoDoMes(OUTUBRO))
    expect(result.current).toMatchObject({ atual: OUTUBRO, saindo: null, direcao: null })
  })

  it('mês seguinte avança e guarda o anterior saindo', () => {
    const { result, rerender } = renderHook(({ mes }) => useTransicaoDoMes(mes), {
      initialProps: { mes: OUTUBRO },
    })
    rerender({ mes: NOVEMBRO })
    expect(result.current).toMatchObject({ atual: NOVEMBRO, saindo: OUTUBRO, direcao: 'avancar' })
  })

  it('mês anterior volta, mesmo atravessando o ano', () => {
    const { result, rerender } = renderHook(({ mes }) => useTransicaoDoMes(mes), {
      initialProps: { mes: OUTUBRO },
    })
    rerender({ mes: DEZEMBRO_ANTERIOR })
    expect(result.current.direcao).toBe('voltar')
  })

  it('ao terminar a saída, o mês antigo é descartado', () => {
    const { result, rerender } = renderHook(({ mes }) => useTransicaoDoMes(mes), {
      initialProps: { mes: OUTUBRO },
    })
    rerender({ mes: NOVEMBRO })
    act(() => {
      result.current.terminarSaida()
    })
    expect(result.current).toMatchObject({ atual: NOVEMBRO, saindo: null, direcao: 'avancar' })
  })
})
