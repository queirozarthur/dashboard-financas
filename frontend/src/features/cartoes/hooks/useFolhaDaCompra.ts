import { useCallback, useState } from 'react'

/** Qual compra a folha mostra. O id fica guardado ao fechar: a folha anima com o conteúdo. */
export const useFolhaDaCompra = () => {
  const [aberta, setAberta] = useState(false)
  const [compraId, setCompraId] = useState<number | null>(null)

  const abrir = useCallback((id: number) => {
    setCompraId(id)
    setAberta(true)
  }, [])

  return { aberta, setAberta, compraId, abrir }
}
