import { Plus } from 'lucide-react'
import type { FC } from 'react'

import { useCategorias } from '@/core/api'
import { useMesSelecionado } from '@/core/hooks'
import {
  AvisoDeErro,
  Botao,
  BotaoDaBarra,
  Grupo,
  IconeDoCadastro,
  Linha,
  SeletorDeMes,
  Tela,
  Valor,
} from '@/core/ui'
import { cn, nomeDoMes, textoDoMes } from '@/core/utils'

import { FolhaDeOrcamento } from './components/FolhaDeOrcamento'
import { useFolhaDeOrcamento, useOrcamentos } from './hooks/useOrcamentos'
import { categoriasSemLimite, detalheDoOrcamento } from './orcamentos'

export const TelaOrcamentos: FC = () => {
  const { mes } = useMesSelecionado()
  const texto = textoDoMes(mes)
  const consulta = useOrcamentos(texto)
  const categorias = useCategorias()
  const folha = useFolhaDeOrcamento()
  const orcamentos = consulta.data ?? []
  const nomeNaFrase = nomeDoMes(mes, { semAno: true }).toLowerCase()

  const novoLimite = () => {
    folha.abrirNovo(texto)
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
    if (orcamentos.length === 0) {
      return (
        <div className="mt-10 px-4 text-center">
          <p className="text-conteudo-secundario">
            Nenhum limite em {nomeNaFrase}. Defina quanto quer gastar por categoria: o Início mostra
            quanto já foi.
          </p>
          <Botao className="mt-2" intencao="simples" onClick={novoLimite}>
            Definir limite
          </Botao>
        </div>
      )
    }
    return (
      // Durante a troca de mês, os limites anteriores ficam na tela, apagados
      <div
        aria-busy={consulta.isPlaceholderData}
        className={cn(
          'transition-opacity duration-200',
          consulta.isPlaceholderData && 'opacity-60',
        )}
      >
        <Grupo
          rodape="Cada limite vale do mês em que começa em diante. Toque num limite para mudar o valor ou apagar."
          titulo={`Limites em ${nomeNaFrase}`}
        >
          {orcamentos.map((orcamento) => {
            return (
              <Linha
                aoTocar={() => {
                  folha.abrirEdicao(orcamento, texto)
                }}
                detalhe={detalheDoOrcamento(orcamento, texto)}
                icone={
                  <IconeDoCadastro
                    cor={orcamento.categoria_cor}
                    icone={orcamento.categoria_icone}
                  />
                }
                key={orcamento.id}
                rotulo={orcamento.categoria_nome}
                valor={<Valor valor={orcamento.valor} />}
              />
            )
          })}
        </Grupo>
      </div>
    )
  }

  return (
    <Tela
      acao={
        <BotaoDaBarra aria-label="Novo limite" onClick={novoLimite}>
          <Plus aria-hidden="true" className="size-6" />
        </BotaoDaBarra>
      }
      titulo="Orçamentos"
      voltar={{ para: '/mais', rotulo: 'Mais' }}
    >
      <SeletorDeMes />
      {conteudo()}
      <FolhaDeOrcamento
        categoriasLivres={categoriasSemLimite(categorias.data ?? [], orcamentos)}
        controle={folha}
      />
    </Tela>
  )
}
