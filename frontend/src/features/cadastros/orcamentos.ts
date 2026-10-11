import type { Categoria, ErrosDeCampos } from '@/core/api'
import { formatarDinheiro, mesCurto } from '@/core/utils'

import type { Orcamento } from './consts/esquemas'

export type FormularioDeOrcamento = {
  /** Id da categoria, em texto como a seleção entrega */
  categoria: string
  /** Limite do mês, texto decimal ("800.00") ou "" */
  valor: string
}

export type CampoDoOrcamento = keyof FormularioDeOrcamento

// `inicio` (ex.: "já tem um limite começando neste mês") vira aviso geral: não é campo da folha
export const CAMPOS_DO_ORCAMENTO: Readonly<Record<string, CampoDoOrcamento>> = {
  categoria: 'categoria',
  valor: 'valor',
}

export const orcamentoVazio = (): FormularioDeOrcamento => {
  return { categoria: '', valor: '' }
}

export const formularioDoOrcamento = (orcamento: Orcamento): FormularioDeOrcamento => {
  return { categoria: String(orcamento.categoria), valor: orcamento.valor }
}

export const validarOrcamento = (
  formulario: FormularioDeOrcamento,
): ErrosDeCampos<CampoDoOrcamento> => {
  const erros: ErrosDeCampos<CampoDoOrcamento> = {}
  if (!formulario.categoria) {
    erros.categoria = 'Escolha a categoria.'
  }
  if (!formulario.valor) {
    erros.valor = 'Informe o limite.'
  }
  return erros
}

export type PedidoDoOrcamento =
  | { metodo: 'POST'; caminho: string; corpo: { categoria: number; valor: string; inicio: string } }
  | { metodo: 'PATCH'; caminho: string; corpo: { valor: string } }

/**
 * Um limite vale do mês em que começa em diante. Mudar o valor de um limite que começou num
 * mês anterior cria uma vigência nova a partir do mês escolhido (os meses antigos mantêm o
 * valor antigo); se ele começou no próprio mês, é só atualizar. Sem mudança, nenhum pedido.
 */
export const pedidoDoOrcamento = (
  formulario: FormularioDeOrcamento,
  editando: Orcamento | null,
  mes: string,
): PedidoDoOrcamento | null => {
  if (editando && editando.inicio === mes) {
    return formulario.valor === editando.valor
      ? null
      : {
          metodo: 'PATCH',
          caminho: `/orcamentos/${editando.id}/`,
          corpo: { valor: formulario.valor },
        }
  }
  if (editando && formulario.valor === editando.valor) {
    return null
  }
  return {
    metodo: 'POST',
    caminho: '/orcamentos/',
    corpo: { categoria: Number(formulario.categoria), valor: formulario.valor, inicio: mes },
  }
}

/** A linha de baixo: desde quando o limite vale. */
export const detalheDoOrcamento = (orcamento: Orcamento, mes: string): string => {
  return orcamento.inicio === mes ? 'Começa neste mês' : `Desde ${mesCurto(orcamento.inicio)}`
}

/** O que a folha explica embaixo do valor, conforme o limite começou ou não no mês. */
export const explicacaoDoOrcamento = (
  editando: Orcamento | null,
  mes: string,
  nomeDoMes: string,
): string => {
  if (!editando) {
    return `Vale de ${nomeDoMes} em diante. A sobra de um mês não passa para o seguinte.`
  }
  if (editando.inicio === mes) {
    return `Este limite começou em ${nomeDoMes}; mudar o valor vale desde então.`
  }
  return `Um valor novo vale de ${nomeDoMes} em diante. Antes disso continua ${formatarDinheiro(editando.valor)}, como era.`
}

/** Na criação, só as categorias de despesa que ainda não têm limite no mês. */
export const categoriasSemLimite = (
  categorias: readonly Categoria[],
  orcamentos: readonly Orcamento[],
): Categoria[] => {
  const comLimite = new Set(
    orcamentos.map((orcamento) => {
      return orcamento.categoria
    }),
  )
  return categorias.filter((categoria) => {
    return categoria.natureza === 'despesa' && !comLimite.has(categoria.id)
  })
}
