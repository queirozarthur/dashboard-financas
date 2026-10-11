import type { FC } from 'react'

import {
  AvisoDeErro,
  ConfirmacaoDeExclusao,
  Folha,
  Grupo,
  IconeDoCadastro,
  Indicador,
  Linha,
  Valor,
} from '@/core/ui'
import { dataPorExtenso, formatarDinheiro } from '@/core/utils'

import type { Compra } from '../consts/esquemas'
import { useApagarCompra, useCompra } from '../hooks/useCompra'
import { situacaoDaParcela } from '../situacao'

type DetalhesDaCompraProps = {
  compra: Compra
  hoje: string
  aoApagada: () => void
}

const DetalhesDaCompra: FC<DetalhesDaCompraProps> = ({ compra, hoje, aoApagada }) => {
  const exclusao = useApagarCompra()
  // A situação de cada parcela vem do backend; uma paga trava a compra inteira
  const temParcelaPaga = compra.parcelas_geradas.some((parcela) => {
    return parcela.situacao === 'paga'
  })
  const parcelada = compra.parcelas > 1

  return (
    <>
      <div className="flex flex-col items-center gap-2 pt-2 pb-2 text-center">
        <IconeDoCadastro
          cor={compra.categoria_cor}
          icone={compra.categoria_icone}
          tamanho="grande"
        />
        <p className="max-w-full truncate font-semibold">
          {compra.descricao || compra.categoria_nome}
        </p>
        <p className="text-titulo-grande font-bold tracking-tight tabular-nums">
          {formatarDinheiro(compra.valor_total)}
        </p>
      </div>

      <Grupo>
        <Linha
          rotulo="Data da compra"
          valor={dataPorExtenso(compra.data_compra, { comAno: true })}
        />
        <Linha rotulo="Categoria" valor={compra.categoria_nome} />
        <Linha rotulo="Cartão" valor={compra.cartao_nome} />
        <Linha rotulo="Parcelas" valor={parcelada ? `${compra.parcelas}x` : 'À vista'} />
      </Grupo>

      <Grupo titulo={parcelada ? 'Parcelas' : 'Parcela'}>
        {compra.parcelas_geradas.map((parcela) => {
          return (
            <Linha
              detalhe={situacaoDaParcela(parcela, hoje)}
              key={parcela.id}
              rotulo={`Parcela ${parcela.numero}`}
              valor={<Valor valor={parcela.valor} />}
            />
          )
        })}
      </Grupo>

      {exclusao.isError ? (
        <p className="mt-4 px-4 text-subtitulo text-despesa" role="alert">
          Não foi possível apagar a compra. Tente de novo.
        </p>
      ) : null}
      {temParcelaPaga ? (
        <p className="mt-6 px-4 text-nota text-conteudo-secundario">
          Esta compra tem parcela em fatura já paga e não pode ser apagada. Para corrigir, cancele o
          pagamento dessa fatura antes.
        </p>
      ) : (
        <ConfirmacaoDeExclusao
          apagando={exclusao.isPending}
          aoApagar={() => {
            exclusao.mutate(compra.id, { onSuccess: aoApagada })
          }}
          aviso={
            parcelada
              ? `As ${compra.parcelas} parcelas saem das faturas. Não dá para desfazer.`
              : 'Não dá para desfazer.'
          }
          pergunta="Apagar esta compra?"
          rotulo="Apagar compra"
          visivelNoCelular
        />
      )}
    </>
  )
}

type FolhaDaCompraProps = {
  aberta: boolean
  aoMudarAberta: (aberta: boolean) => void
  /** Compra a mostrar; continua definida enquanto a folha anima ao fechar */
  compraId: number | null
  /** "AAAA-MM-DD", para separar parcela vencida de parcela a vencer */
  hoje: string
}

/** Tocar numa compra da fatura: a compra inteira, todas as parcelas e o "Apagar compra". */
export const FolhaDaCompra: FC<FolhaDaCompraProps> = ({
  aberta,
  aoMudarAberta,
  compraId,
  hoje,
}) => {
  const consulta = useCompra(compraId)

  const conteudo = () => {
    // Dados primeiro: depois de apagar, a busca de novo dá 404, mas a folha (fechando) continua
    // mostrando a compra em vez de piscar um erro
    if (consulta.data) {
      return (
        <DetalhesDaCompra
          aoApagada={() => {
            aoMudarAberta(false)
          }}
          compra={consulta.data}
          hoje={hoje}
        />
      )
    }
    if (consulta.isError) {
      return (
        <AvisoDeErro
          aoTentarDeNovo={() => {
            void consulta.refetch()
          }}
        />
      )
    }
    return (
      <div className="flex h-40 items-center justify-center text-conteudo-secundario">
        <Indicador />
        <span className="sr-only">Carregando a compra…</span>
      </div>
    )
  }

  return (
    <Folha aberta={aberta} aoMudarAberta={aoMudarAberta} titulo="Compra">
      {conteudo()}
    </Folha>
  )
}
