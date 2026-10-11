import { ArrowLeftRight } from 'lucide-react'
import type { FC } from 'react'

import { Grupo, IconeColorido, IconeDoCadastro, Linha, ValorComNota } from '@/core/ui'
import { cn, textoDoMes, type Mes } from '@/core/utils'

import type { Prevista } from '../consts/esquemas'
import { useConfirmacao } from '../hooks/useConfirmacao'
import type { Filtros } from '../hooks/useFiltros'
import { usePrevistas } from '../hooks/usePrevistas'
import { detalheDaPrevista, notaDaPrevista, previstasDoFiltro } from '../previstas'
import { FolhaDeConfirmacao } from './FolhaDeConfirmacao'

const TOM = { receita: 'receita', despesa: 'despesa', transferencia: 'neutro' } as const

type IconeDaPrevistaProps = {
  prevista: Prevista
}

const IconeDaPrevista: FC<IconeDaPrevistaProps> = ({ prevista }) => {
  if (prevista.categoria_cor && prevista.categoria_icone) {
    return <IconeDoCadastro cor={prevista.categoria_cor} icone={prevista.categoria_icone} />
  }
  return <IconeColorido Icone={ArrowLeftRight} cor="marca" />
}

type PrevistasDoMesProps = {
  mes: Mes
  filtros: Filtros
}

/** Topo da lista do mês: o que se repete todo mês e ainda não foi confirmado. Tocar confirma. */
export const PrevistasDoMes: FC<PrevistasDoMesProps> = ({ mes, filtros }) => {
  const consulta = usePrevistas(mes)
  const confirmacao = useConfirmacao()
  const previstas = previstasDoFiltro(consulta.data ?? [], filtros)

  return (
    <>
      {previstas.length > 0 ? (
        <div
          aria-busy={consulta.isPlaceholderData}
          className={cn(
            'transition-opacity duration-200',
            consulta.isPlaceholderData && 'opacity-60',
          )}
        >
          <Grupo
            rodape="Recorrências que ainda não viraram lançamento neste mês. Toque para confirmar."
            titulo="A confirmar"
          >
            {previstas.map((prevista) => {
              return (
                <Linha
                  aoTocar={() => {
                    confirmacao.abrir(prevista, textoDoMes(mes))
                  }}
                  detalhe={detalheDaPrevista(prevista)}
                  icone={<IconeDaPrevista prevista={prevista} />}
                  key={prevista.recorrencia}
                  rotulo={prevista.descricao}
                  valor={
                    <ValorComNota
                      nota={notaDaPrevista(prevista)}
                      rotuloDaNota="previsto para"
                      tom={TOM[prevista.tipo]}
                      valor={prevista.valor}
                    />
                  }
                />
              )
            })}
          </Grupo>
        </div>
      ) : null}
      <FolhaDeConfirmacao controle={confirmacao} />
    </>
  )
}
