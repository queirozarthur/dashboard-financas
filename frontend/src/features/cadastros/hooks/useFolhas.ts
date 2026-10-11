import { esquemaCategoria, esquemaConta, type Categoria, type Conta } from '@/core/api'

import {
  CAMPOS_DA_CATEGORIA,
  CAMPOS_DA_CONTA,
  categoriaParaAPI,
  categoriaVazia,
  contaParaAPI,
  contaVazia,
  formularioDaCategoria,
  formularioDaConta,
  validarCategoria,
  validarConta,
  type CampoDaCategoria,
  type CampoDaConta,
  type FormularioDeCategoria,
  type FormularioDeConta,
} from '../formularios'
import { esquemaRecorrencia, type Recorrencia } from '../consts/esquemas'
import {
  CAMPOS_DA_RECORRENCIA,
  formularioDaRecorrencia,
  recorrenciaParaAPI,
  recorrenciaVazia,
  validarRecorrencia,
  type CampoDaRecorrencia,
  type FormularioDeRecorrencia,
} from '../recorrencias'
import { useFolhaDeCadastro, type ConfiguracaoDoCadastro } from './useFolhaDeCadastro'

// Fora dos componentes: o mesmo objeto a cada render, então os callbacks do hook ficam estáveis
const CONFIGURACAO_DA_CONTA: ConfiguracaoDoCadastro<FormularioDeConta, Conta, CampoDaConta> = {
  caminho: '/contas/',
  esquema: esquemaConta,
  campos: CAMPOS_DA_CONTA,
  doItem: formularioDaConta,
  validar: validarConta,
  paraAPI: contaParaAPI,
}

const CONFIGURACAO_DA_CATEGORIA: ConfiguracaoDoCadastro<
  FormularioDeCategoria,
  Categoria,
  CampoDaCategoria
> = {
  caminho: '/categorias/',
  esquema: esquemaCategoria,
  campos: CAMPOS_DA_CATEGORIA,
  doItem: formularioDaCategoria,
  validar: validarCategoria,
  paraAPI: categoriaParaAPI,
}

const CONFIGURACAO_DA_RECORRENCIA: ConfiguracaoDoCadastro<
  FormularioDeRecorrencia,
  Recorrencia,
  CampoDaRecorrencia
> = {
  caminho: '/recorrencias/',
  esquema: esquemaRecorrencia,
  campos: CAMPOS_DA_RECORRENCIA,
  doItem: formularioDaRecorrencia,
  validar: validarRecorrencia,
  paraAPI: recorrenciaParaAPI,
}

export const useFolhaDeConta = () => {
  return useFolhaDeCadastro(CONFIGURACAO_DA_CONTA, contaVazia(0))
}

export const useFolhaDeCategoria = () => {
  return useFolhaDeCadastro(CONFIGURACAO_DA_CATEGORIA, categoriaVazia(0))
}

export const useFolhaDeRecorrencia = () => {
  // O valor inicial é só um molde: quem abre a folha passa o mês e o dia de hoje
  return useFolhaDeCadastro(CONFIGURACAO_DA_RECORRENCIA, recorrenciaVazia('', 1))
}

export type ControleDaFolhaDeConta = ReturnType<typeof useFolhaDeConta>
export type ControleDaFolhaDeCategoria = ReturnType<typeof useFolhaDeCategoria>
export type ControleDaFolhaDeRecorrencia = ReturnType<typeof useFolhaDeRecorrencia>
