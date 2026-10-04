import { ArrowLeftRight } from 'lucide-react'
import type { FC } from 'react'

import { IconeColorido, IconeDoCadastro, Linha, Valor } from '@/core/ui'

import { detalheDoLancamento, tituloDoLancamento } from '../apresentacao'
import type { Transacao } from '../consts/esquemas'
import { motivoSomenteLeitura } from '../formulario'
import { useAbrirLancamento } from '../hooks/contextoDoLancamento'
import { useApagarLancamento } from '../hooks/useMutacoesDeLancamento'

type IconeDoLancamentoProps = {
  transacao: Transacao
}

// Com categoria: o ícone e a cor escolhidos nela. Sem (transferência): setas na cor do app
const IconeDoLancamento: FC<IconeDoLancamentoProps> = ({ transacao }) => {
  if (transacao.categoria_cor && transacao.categoria_icone) {
    return <IconeDoCadastro cor={transacao.categoria_cor} icone={transacao.categoria_icone} />
  }
  return <IconeColorido Icone={ArrowLeftRight} cor="marca" />
}

const TOM = { receita: 'receita', despesa: 'despesa', transferencia: 'neutro' } as const

type LinhaDeLancamentoProps = {
  transacao: Transacao
}

export const LinhaDeLancamento: FC<LinhaDeLancamentoProps> = ({ transacao }) => {
  const { abrirEdicao } = useAbrirLancamento()
  const exclusao = useApagarLancamento()
  // Parcela e pagamento de fatura não se apagam por aqui: a linha não revela o "Apagar"
  const podeApagar = motivoSomenteLeitura(transacao) === null

  return (
    <Linha
      acaoAoDeslizar={
        podeApagar
          ? {
              rotulo: 'Apagar',
              aoTocar: () => {
                exclusao.mutate(transacao.id)
              },
            }
          : undefined
      }
      aoTocar={() => {
        abrirEdicao(transacao)
      }}
      detalhe={detalheDoLancamento(transacao)}
      icone={<IconeDoLancamento transacao={transacao} />}
      rotulo={tituloDoLancamento(transacao)}
      valor={<Valor tom={TOM[transacao.tipo]} valor={transacao.valor} />}
    />
  )
}
