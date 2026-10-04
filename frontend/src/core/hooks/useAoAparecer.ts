import { useEffect, useRef, useState } from 'react'

// Começa a carregar um pouco antes do fim aparecer: a rolagem não chega a "bater no chão"
const ANTECEDENCIA = '300px'

/**
 * Chama `aoAparecer` quando o elemento marcado entra na tela (rolagem infinita).
 * Com `ativo` falso (nada mais a carregar, ou já carregando), não observa nada.
 */
export const useAoAparecer = (aoAparecer: () => void, ativo: boolean) => {
  const [elemento, setElemento] = useState<HTMLElement | null>(null)
  // Ref: o observador sempre chama a versão mais nova da função, sem ser recriado a cada render
  const funcao = useRef(aoAparecer)
  useEffect(() => {
    funcao.current = aoAparecer
  })

  useEffect(() => {
    if (!elemento || !ativo || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          funcao.current()
        }
      },
      { rootMargin: `0px 0px ${ANTECEDENCIA} 0px` },
    )
    observador.observe(elemento)
    return () => {
      observador.disconnect()
    }
  }, [elemento, ativo])

  return setElemento
}
