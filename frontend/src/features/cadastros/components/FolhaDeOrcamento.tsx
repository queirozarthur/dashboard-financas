import { useId, type FC, type FormEvent } from 'react'

import type { Categoria } from '@/core/api'
import {
  BotaoDaBarra,
  CampoSelecao,
  CampoValor,
  ConfirmacaoDeExclusao,
  Folha,
  Grupo,
  IconeDoCadastro,
} from '@/core/ui'
import { lerMes, mesCurto, nomeDoMes } from '@/core/utils'

import type { ControleDaFolhaDeOrcamento } from '../hooks/useOrcamentos'
import { explicacaoDoOrcamento } from '../orcamentos'

type FolhaDeOrcamentoProps = {
  controle: ControleDaFolhaDeOrcamento
  /** Categorias que podem ganhar um limite novo neste mês */
  categoriasLivres: readonly Categoria[]
}

export const FolhaDeOrcamento: FC<FolhaDeOrcamentoProps> = ({ controle, categoriasLivres }) => {
  const idDoFormulario = useId()
  const { formulario, erros, alterar, editando, mes } = controle
  const mesLido = lerMes(mes)
  const nomeNaFrase = mesLido ? nomeDoMes(mesLido).toLowerCase() : mes

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    controle.salvar()
  }

  return (
    <Folha
      aberta={controle.aberta}
      acao={
        <BotaoDaBarra destaque disabled={controle.salvando} form={idDoFormulario} type="submit">
          Salvar
        </BotaoDaBarra>
      }
      aoMudarAberta={controle.setAberta}
      titulo={editando ? 'Editar limite' : 'Novo limite'}
    >
      <form id={idDoFormulario} noValidate onSubmit={enviar}>
        {editando ? (
          <div className="flex flex-col items-center gap-2 pt-2 pb-2">
            <IconeDoCadastro
              cor={editando.categoria_cor}
              icone={editando.categoria_icone}
              tamanho="grande"
            />
            <p className="max-w-full truncate font-semibold">{editando.categoria_nome}</p>
          </div>
        ) : null}
        {erros.geral ? (
          <p className="mt-2 px-4 text-subtitulo text-despesa" role="alert">
            {erros.geral}
          </p>
        ) : null}

        <Grupo rodape={explicacaoDoOrcamento(editando, mes, nomeNaFrase)}>
          {editando ? null : (
            <CampoSelecao
              erro={erros.categoria}
              onChange={(evento) => {
                alterar('categoria', evento.target.value)
              }}
              opcoes={categoriasLivres.map((categoria) => {
                return { valor: String(categoria.id), rotulo: categoria.nome }
              })}
              rotulo="Categoria"
              value={formulario.categoria}
            />
          )}
          <CampoValor
            aoMudar={(valor) => {
              alterar('valor', valor)
            }}
            erro={erros.valor}
            rotulo="Limite"
            valor={formulario.valor}
          />
        </Grupo>

        {editando ? (
          <ConfirmacaoDeExclusao
            apagando={controle.apagando}
            aoApagar={controle.apagar}
            aviso={`Ele vale desde ${mesCurto(editando.inicio)}: esses meses ficam sem limite (ou voltam ao limite anterior, se houver).`}
            pergunta="Apagar este limite?"
            rotulo="Apagar limite"
            visivelNoCelular
          />
        ) : null}
      </form>
    </Folha>
  )
}
