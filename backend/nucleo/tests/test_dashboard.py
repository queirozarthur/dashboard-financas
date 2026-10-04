from datetime import date
from unittest import mock

from django.db import connection
from django.test import SimpleTestCase
from django.test.utils import CaptureQueriesContext
from rest_framework import status
from rest_framework.test import APIClient

from nucleo.models import Categoria
from nucleo.periodos import Mes

from .base import BaseAPI


class TestesMes(SimpleTestCase):
    def test_ler_e_escrever(self):
        self.assertEqual(str(Mes.ler('2026-10')), '2026-10')

    def test_formatos_invalidos(self):
        for texto in ['2026-13', '2026-00', '2026-1', 'outubro', '26-10', '']:
            with self.subTest(texto=texto), self.assertRaises(ValueError):
                Mes.ler(texto)

    def test_virada_de_ano(self):
        self.assertEqual(Mes(2026, 1).anterior(), Mes(2025, 12))
        self.assertEqual(Mes(2026, 12).somar(1), Mes(2027, 1))
        self.assertEqual(Mes(2026, 3).somar(-15), Mes(2024, 12))

    def test_ultimo_dia(self):
        self.assertEqual(Mes(2028, 2).ultimo_dia(), date(2028, 2, 29))
        self.assertEqual(Mes(2026, 12).ultimo_dia(), date(2026, 12, 31))


class TestesDashboardSemLogin(BaseAPI):
    def test_exige_login(self):
        anonimo = APIClient()
        for rota in ['/api/dashboard/', '/api/dashboard/evolucao/']:
            with self.subTest(rota=rota):
                self.assertEqual(anonimo.get(rota).status_code, status.HTTP_401_UNAUTHORIZED)


class TestesDashboard(BaseAPI):
    OUTUBRO = date(2026, 10, 15)
    SETEMBRO = date(2026, 9, 15)

    def dashboard(self, mes='2026-10'):
        resposta = self.client.get(f'/api/dashboard/?mes={mes}')
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)
        return resposta.data

    def test_receitas_despesas_e_resultado_do_mes(self):
        self.criar_receita('3000.00', data=self.OUTUBRO)
        self.criar_despesa('250.50', data=self.OUTUBRO)
        self.criar_despesa('100.00', data=self.OUTUBRO)
        dados = self.dashboard()
        self.assertEqual(dados['mes'], '2026-10')
        self.assertEqual(dados['receitas'], '3000.00')
        self.assertEqual(dados['despesas'], '350.50')
        self.assertEqual(dados['resultado'], '2649.50')

    def test_transferencia_nao_e_receita_nem_despesa(self):
        self.criar_transferencia('500.00', self.corrente, self.carteira, data=self.OUTUBRO)
        dados = self.dashboard()
        self.assertEqual(dados['receitas'], '0.00')
        self.assertEqual(dados['despesas'], '0.00')
        self.assertEqual(dados['gastos_por_categoria'], [])

    def test_so_conta_transacoes_do_mes(self):
        self.criar_despesa('10.00', data=date(2026, 10, 1))
        self.criar_despesa('20.00', data=date(2026, 10, 31))
        self.criar_despesa('99.00', data=date(2026, 9, 30))
        self.criar_despesa('99.00', data=date(2026, 11, 1))
        self.assertEqual(self.dashboard()['despesas'], '30.00')

    def test_dados_de_outro_usuario_nao_entram(self):
        self.criar_despesa('99.00', conta=self.conta_da_bia, usuario=self.bia,
                           categoria=self.categoria_da_bia, data=self.OUTUBRO)
        dados = self.dashboard()
        self.assertEqual(dados['despesas'], '0.00')
        self.assertEqual(dados['saldo_total'], '1000.00')

    def test_mes_sem_nada_vem_zerado(self):
        dados = self.dashboard()
        self.assertEqual(dados['resultado'], '0.00')
        self.assertEqual(dados['gastos_por_categoria'], [])
        self.assertEqual(dados['fixo_variavel'], {'fixo': '0.00', 'variavel': '0.00'})

    def test_sem_mes_usa_o_mes_atual_no_fuso_local(self):
        with mock.patch('nucleo.views.timezone.localdate', return_value=date(2027, 3, 31)):
            resposta = self.client.get('/api/dashboard/')
        self.assertEqual(resposta.data['mes'], '2027-03')

    def test_mes_invalido_responde_400(self):
        resposta = self.client.get('/api/dashboard/?mes=2026-13')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)


