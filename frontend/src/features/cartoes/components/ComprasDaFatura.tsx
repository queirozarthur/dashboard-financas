import type { FC } from 'react'

import { Grupo, IconeDoCadastro, Linha, ValorComNota } from '@/core/ui'

import type { ParcelaDaFatura } from '../consts/esquemas'
import { detalheDaParcela, numeroDaParcela } from '../situacao'

type ComprasDaFaturaProps = {
  parcelas: readonly ParcelaDaFatura[]
  aoAbrirCompra: (compra: number) => void
}

/** As parcelas que caem nesta fatura; tocar numa delas abre a compra inteira. */
export const ComprasDaFatura: FC<ComprasDaFaturaProps> = ({ parcelas, aoAbrirCompra }) => {
  if (parcelas.length === 0) {
    return (
      <p className="mt-8 px-4 text-center text-conteudo-secundario">Nenhuma compra nesta fatura.</p>
    )
  }
  return (
    <Grupo titulo="Compras">
      {parcelas.map((parcela) => {
        return (
          <Linha
            aoTocar={() => {
              aoAbrirCompra(parcela.compra)
            }}
            detalhe={detalheDaParcela(parcela)}
            icone={<IconeDoCadastro cor={parcela.categoria_cor} icone={parcela.categoria_icone} />}
            key={parcela.id}
            rotulo={parcela.descricao || parcela.categoria_nome}
            valor={
              <ValorComNota
                nota={numeroDaParcela(parcela)}
                rotuloDaNota="parcela"
                valor={parcela.valor}
              />
            }
          />
        )
      })}
    </Grupo>
  )
}
