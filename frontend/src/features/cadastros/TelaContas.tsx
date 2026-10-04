import { Plus } from 'lucide-react'
import { useState, type FC } from 'react'

import { useContas, type Conta } from '@/core/api'
import {
  Aviso,
  AvisoDeErro,
  Botao,
  BotaoDaBarra,
  Grupo,
  IconeDoCadastro,
  Tela,
  Valor,
} from '@/core/ui'

import { FolhaDeConta } from './components/FolhaDeConta'
import { LinhaDeCadastro } from './components/LinhaDeCadastro'
import { contaVazia, detalheDaConta, tomDoSaldo } from './formularios'
import { useFolhaDeConta, type ControleDaFolhaDeConta } from './hooks/useFolhas'

type GrupoDeContasProps = {
  titulo: string
  contas: readonly Conta[]
  folha: ControleDaFolhaDeConta
  aoFalhar: (mensagem: string) => void
}

const GrupoDeContas: FC<GrupoDeContasProps> = ({ titulo, contas, folha, aoFalhar }) => {
  if (contas.length === 0) {
    return null
  }
  return (
    <Grupo titulo={titulo}>
      {contas.map((conta) => {
        return (
          <LinhaDeCadastro
            aoFalhar={aoFalhar}
            aoTocar={() => {
              folha.abrirEdicao(conta)
            }}
            caminho="/contas/"
            detalhe={detalheDaConta(conta)}
            icone={<IconeDoCadastro cor={conta.cor} icone={conta.icone} />}
            id={conta.id}
            key={conta.id}
            rotulo={conta.nome}
            valor={<Valor tom={tomDoSaldo(conta)} valor={conta.saldo} />}
          />
        )
      })}
    </Grupo>
  )
}

const EsqueletoDeLista: FC = () => {
  return (
    <div aria-busy="true" className="mt-4 motion-safe:animate-pulse">
      <span className="sr-only">Carregando…</span>
      <div className="h-4 w-24 rounded bg-separador/50" />
      <div className="mt-2 h-40 rounded-xl bg-superficie" />
    </div>
  )
}

export const TelaContas: FC = () => {
  const contas = useContas()
  const folha = useFolhaDeConta()
  const [aviso, setAviso] = useState<string | null>(null)
  const lista = contas.data ?? []

  const novaConta = () => {
    folha.abrirNovo(contaVazia(lista.length))
  }

  const conteudo = () => {
    if (contas.isPending) {
      return <EsqueletoDeLista />
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
    if (lista.length === 0) {
      return (
        <div className="mt-10 px-4 text-center">
          <p className="text-conteudo-secundario">Nenhuma conta cadastrada ainda.</p>
          <Botao className="mt-2" intencao="simples" onClick={novaConta}>
            Adicionar conta
          </Botao>
        </div>
      )
    }
    return (
      <>
        <GrupoDeContas
          aoFalhar={setAviso}
          contas={lista.filter((conta) => {
            return conta.tipo !== 'cartao'
          })}
          folha={folha}
          titulo="Contas"
        />
        <GrupoDeContas
          aoFalhar={setAviso}
          contas={lista.filter((conta) => {
            return conta.tipo === 'cartao'
          })}
          folha={folha}
          titulo="Cartões de crédito"
        />
      </>
    )
  }

  return (
    <Tela
      acao={
        <BotaoDaBarra aria-label="Nova conta" onClick={novaConta}>
          <Plus aria-hidden="true" className="size-6" />
        </BotaoDaBarra>
      }
      titulo="Contas"
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
      <FolhaDeConta controle={folha} />
    </Tela>
  )
}