class TestesSaldoTotalDoDashboard(BaseAPI):
    def saldo_total(self, mes):
        return self.client.get(f'/api/dashboard/?mes={mes}').data['saldo_total']

    def test_soma_o_saldo_de_todas_as_contas(self):
        self.criar_receita('100.00', conta=self.carteira, data=date(2026, 10, 1))
        self.assertEqual(self.saldo_total('2026-10'), '1100.00')

    def test_e_o_saldo_no_fim_do_mes_escolhido(self):
        self.criar_receita('100.00', data=date(2026, 8, 31))
        self.criar_despesa('30.00', data=date(2026, 9, 1))
        self.assertEqual(self.saldo_total('2026-08'), '1100.00')
        self.assertEqual(self.saldo_total('2026-09'), '1070.00')

    def test_transferencia_nao_muda_o_saldo_total(self):
        self.criar_transferencia('400.00', self.corrente, self.carteira, data=date(2026, 10, 1))
        self.assertEqual(self.saldo_total('2026-10'), '1000.00')


class TestesGastosPorCategoria(BaseAPI):
    def setUp(self):
        super().setUp()
        self.aluguel = self.criar_categoria(self.ana, 'Aluguel', Categoria.Natureza.DESPESA, Categoria.Tipo.FIXO)

    def test_agrupa_despesas_por_categoria_do_maior_para_o_menor(self):
        outubro = date(2026, 10, 10)
        self.criar_despesa('150.00', categoria=self.mercado, data=outubro)
        self.criar_despesa('50.00', categoria=self.mercado, data=outubro)
        self.criar_despesa('800.00', categoria=self.aluguel, data=outubro)
        self.criar_receita('5000.00', data=outubro)
        gastos = self.client.get('/api/dashboard/?mes=2026-10').data['gastos_por_categoria']
        self.assertEqual(gastos, [
            {'categoria_id': self.aluguel.id, 'categoria': 'Aluguel', 'tipo': 'fixo',
             'total': '800.00', 'percentual': '80.0', 'cor': self.aluguel.cor, 'icone': 'etiqueta'},
            {'categoria_id': self.mercado.id, 'categoria': 'Mercado', 'tipo': 'variavel',
             'total': '200.00', 'percentual': '20.0', 'cor': 'laranja', 'icone': 'etiqueta'},
        ])

    def test_fixo_e_variavel_so_com_despesas(self):
        outubro = date(2026, 10, 10)
        self.criar_despesa('800.00', categoria=self.aluguel, data=outubro)
        self.criar_despesa('200.00', categoria=self.mercado, data=outubro)
        # O salário é uma receita fixa e não pode entrar na soma
        salario_fixo = self.criar_categoria(self.ana, 'Salário fixo', Categoria.Natureza.RECEITA, Categoria.Tipo.FIXO)
        self.criar_receita('5000.00', categoria=salario_fixo, data=outubro)
        dados = self.client.get('/api/dashboard/?mes=2026-10').data
        self.assertEqual(dados['fixo_variavel'], {'fixo': '800.00', 'variavel': '200.00'})


class TestesComparacaoComMesAnterior(BaseAPI):
    def test_traz_o_mes_anterior_e_a_diferenca(self):
        self.criar_receita('3000.00', data=date(2026, 9, 5))
        self.criar_despesa('1000.00', data=date(2026, 9, 5))
        self.criar_receita('3200.00', data=date(2026, 10, 5))
        self.criar_despesa('1500.00', data=date(2026, 10, 5))
        dados = self.client.get('/api/dashboard/?mes=2026-10').data
        self.assertEqual(dados['mes_anterior'], {
            'mes': '2026-09', 'receitas': '3000.00', 'despesas': '1000.00', 'resultado': '2000.00',
        })
        self.assertEqual(dados['variacao'], {
            'receitas': '200.00', 'despesas': '500.00', 'resultado': '-300.00',
        })

    def test_janeiro_compara_com_dezembro_do_ano_anterior(self):
        self.criar_despesa('70.00', data=date(2025, 12, 20))
        dados = self.client.get('/api/dashboard/?mes=2026-01').data
        self.assertEqual(dados['mes_anterior']['mes'], '2025-12')
        self.assertEqual(dados['mes_anterior']['despesas'], '70.00')


