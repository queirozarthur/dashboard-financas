import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { FC } from 'react'

import { Linha, Valor } from '@/core/ui'
import { cn } from '@/core/utils'

import { detalheDoLancamento, tituloDoLancamento } from '../apresentacao'
import type { Transacao } from '../consts/esquemas'
import { motivoSomenteLeitura } from '../formulario'
import { useAbrirLancamento } from '../hooks/contextoDoLancamento'
import { useApagarLancamento } from '../hooks/useMutacoesDeLancamento'

const ICONES: Record<Transacao['tipo'], { Icone: LucideIcon; cor: string }> = {
  receita: { Icone: ArrowDownLeft, cor: 'text-receita' },
  despesa: { Icone: ArrowUpRight, cor: 'text-conteudo-secundario' },
  transferencia: { Icone: ArrowLeftRight, cor: 'text-marca' },
}

const TOM = { receita: 'receita', despesa: 'despesa', transferencia: 'neutro' } as const

type LinhaDeLancamentoProps = {
  transacao: Transacao
}

export const LinhaDeLancamento: FC<LinhaDeLancamentoProps> = ({ transacao }) => {
  const { Icone, cor } = ICONES[transacao.tipo]
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
      icone={
        // Quadradinho arredondado atrás do ícone, como os ícones das listas do iOS
        <span className="flex size-8 items-center justify-center rounded-lg bg-fundo">
          <Icone aria-hidden="true" className={cn('size-4', cor)} strokeWidth={2} />
        </span>
      }
      rotulo={tituloDoLancamento(transacao)}
      valor={<Valor tom={TOM[transacao.tipo]} valor={transacao.valor} />}
    />
  )
}
