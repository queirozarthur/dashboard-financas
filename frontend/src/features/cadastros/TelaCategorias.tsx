import { Plus } from 'lucide-react'
import { useState, type FC } from 'react'

import { useCategorias, type Categoria } from '@/core/api'
import { Aviso, AvisoDeErro, Botao, BotaoDaBarra, Grupo, IconeDoCadastro, Tela } from '@/core/ui'

import { FolhaDeCategoria } from './components/FolhaDeCategoria'
import { LinhaDeCadastro } from './components/LinhaDeCadastro'
import { categoriaVazia } from './formularios'
import { useFolhaDeCategoria, type ControleDaFolhaDeCategoria } from './hooks/useFolhas'

const ROTULO_DO_TIPO = { fixo: 'Fixa', variavel: 'Variável' } as const

type GrupoDeCategoriasProps = {
  titulo: string
  categorias: readonly Categoria[]
  folha: ControleDaFolhaDeCategoria
  aoFalhar: (mensagem: string) => void
}

const GrupoDeCategorias: FC<GrupoDeCategoriasProps> = ({ titulo, categorias, folha, aoFalhar }) => {
  if (categorias.length === 0) {
    return null
  }
  return (
    <Grupo titulo={titulo}>
      {categorias.map((categoria) => {
        return (
          <LinhaDeCadastro
            aoFalhar={aoFalhar}
            aoTocar={() => {
              folha.abrirEdicao(categoria)
            }}
            caminho="/categorias/"
            detalhe={ROTULO_DO_TIPO[categoria.tipo]}
            icone={<IconeDoCadastro cor={categoria.cor} icone={categoria.icone} />}
            id={categoria.id}
            key={categoria.id}
            rotulo={categoria.nome}
          />
        )
      })}
    </Grupo>
  )
}

export const TelaCategorias: FC = () => {
  const categorias = useCategorias()
  const folha = useFolhaDeCategoria()
  const [aviso, setAviso] = useState<string | null>(null)
  const lista = categorias.data ?? []

  const novaCategoria = () => {
    folha.abrirNovo(categoriaVazia(lista.length))
  }

  const conteudo = () => {
    if (categorias.isPending) {
      return (
        <div
          aria-busy="true"
          className="mt-4 h-40 rounded-xl bg-superficie motion-safe:animate-pulse"
        >
          <span className="sr-only">Carregando…</span>
        </div>
      )
    }
    if (categorias.isError) {
      return (
        <AvisoDeErro
          aoTentarDeNovo={() => {
            void categorias.refetch()
          }}
        />
      )
    }
    if (lista.length === 0) {
      return (
        <div className="mt-10 px-4 text-center">
          <p className="text-conteudo-secundario">Nenhuma categoria cadastrada ainda.</p>
          <Botao className="mt-2" intencao="simples" onClick={novaCategoria}>
            Adicionar categoria
          </Botao>
        </div>
      )
    }
    return (
      <>
        <GrupoDeCategorias
          aoFalhar={setAviso}
          categorias={lista.filter((categoria) => {
            return categoria.natureza === 'despesa'
          })}
          folha={folha}
          titulo="Despesas"
        />
        <GrupoDeCategorias
          aoFalhar={setAviso}
          categorias={lista.filter((categoria) => {
            return categoria.natureza === 'receita'
          })}
          folha={folha}
          titulo="Receitas"
        />
      </>
    )
  }

  return (
    <Tela
      acao={
        <BotaoDaBarra aria-label="Nova categoria" onClick={novaCategoria}>
          <Plus aria-hidden="true" className="size-6" />
        </BotaoDaBarra>
      }
      titulo="Categorias"
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
      <FolhaDeCategoria controle={folha} />
    </Tela>
  )
}
