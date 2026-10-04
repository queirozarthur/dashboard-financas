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

export const useFolhaDeConta = () => {
  return useFolhaDeCadastro(CONFIGURACAO_DA_CONTA, contaVazia(0))
}

export const useFolhaDeCategoria = () => {
  return useFolhaDeCadastro(CONFIGURACAO_DA_CATEGORIA, categoriaVazia(0))
}

export type ControleDaFolhaDeConta = ReturnType<typeof useFolhaDeConta>
export type ControleDaFolhaDeCategoria = ReturnType<typeof useFolhaDeCategoria>
