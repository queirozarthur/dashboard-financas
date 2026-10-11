import type { ErrosDeCampos } from '@/core/api'
import { mesNumerico, type TomDoValor } from '@/core/utils'

import type { Recorrencia } from './consts/esquemas'

export type TipoDeRecorrencia = Recorrencia['tipo']

/** Tudo em texto, como os campos entregam; `fim` só vale com `temFim` ligado. */
export type FormularioDeRecorrencia = {
  tipo: TipoDeRecorrencia
  valor: string
  descricao: string
  dia: string
  conta: string
  contaDestino: string
  categoria: string
  inicio: string
  temFim: boolean
  fim: string
}

export type CampoDaRecorrencia = keyof FormularioDeRecorrencia

export const CAMPOS_DA_RECORRENCIA: Readonly<Record<string, CampoDaRecorrencia>> = {
  tipo: 'tipo',
  valor: 'valor',
  descricao: 'descricao',
  dia: 'dia',
  conta: 'conta',
  conta_destino: 'contaDestino',
  categoria: 'categoria',
  inicio: 'inicio',
  fim: 'fim',
}

/** Recorrência nova: despesa, começando no mês atual, no dia de hoje. */
export const recorrenciaVazia = (mesAtual: string, diaDeHoje: number): FormularioDeRecorrencia => {
  return {
    tipo: 'despesa',
    valor: '',
    descricao: '',
    dia: String(diaDeHoje),
    conta: '',
    contaDestino: '',
    categoria: '',
    inicio: mesAtual,
    temFim: false,
    fim: '',
  }
}

export const formularioDaRecorrencia = (recorrencia: Recorrencia): FormularioDeRecorrencia => {
  return {
    tipo: recorrencia.tipo,
    valor: recorrencia.valor,
    descricao: recorrencia.descricao,
    dia: String(recorrencia.dia),
    conta: String(recorrencia.conta),
    contaDestino: recorrencia.conta_destino === null ? '' : String(recorrencia.conta_destino),
    categoria: recorrencia.categoria === null ? '' : String(recorrencia.categoria),
    inicio: recorrencia.inicio,
    temFim: recorrencia.fim !== null,
    fim: recorrencia.fim ?? '',
  }
}

/** Trocar o tipo limpa o que deixou de fazer sentido (categoria de outra natureza, destino). */
export const trocarTipoDaRecorrencia = (
  formulario: FormularioDeRecorrencia,
  tipo: TipoDeRecorrencia,
): FormularioDeRecorrencia => {
  return {
    ...formulario,
    tipo,
    categoria: tipo === formulario.tipo ? formulario.categoria : '',
    contaDestino: tipo === 'transferencia' ? formulario.contaDestino : '',
  }
}

/** Confere o básico antes de enviar; as regras completas continuam no backend. */
export const validarRecorrencia = (
  formulario: FormularioDeRecorrencia,
): ErrosDeCampos<CampoDaRecorrencia> => {
  const erros: ErrosDeCampos<CampoDaRecorrencia> = {}
  if (!formulario.descricao.trim()) {
    erros.descricao = 'Dê um nome, como "Aluguel" ou "Salário".'
  }
  if (!formulario.valor) {
    erros.valor = 'Informe o valor.'
  }
  if (!formulario.conta) {
    erros.conta = 'Escolha a conta.'
  }
  if (formulario.tipo === 'transferencia') {
    if (!formulario.contaDestino) {
      erros.contaDestino = 'Escolha a conta de destino.'
    } else if (formulario.contaDestino === formulario.conta) {
      erros.contaDestino = 'Escolha uma conta diferente da de origem.'
    }
  } else if (!formulario.categoria) {
    erros.categoria = 'Escolha a categoria.'
  }
  if (!formulario.inicio) {
    erros.inicio = 'Escolha o mês em que começa.'
  }
  if (formulario.temFim) {
    if (!formulario.fim) {
      erros.fim = 'Escolha o último mês.'
    } else if (formulario.inicio && formulario.fim < formulario.inicio) {
      // "AAAA-MM" se compara como texto
      erros.fim = 'O último mês não pode ser antes do início.'
    }
  }
  return erros
}

export const recorrenciaParaAPI = (formulario: FormularioDeRecorrencia) => {
  const transferencia = formulario.tipo === 'transferencia'
  return {
    tipo: formulario.tipo,
    // Dinheiro vai como texto, do jeito que o campo entregou
    valor: formulario.valor,
    descricao: formulario.descricao.trim(),
    dia: Number(formulario.dia),
    conta: Number(formulario.conta),
    conta_destino: transferencia ? Number(formulario.contaDestino) : null,
    categoria: transferencia ? null : Number(formulario.categoria),
    inicio: formulario.inicio,
    fim: formulario.temFim ? formulario.fim : null,
  }
}

/** A linha de baixo da lista: a conta, ou "Corrente → Carteira" na transferência. */
export const detalheDaRecorrencia = (recorrencia: Recorrencia): string => {
  return recorrencia.tipo === 'transferencia'
    ? `${recorrencia.conta_nome} → ${recorrencia.conta_destino_nome ?? ''}`
    : recorrencia.conta_nome
}

/** Embaixo do valor: "dia 10", ou "dia 10 · até 12/2026" quando tem último mês. */
export const notaDaRecorrencia = (recorrencia: Recorrencia): string => {
  const dia = `dia ${recorrencia.dia}`
  return recorrencia.fim ? `${dia} · até ${mesNumerico(recorrencia.fim)}` : dia
}

export const TOM_DA_RECORRENCIA: Record<TipoDeRecorrencia, TomDoValor> = {
  receita: 'receita',
  despesa: 'despesa',
  transferencia: 'neutro',
}

/** Terminou antes do mês atual: vai para o grupo "Encerradas", no fim da lista. */
export const encerrada = (recorrencia: Recorrencia, mesAtual: string): boolean => {
  return recorrencia.fim !== null && recorrencia.fim < mesAtual
}
