import { useRef, useState, type PointerEvent } from 'react'

// Puxar mais que isso para baixo fecha a folha
const DISTANCIA_PARA_FECHAR = 120
// ...ou um puxão rápido (px por ms), mesmo curto, como no iOS
const VELOCIDADE_PARA_FECHAR = 0.6
const DISTANCIA_MINIMA_DO_PUXAO = 20

export const deveFechar = (deslocamento: number, velocidade: number): boolean => {
  if (deslocamento > DISTANCIA_PARA_FECHAR) {
    return true
  }
  return velocidade > VELOCIDADE_PARA_FECHAR && deslocamento > DISTANCIA_MINIMA_DO_PUXAO
}

type Inicio = {
  y: number
  instante: number
}

// Toques em botões e campos da barra são cliques, não começo de arrasto
const ehControle = (alvo: EventTarget): boolean => {
  return alvo instanceof Element && alvo.closest('button, a, input, select, textarea') !== null
}

/** Arrastar a alça (ou a barra do topo) da folha para baixo; ao soltar, fecha ou volta ao lugar. */
export const useArrastarParaFechar = (aoFechar: () => void) => {
  const inicio = useRef<Inicio | null>(null)
  const [arrasto, setArrasto] = useState(0)
  const [arrastando, setArrastando] = useState(false)

  const aoPressionar = (evento: PointerEvent<HTMLElement>) => {
    if (ehControle(evento.target)) {
      return
    }
    inicio.current = { y: evento.clientY, instante: evento.timeStamp }
    // Captura: o movimento continua chegando aqui mesmo se o dedo sair da barra
    evento.currentTarget.setPointerCapture(evento.pointerId)
    setArrastando(true)
  }

  const aoMover = (evento: PointerEvent<HTMLElement>) => {
    if (!inicio.current) {
      return
    }
    // Só para baixo: puxar para cima não move a folha
    setArrasto(Math.max(0, evento.clientY - inicio.current.y))
  }

  const aoSoltar = (evento: PointerEvent<HTMLElement>) => {
    if (!inicio.current) {
      return
    }
    const deslocamento = Math.max(0, evento.clientY - inicio.current.y)
    const duracao = Math.max(1, evento.timeStamp - inicio.current.instante)
    inicio.current = null
    setArrastando(false)
    if (deveFechar(deslocamento, deslocamento / duracao)) {
      // Mantém o deslocamento: a animação de saída continua dali, sem pular de volta
      aoFechar()
      return
    }
    setArrasto(0)
  }

  const aoCancelar = () => {
    inicio.current = null
    setArrastando(false)
    setArrasto(0)
  }

  return {
    arrasto,
    arrastando,
    manipuladores: {
      onPointerDown: aoPressionar,
      onPointerMove: aoMover,
      onPointerUp: aoSoltar,
      onPointerCancel: aoCancelar,
    },
  }
}
