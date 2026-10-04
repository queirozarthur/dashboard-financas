import { useId, type FC, type FormEvent } from 'react'

import {
  BotaoDaBarra,
  Campo,
  ConfirmacaoDeExclusao,
  ControleSegmentado,
  Folha,
  Grupo,
  SeletorDeCor,
  SeletorDeIcone,
} from '@/core/ui'

import { NATUREZAS, TIPOS_DE_CATEGORIA } from '../consts/opcoes'
import type { ControleDaFolhaDeCategoria } from '../hooks/useFolhas'
import { PreviaDoCadastro } from './PreviaDoCadastro'

type MensagemDeErroProps = {
  mensagem: string | undefined
}

// Controle segmentado não tem a linha de erro dos campos: a mensagem vem logo embaixo dele
const MensagemDeErro: FC<MensagemDeErroProps> = ({ mensagem }) => {
  if (!mensagem) {
    return null
  }
  return (
    <p className="mt-1.5 px-4 text-nota text-despesa" role="alert">
      {mensagem}
    </p>
  )
}

type FolhaDeCategoriaProps = {
  controle: ControleDaFolhaDeCategoria
}

export const FolhaDeCategoria: FC<FolhaDeCategoriaProps> = ({ controle }) => {
  const idDoFormulario = useId()
  const { formulario, erros, alterar, editando } = controle

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
      titulo={editando ? 'Editar categoria' : 'Nova categoria'}
    >
      <form id={idDoFormulario} noValidate onSubmit={enviar}>
        <PreviaDoCadastro
          cor={formulario.cor}
          icone={formulario.icone}
          nome={formulario.nome}
          semNome="Nova categoria"
        />
        <ControleSegmentado
          aoMudar={(natureza) => {
            alterar('natureza', natureza)
          }}
          nome="natureza-da-categoria"
          opcoes={NATUREZAS}
          rotulo="Natureza"
          valor={formulario.natureza}
        />
        <MensagemDeErro mensagem={erros.natureza} />
        {erros.geral ? (
          <p className="mt-4 px-4 text-subtitulo text-despesa" role="alert">
            {erros.geral}
          </p>
        ) : null}

        <Grupo>
          <Campo
            erro={erros.nome}
            maxLength={60}
            onChange={(evento) => {
              alterar('nome', evento.target.value)
            }}
            placeholder="Ex.: Mercado, Salário"
            rotulo="Nome"
            value={formulario.nome}
          />
        </Grupo>

        <div className="mt-8">
          <p
            aria-hidden="true"
            className="mb-1.5 px-4 text-nota text-conteudo-secundario uppercase"
          >
            Tipo
          </p>
          <ControleSegmentado
            aoMudar={(tipo) => {
              alterar('tipo', tipo)
            }}
            nome="tipo-da-categoria"
            opcoes={TIPOS_DE_CATEGORIA}
            rotulo="Tipo"
            valor={formulario.tipo}
          />
          <p className="mt-1.5 px-4 text-nota text-conteudo-secundario">
            Fixa: o mesmo todo mês (aluguel, assinaturas). Variável: muda (mercado, lazer).
          </p>
        </div>

        <SeletorDeCor
          aoMudar={(cor) => {
            alterar('cor', cor)
          }}
          nome="cor-da-categoria"
          valor={formulario.cor}
        />
        <SeletorDeIcone
          aoMudar={(icone) => {
            alterar('icone', icone)
          }}
          cor={formulario.cor}
          nome="icone-da-categoria"
          valor={formulario.icone}
        />

        {editando ? (
          <ConfirmacaoDeExclusao
            apagando={controle.apagando}
            aoApagar={controle.apagar}
            pergunta="Apagar esta categoria?"
            rotulo="Apagar categoria"
          />
        ) : null}
      </form>
    </Folha>
  )
}
