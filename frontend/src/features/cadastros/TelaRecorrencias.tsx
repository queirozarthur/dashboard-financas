import { ArrowLeftRight, Plus } from 'lucide-react'
import { useState, type FC } from 'react'

import {
  Aviso,
  AvisoDeErro,
  Botao,
  BotaoDaBarra,
  Grupo,
  IconeColorido,
  IconeDoCadastro,
  Tela,
  ValorComNota,
} from '@/core/ui'
import { mesDe, textoDoMes } from '@/core/utils'

import { FolhaDeRecorrencia } from './components/FolhaDeRecorrencia'
import { LinhaDeCadastro } from './components/LinhaDeCadastro'
import type { Recorrencia } from './consts/esquemas'
import { useFolhaDeRecorrencia, type ControleDaFolhaDeRecorrencia } from './hooks/useFolhas'
import { useRecorrencias } from './hooks/useRecorrencias'
import {
  detalheDaRecorrencia,
  encerrada,
  notaDaRecorrencia,
  recorrenciaVazia,
  TOM_DA_RECORRENCIA,
  type TipoDeRecorrencia,
} from './recorrencias'

type IconeDaRecorrenciaProps = {
  recorrencia: Recorrencia
}

// Com categoria: o ícone e a cor dela. Transferência: setas na cor do app
const IconeDaRecorrencia: FC<IconeDaRecorrenciaProps> = ({ recorrencia }) => {
  if (recorrencia.categoria_cor && recorrencia.categoria_icone) {
    return <IconeDoCadastro cor={recorrencia.categoria_cor} icone={recorrencia.categoria_icone} />
  }
  return <IconeColorido Icone={ArrowLeftRight} cor="marca" />
}

type GrupoDeRecorrenciasProps = {
  titulo: string
  recorrencias: readonly Recorrencia[]
  folha: ControleDaFolhaDeRecorrencia
  aoFalhar: (mensagem: string) => void
}

const GrupoDeRecorrencias: FC<GrupoDeRecorrenciasProps> = ({
  titulo,
  recorrencias,
  folha,
  aoFalhar,
}) => {
  if (recorrencias.length === 0) {
    return null
  }
  return (
    <Grupo titulo={titulo}>
      {recorrencias.map((recorrencia) => {
        return (
          <LinhaDeCadastro
            aoFalhar={aoFalhar}
            aoTocar={() => {
              folha.abrirEdicao(recorrencia)
            }}
            caminho="/recorrencias/"
            detalhe={detalheDaRecorrencia(recorrencia)}
            icone={<IconeDaRecorrencia recorrencia={recorrencia} />}
            id={recorrencia.id}
            key={recorrencia.id}
            rotulo={recorrencia.descricao}
            valor={
              <ValorComNota
                nota={notaDaRecorrencia(recorrencia)}
                tom={TOM_DA_RECORRENCIA[recorrencia.tipo]}
                valor={recorrencia.valor}
              />
            }
          />
        )
      })}
    </Grupo>
  )
}

const TITULOS: Record<TipoDeRecorrencia, string> = {
  receita: 'Receitas',
  despesa: 'Despesas',
  transferencia: 'Transferências',
}

const obterHoje = (): Date => {
  return new Date()
}

export const TelaRecorrencias: FC = () => {
  const consulta = useRecorrencias()
  const folha = useFolhaDeRecorrencia()
  const [aviso, setAviso] = useState<string | null>(null)
  // Lido uma vez ao abrir a tela (a renderização precisa ser pura)
  const [hoje] = useState(obterHoje)
  const mesAtual = textoDoMes(mesDe(hoje))
  const lista = consulta.data ?? []

  const novaRecorrencia = () => {
    folha.abrirNovo(recorrenciaVazia(mesAtual, hoje.getDate()))
  }

  const ativas = lista.filter((recorrencia) => {
    return !encerrada(recorrencia, mesAtual)
  })
  const doTipo = (tipo: TipoDeRecorrencia) => {
    return ativas.filter((recorrencia) => {
      return recorrencia.tipo === tipo
    })
  }

  const conteudo = () => {
    if (consulta.isPending) {
      return (
        <div
          aria-busy="true"
          className="mt-4 h-40 rounded-xl bg-superficie motion-safe:animate-pulse"
        >
          <span className="sr-only">Carregando…</span>
        </div>
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
    if (lista.length === 0) {
      return (
        <div className="mt-10 px-4 text-center">
          <p className="text-conteudo-secundario">
            Cadastre o que se repete todo mês, como salário e aluguel: ele aparece como previsto em
            Lançamentos, e você só confirma.
          </p>
          <Botao className="mt-2" intencao="simples" onClick={novaRecorrencia}>
            Adicionar recorrência
          </Botao>
        </div>
      )
    }
    const props = { folha, aoFalhar: setAviso }
    return (
      <>
        {(['receita', 'despesa', 'transferencia'] as const).map((tipo) => {
          return (
            <GrupoDeRecorrencias
              {...props}
              key={tipo}
              recorrencias={doTipo(tipo)}
              titulo={TITULOS[tipo]}
            />
          )
        })}
        <GrupoDeRecorrencias
          {...props}
          recorrencias={lista.filter((recorrencia) => {
            return encerrada(recorrencia, mesAtual)
          })}
          titulo="Encerradas"
        />
      </>
    )
  }

  return (
    <Tela
      acao={
        <BotaoDaBarra aria-label="Nova recorrência" onClick={novaRecorrencia}>
          <Plus aria-hidden="true" className="size-6" />
        </BotaoDaBarra>
      }
      titulo="Recorrências"
      voltar={{ para: '/mais', rotulo: 'Mais' }}
    >
      {aviso ? (
        <Aviso
          aoFechar={() => {
            setAviso(null)
          }}
          mensagem={aviso}
        />
      ) : null}
      {conteudo()}
      <FolhaDeRecorrencia controle={folha} />
    </Tela>
  )
}
