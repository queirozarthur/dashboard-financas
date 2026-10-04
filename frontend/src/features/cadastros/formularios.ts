import type { Categoria, Conta } from '@/core/api'
import { proximaCor, type Cor, type NomeDoIcone, type TomDoValor } from '@/core/utils'

import {
  ICONE_PADRAO_DA_CONTA,
  ROTULOS_DOS_TIPOS_DE_CONTA,
  type TipoDeConta,
} from './consts/opcoes'

/* ---------- Conta ---------- */

export type FormularioDeConta = {
  nome: string
  tipo: TipoDeConta
  /** Texto decimal ("150.00", "-300.00") ou "" */
  saldoInicial: string
  diaFechamento: string
  diaVencimento: string
  cor: Cor
  icone: NomeDoIcone
}

export type CampoDaConta = keyof FormularioDeConta

export const CAMPOS_DA_CONTA: Readonly<Record<string, CampoDaConta>> = {
  nome: 'nome',
  tipo: 'tipo',
  saldo_inicial: 'saldoInicial',
  dia_fechamento: 'diaFechamento',
  dia_vencimento: 'diaVencimento',
  cor: 'cor',
  icone: 'icone',
}

/** Conta nova já com a cor que o backend daria (a próxima da paleta), para a prévia mostrar. */
export const contaVazia = (quantidadeDeContas: number): FormularioDeConta => {
  return {
    nome: '',
    tipo: 'corrente',
    saldoInicial: '',
    diaFechamento: '',
    diaVencimento: '',
    cor: proximaCor(quantidadeDeContas),
    icone: ICONE_PADRAO_DA_CONTA.corrente,
  }
}

export const formularioDaConta = (conta: Conta): FormularioDeConta => {
  return {
    nome: conta.nome,
    tipo: conta.tipo,
    saldoInicial: conta.saldo_inicial,
    diaFechamento: conta.dia_fechamento === null ? '' : String(conta.dia_fechamento),
    diaVencimento: conta.dia_vencimento === null ? '' : String(conta.dia_vencimento),
    cor: conta.cor,
    icone: conta.icone,
  }
}

/**
 * Trocar o tipo: o ícone acompanha o tipo, a não ser que a pessoa já tenha escolhido outro.
 * Cartão não tem saldo inicial (a dívida vem das compras); só cartão tem dias.
 */
export const trocarTipoDaConta = (
  formulario: FormularioDeConta,
  tipo: TipoDeConta,
): FormularioDeConta => {
  const iconeEraOPadrao = formulario.icone === ICONE_PADRAO_DA_CONTA[formulario.tipo]
  const cartao = tipo === 'cartao'
  return {
    ...formulario,
    tipo,
    icone: iconeEraOPadrao ? ICONE_PADRAO_DA_CONTA[tipo] : formulario.icone,
    saldoInicial: cartao ? '' : formulario.saldoInicial,
    diaFechamento: cartao ? formulario.diaFechamento : '',
    diaVencimento: cartao ? formulario.diaVencimento : '',
  }
}

export const validarConta = (
  formulario: FormularioDeConta,
): Partial<Record<CampoDaConta, string>> => {
  const erros: Partial<Record<CampoDaConta, string>> = {}
  if (!formulario.nome.trim()) {
    erros.nome = 'Dê um nome à conta.'
  }
  if (formulario.tipo === 'cartao') {
    if (!formulario.diaFechamento) {
      erros.diaFechamento = 'Escolha o dia em que a fatura fecha.'
    }
    if (!formulario.diaVencimento) {
      erros.diaVencimento = 'Escolha o dia em que a fatura vence.'
    }
  }
  return erros
}

export const contaParaAPI = (formulario: FormularioDeConta) => {
  const cartao = formulario.tipo === 'cartao'
  return {
    nome: formulario.nome.trim(),
    tipo: formulario.tipo,
    // Dinheiro sempre em texto; vazio vira zero, e cartão começa sempre em zero
    saldo_inicial: cartao || !formulario.saldoInicial ? '0.00' : formulario.saldoInicial,
    dia_fechamento: cartao ? Number(formulario.diaFechamento) : null,
    dia_vencimento: cartao ? Number(formulario.diaVencimento) : null,
    cor: formulario.cor,
    icone: formulario.icone,
  }
}

/** A linha de baixo de cada conta: o tipo, ou os dias da fatura no cartão. */
export const detalheDaConta = (conta: Conta): string => {
  if (conta.tipo === 'cartao') {
    return `Fecha dia ${conta.dia_fechamento ?? '?'} · vence dia ${conta.dia_vencimento ?? '?'}`
  }
  return ROTULOS_DOS_TIPOS_DE_CONTA[conta.tipo]
}

/** No cartão, saldo negativo é a dívida de sempre: "−" em cor normal, não vermelho de alerta. */
export const tomDoSaldo = (conta: Conta): TomDoValor => {
  return conta.tipo === 'cartao' && conta.saldo.startsWith('-') ? 'despesa' : 'neutro'
}

/* ---------- Categoria ---------- */

export type FormularioDeCategoria = {
  nome: string
  natureza: Categoria['natureza']
  tipo: Categoria['tipo']
  cor: Cor
  icone: NomeDoIcone
}

export type CampoDaCategoria = keyof FormularioDeCategoria

export const CAMPOS_DA_CATEGORIA: Readonly<Record<string, CampoDaCategoria>> = {
  nome: 'nome',
  natureza: 'natureza',
  tipo: 'tipo',
  cor: 'cor',
  icone: 'icone',
}

export const categoriaVazia = (quantidadeDeCategorias: number): FormularioDeCategoria => {
  return {
    nome: '',
    natureza: 'despesa',
    tipo: 'variavel',
    cor: proximaCor(quantidadeDeCategorias),
    icone: 'etiqueta',
  }
}

export const formularioDaCategoria = (categoria: Categoria): FormularioDeCategoria => {
  return {
    nome: categoria.nome,
    natureza: categoria.natureza,
    tipo: categoria.tipo,
    cor: categoria.cor,
    icone: categoria.icone,
  }
}

export const validarCategoria = (
  formulario: FormularioDeCategoria,
): Partial<Record<CampoDaCategoria, string>> => {
  return formulario.nome.trim() ? {} : { nome: 'Dê um nome à categoria.' }
}

export const categoriaParaAPI = (formulario: FormularioDeCategoria) => {
  return { ...formulario, nome: formulario.nome.trim() }
}
