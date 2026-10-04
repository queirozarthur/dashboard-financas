import { useEffect, useState } from 'react'

// Altura da barra de navegação compacta do iOS (44pt): o título grande "passa por baixo" dela
const ALTURA_DA_BARRA = 44

/**
 * Diz quando o título grande saiu da tela ao rolar, para a barra de cima mostrar o título pequeno.
 * Usa IntersectionObserver: o navegador avisa, sem escutar cada quadro da rolagem.
 */
export const useTituloRecolhido = () => {
  const [elemento, setElemento] = useState<HTMLElement | null>(null)
  const [recolhido, setRecolhido] = useState(false)

  useEffect(() => {
    if (!elemento || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        setRecolhido(entrada ? !entrada.isIntersecting : false)
      },
      { rootMargin: `-${ALTURA_DA_BARRA}px 0px 0px 0px` },
    )
    observador.observe(elemento)
    return () => {
      observador.disconnect()
    }
  }, [elemento])

  // Callback ref: o efeito roda de novo se o elemento do título mudar
  return { refTitulo: setElemento, recolhido }
}
