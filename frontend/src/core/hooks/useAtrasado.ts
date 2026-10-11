import { useEffect, useState } from 'react'

/**
 * Devolve `valor` só depois de `espera` ms sem mudanças: enquanto a pessoa digita, a busca
 * que depende dele espera, em vez de sair um pedido a cada tecla.
 * Use com valores comparáveis por igualdade (texto, número): um objeto novo a cada render
 * reiniciaria a espera para sempre.
 */
export const useAtrasado = <T>(valor: T, espera: number): T => {
  const [atrasado, setAtrasado] = useState(valor)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setAtrasado(valor)
    }, espera)
    return () => {
      clearTimeout(temporizador)
    }
  }, [valor, espera])

  return atrasado
}
