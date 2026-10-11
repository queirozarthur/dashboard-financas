import { Plus } from 'lucide-react'
import { useState, type FC } from 'react'
import { Link } from 'react-router'

import { errosDaFalha, useContas, type Conta } from '@/core/api'
import { useMesSelecionado } from '@/core/hooks'
import {
  Aviso,
  AvisoDeErro,
  BotaoDaBarra,
  ConfirmacaoDeExclusao,
  estiloBotao,
  SeletorDeMes,
  Tela,
} from '@/core/ui'
import { cn, dataDeHoje, lerMes, nomeDoMes, type Mes } from '@/core/utils'

import { ComprasDaFatura } from './components/ComprasDaFatura'
import { FolhaDaCompra } from './components/FolhaDaCompra'
import { FolhaDePagamento } from './components/FolhaDePagamento'
import { ResumoDaFatura } from './components/ResumoDaFatura'
import { SeletorDeCartao } from './components/SeletorDeCartao'
import { useCartaoSelecionado } from './hooks/useCartaoSelecionado'
import { useCancelarPagamento, useFatura } from './hooks/useFatura'
import { useFolhaDaCompra } from './hooks/useFolhaDaCompra'
import { useFolhaDePagamento } from './hooks/useFolhaDePagamento'
import { situacaoDaFatura } from './situacao'

const Esqueleto: FC = () => {
  return (
    <div aria-busy="true" className="motion-safe:animate-pulse">
      <span className="sr-only">Carregando a fatura…</span>
      <div className="mt-4 h-40 rounded-2xl bg-superficie" />
      <div className="mt-8 h-4 w-24 rounded bg-separador/50" />
      <div className="mt-2 h-32 rounded-xl bg-superficie" />
    </div>
  )
}

const SemCartoes: FC = () => {
  return (
    <div className="mt-10 px-4 text-center">
      <p className="text-conteudo-secundario">
        Cadastre um cartão de crédito para acompanhar as faturas e lançar compras parceladas.
      </p>
      <Link className={estiloBotao({ intencao: 'simples', class: 'mt-2' })} to="/mais/contas">
        Cadastrar cartão
      </Link>
    </div>
  )
}

const obterHoje = (): string => {
  return dataDeHoje(new Date())
}

/** "Fatura de novembro · Nubank", com o mês da própria fatura (não o da URL). */
const descricaoDaFatura = (textoDoMes: string, mesDaTela: Mes, cartao: Conta): string => {
  const mes = lerMes(textoDoMes) ?? mesDaTela
  return `Fatura de ${nomeDoMes(mes, { semAno: true }).toLowerCase()} · ${cartao.nome}`
}

type FaturaDoCartaoProps = {
  cartao: Conta
  contas: readonly Conta[]
  mes: Mes
  hoje: string
}

const FaturaDoCartao: FC<FaturaDoCartaoProps> = ({ cartao, contas, mes, hoje }) => {
  const consulta = useFatura(cartao.id, mes)
  const pagamento = useFolhaDePagamento()
  const cancelamento = useCancelarPagamento()
  const folhaDaCompra = useFolhaDaCompra()
  const [aviso, setAviso] = useState<string | null>(null)

  if (consulta.isPending) {
    return <Esqueleto />
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

  const fatura = consulta.data
  const situacao = situacaoDaFatura(fatura, hoje)

  const cancelarPagamento = () => {
    cancelamento.mutate(
      { cartao: fatura.cartao, mes: fatura.mes },
      {
        onError: (falha) => {
          setAviso(errosDaFalha(falha, {}).geral ?? 'Não foi possível cancelar o pagamento.')
        },
      },
    )
  }

  return (
    <>
      {aviso ? (
        <Aviso
          aoFechar={() => {
            setAviso(null)
          }}
          mensagem={aviso}
        />
      ) : null}
      {/* Durante a troca de mês ou de cartão, a fatura anterior fica na tela, apagada */}
      <div
        aria-busy={consulta.isPlaceholderData}
        className={cn(
          'transition-opacity duration-200',
          consulta.isPlaceholderData && 'opacity-60',
        )}
      >
        <ResumoDaFatura
          aoPagar={() => {
            pagamento.abrir({ cartao: fatura.cartao, mes: fatura.mes }, contas)
          }}
          cartao={cartao}
          fatura={fatura}
          situacao={situacao}
        />
        <ComprasDaFatura aoAbrirCompra={folhaDaCompra.abrir} parcelas={fatura.parcelas} />
        {situacao === 'paga' ? (
          <ConfirmacaoDeExclusao
            apagando={cancelamento.isPending}
            aoApagar={cancelarPagamento}
            aviso="A transferência que pagou a fatura é apagada, e a fatura volta a ficar pendente."
            confirmar="Cancelar pagamento"
            pergunta="Cancelar o pagamento desta fatura?"
            rotulo="Cancelar pagamento"
            visivelNoCelular
          />
        ) : null}
      </div>

      <FolhaDePagamento
        contas={contas}
        controle={pagamento}
        descricao={descricaoDaFatura(fatura.mes, mes, cartao)}
        total={fatura.total}
      />
      <FolhaDaCompra
        aberta={folhaDaCompra.aberta}
        aoMudarAberta={folhaDaCompra.setAberta}
        compraId={folhaDaCompra.compraId}
        hoje={hoje}
      />
    </>
  )
}

type TelaCartoesProps = {
  /**
   * Abre a folha de lançamento com o cartão já escolhido (uma compra nova). A folha é de
   * outra feature: quem monta a tela (o app) liga as duas.
   */
  aoNovaCompra: (cartao: number) => void
}

export const TelaCartoes: FC<TelaCartoesProps> = ({ aoNovaCompra }) => {
  const contas = useContas()
  const todas = contas.data ?? []
  const cartoes = todas.filter((conta) => {
    return conta.tipo === 'cartao'
  })
  const { cartao, escolher } = useCartaoSelecionado(cartoes)
  const { mes } = useMesSelecionado()
  // "Vencida" compara com hoje; calculado uma vez ao abrir a tela (a renderização é pura)
  const [hoje] = useState(obterHoje)

  const conteudo = () => {
    if (contas.isPending) {
      return <Esqueleto />
    }
    if (contas.isError) {
      return (
        <AvisoDeErro
          aoTentarDeNovo={() => {
            void contas.refetch()
          }}
        />
      )
    }
    if (!cartao) {
      return <SemCartoes />
    }
    return (
      <>
        {cartoes.length > 1 ? (
          <SeletorDeCartao aoEscolher={escolher} cartoes={cartoes} escolhido={cartao.id} />
        ) : null}
        <FaturaDoCartao cartao={cartao} contas={todas} hoje={hoje} mes={mes} />
      </>
    )
  }

  return (
    <Tela
      acao={
        cartao ? (
          <BotaoDaBarra
            aria-label="Nova compra"
            onClick={() => {
              aoNovaCompra(cartao.id)
            }}
          >
            <Plus aria-hidden="true" className="size-6" />
          </BotaoDaBarra>
        ) : null
      }
      titulo="Cartões"
    >
      <SeletorDeMes />
      {conteudo()}
    </Tela>
  )
}
