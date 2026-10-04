import { useCallback, useRef, useState, type MouseEvent, type PointerEvent } from 'react'

/** Largura do botão revelado atrás da linha (w-20) */
export const LARGURA_DA_ACAO = 80
// Movimento mínimo para decidir se o dedo está rolando a lista ou arrastando a linha
const LIMIAR_DE_DIRECAO = 8

/** Soltou depois de passar da metade do botão: a linha fica aberta mostrando a ação. */
export const deveFicarAberta = (deslocamento: number): boolean => {
  return deslocamento <= -LARGURA_DA_ACAO / 2
}

// Não deixa puxar além de 1,5× o botão nem para a direita
const limitar = (deslocamento: number): number => {
  return Math.min(0, Math.max(-LARGURA_DA_ACAO * 1.5, deslocamento))
}

type Gesto = {
  x: number
  y: number
  base: number
  direcao: 'horizontal' | 'vertical' | null
}

/**
 * Arrastar uma linha para a esquerda revela uma ação (ex.: "Apagar"), como no Mail do iPhone.
 * Só com o dedo: no mouse, arrastar continua sendo selecionar texto.
 */
export const useDeslizarLinha = (habilitado: boolean) => {
  const gesto = useRef<Gesto | null>(null)
  // Depois de um arrasto, o navegador ainda dispara um clique: ele não pode abrir a linha
  const ignorarClique = useRef(false)
  const [deslocamento, setDeslocamento] = useState(0)
  const [arrastando, setArrastando] = useState(false)
  const [aberta, setAberta] = useState(false)

  const fechar = useCallback(() => {
    setAberta(false)
    setDeslocamento(0)
  }, [])

  const aoPressionar = (evento: PointerEvent<HTMLElement>) => {
    if (!habilitado || evento.pointerType !== 'touch') {
      return
    }
    gesto.current = {
      x: evento.clientX,
      y: evento.clientY,
      base: aberta ? -LARGURA_DA_ACAO : 0,
      direcao: null,
    }
  }

  const aoMover = (evento: PointerEvent<HTMLElement>) => {
    const atual = gesto.current
    if (!atual) {
      return
    }
    const dx = evento.clientX - atual.x
    const dy = evento.clientY - atual.y
    if (atual.direcao === null) {
      if (Math.abs(dx) > LIMIAR_DE_DIRECAO && Math.abs(dx) > Math.abs(dy)) {
        atual.direcao = 'horizontal'
        evento.currentTarget.setPointerCapture(evento.pointerId)
        setArrastando(true)
      } else if (Math.abs(dy) > LIMIAR_DE_DIRECAO) {
        // Movimento vertical: é rolagem da lista, a linha não se mexe
        atual.direcao = 'vertical'
      }
    }
    if (atual.direcao === 'horizontal') {
      setDeslocamento(limitar(atual.base + dx))
    }
  }

  const aoSoltar = (evento: PointerEvent<HTMLElement>) => {
    const atual = gesto.current
    gesto.current = null
    if (atual?.direcao !== 'horizontal') {
      return
    }
    ignorarClique.current = true
    setArrastando(false)
    const abrir = deveFicarAberta(limitar(atual.base + evento.clientX - atual.x))
    setAberta(abrir)
    setDeslocamento(abrir ? -LARGURA_DA_ACAO : 0)
  }

  const aoCancelar = () => {
    gesto.current = null
    setArrastando(false)
    setDeslocamento(aberta ? -LARGURA_DA_ACAO : 0)
  }

  // Captura: roda antes do onClick da linha e pode impedir que ele aconteça
  const aoClicar = (evento: MouseEvent<HTMLElement>) => {
    if (ignorarClique.current || aberta) {
      evento.preventDefault()
      evento.stopPropagation()
      ignorarClique.current = false
      // Com a linha aberta, tocar nela só fecha (não abre o formulário)
      fechar()
    }
  }

  return {
    deslocamento,
    arrastando,
    aberta,
    fechar,
    manipuladores: {
      onPointerDown: aoPressionar,
      onPointerMove: aoMover,
      onPointerUp: aoSoltar,
      onPointerCancel: aoCancelar,
      onClickCapture: aoClicar,
    },
  }
}