class TestesEvolucao(BaseAPI):
    def evolucao(self, consulta):
        resposta = self.client.get(f'/api/dashboard/evolucao/{consulta}')
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)
        return resposta.data['meses']

    def test_padrao_sao_6_meses_terminando_no_mes_atual(self):
        with mock.patch('nucleo.views.timezone.localdate', return_value=date(2026, 10, 2)):
            meses = self.evolucao('')
        self.assertEqual(
            [m['mes'] for m in meses],
            ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'],
        )

    def test_totais_por_mes_com_zero_nos_meses_vazios(self):
        self.criar_receita('3000.00', data=date(2026, 8, 5))
        self.criar_despesa('100.00', data=date(2026, 8, 31))
        self.criar_despesa('40.00', data=date(2026, 10, 1))
        self.criar_transferencia('999.00', self.corrente, self.carteira, data=date(2026, 10, 1))
        self.assertEqual(self.evolucao('?meses=3&mes=2026-10'), [
            {'mes': '2026-08', 'receitas': '3000.00', 'despesas': '100.00', 'resultado': '2900.00'},
            {'mes': '2026-09', 'receitas': '0.00', 'despesas': '0.00', 'resultado': '0.00'},
            {'mes': '2026-10', 'receitas': '0.00', 'despesas': '40.00', 'resultado': '-40.00'},
        ])

    def test_atravessa_a_virada_do_ano(self):
        self.criar_despesa('10.00', data=date(2025, 12, 31))
        meses = self.evolucao('?meses=2&mes=2026-01')
        self.assertEqual([m['mes'] for m in meses], ['2025-12', '2026-01'])
        self.assertEqual(meses[0]['despesas'], '10.00')

    def test_ignora_meses_fora_da_janela_e_outros_usuarios(self):
        self.criar_despesa('10.00', data=date(2026, 7, 31))
        self.criar_despesa('99.00', conta=self.conta_da_bia, usuario=self.bia,
                           categoria=self.categoria_da_bia, data=date(2026, 9, 1))
        meses = self.evolucao('?meses=2&mes=2026-09')
        self.assertEqual([m['despesas'] for m in meses], ['0.00', '0.00'])

    def test_quantidade_de_meses_invalida_responde_400(self):
        for consulta in ['?meses=0', '?meses=25', '?meses=abc', '?meses=-1', '?mes=2026-13']:
            with self.subTest(consulta=consulta):
                resposta = self.client.get(f'/api/dashboard/evolucao/{consulta}')
                self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aceita_o_maximo_de_24_meses(self):
        self.assertEqual(len(self.evolucao('?meses=24&mes=2026-10')), 24)


class TestesConsultasDaDashboard(BaseAPI):
    """O número de consultas não pode crescer com a quantidade de contas, categorias ou transações."""

    def contar(self, rota):
        with CaptureQueriesContext(connection) as consultas:
            self.client.get(rota)
        return len(consultas)

    def test_numero_de_consultas_fixo(self):
        rotas = ['/api/dashboard/?mes=2026-10', '/api/dashboard/evolucao/?mes=2026-10&meses=12']
        for indice, rota in enumerate(rotas):
            with self.subTest(rota=rota):
                antes = self.contar(rota)
                for numero in range(5):
                    conta = self.criar_conta(self.ana, f'Conta {indice}-{numero}')
                    categoria = self.criar_categoria(
                        self.ana, f'Cat {indice}-{numero}', Categoria.Natureza.DESPESA
                    )
                    self.criar_despesa('1.00', conta=conta, categoria=categoria, data=date(2026, 10, 1))
                    self.criar_despesa('1.00', conta=conta, categoria=categoria, data=date(2026, 3, 1))
                self.assertEqual(self.contar(rota), antes)
