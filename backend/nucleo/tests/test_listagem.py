from datetime import date

from rest_framework import status

from .base import BaseAPI


class TestesFiltrosTransacoes(BaseAPI):
    def ids(self, consulta=''):
        resposta = self.client.get(f'/api/transacoes/{consulta}')
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)
        return {t['id'] for t in resposta.data['results']}

    def test_filtro_por_mes(self):
        outubro = self.criar_despesa('10.00', data=date(2026, 10, 31))
        self.criar_despesa('10.00', data=date(2026, 9, 30))
        self.criar_despesa('10.00', data=date(2025, 10, 15))
        self.assertEqual(self.ids('?mes=2026-10'), {outubro.id})

    def test_filtro_por_conta_funciona_como_extrato(self):
        saiu_da_carteira = self.criar_despesa('10.00', conta=self.carteira)
        chegou_na_carteira = self.criar_transferencia('50.00', self.corrente, self.carteira)
        self.criar_despesa('10.00', conta=self.corrente)
        self.assertEqual(
            self.ids(f'?conta={self.carteira.id}'), {saiu_da_carteira.id, chegou_na_carteira.id}
        )

    def test_filtro_por_categoria(self):
        mercado = self.criar_despesa('10.00')
        self.criar_receita('10.00')
        self.assertEqual(self.ids(f'?categoria={self.mercado.id}'), {mercado.id})

    def test_filtros_combinados(self):
        certa = self.criar_despesa('10.00', data=date(2026, 10, 1))
        self.criar_despesa('10.00', data=date(2026, 9, 1))
        self.criar_receita('10.00', data=date(2026, 10, 1))
        self.assertEqual(self.ids(f'?mes=2026-10&categoria={self.mercado.id}'), {certa.id})

    def test_filtro_por_conta_de_outro_usuario_volta_vazio(self):
        self.criar_despesa('99.00', conta=self.conta_da_bia, usuario=self.bia, categoria=self.categoria_da_bia)
        self.assertEqual(self.ids(f'?conta={self.conta_da_bia.id}'), set())

    def test_parametros_invalidos_respondem_400(self):
        for consulta in ['?mes=2026-13', '?mes=outubro', '?mes=2026-1', '?conta=abc', '?categoria=-1']:
            with self.subTest(consulta=consulta):
                resposta = self.client.get(f'/api/transacoes/{consulta}')
                self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)


class TestesOrdemEPaginacao(BaseAPI):
    def test_mais_recentes_primeiro(self):
        antiga = self.criar_despesa('10.00', data=date(2026, 9, 1))
        nova = self.criar_despesa('10.00', data=date(2026, 10, 1))
        ids = [t['id'] for t in self.client.get('/api/transacoes/').data['results']]
        self.assertEqual(ids, [nova.id, antiga.id])

    def test_pagina_de_50_transacoes(self):
        for _ in range(51):
            self.criar_despesa('1.00')
        primeira = self.client.get('/api/transacoes/').data
        self.assertEqual(primeira['count'], 51)
        self.assertEqual(len(primeira['results']), 50)
        self.assertIsNotNone(primeira['next'])
        segunda = self.client.get('/api/transacoes/?page=2').data
        self.assertEqual(len(segunda['results']), 1)

    def test_listagem_traz_os_nomes_relacionados(self):
        self.criar_transferencia('50.00', self.corrente, self.carteira)
        transacao = self.client.get('/api/transacoes/').data['results'][0]
        self.assertEqual(transacao['conta_nome'], 'Corrente')
        self.assertEqual(transacao['conta_destino_nome'], 'Carteira')
        self.assertIsNone(transacao['categoria_nome'])

    def test_despesa_traz_conta_destino_nome_vazio(self):
        self.criar_despesa('10.00')
        transacao = self.client.get('/api/transacoes/').data['results'][0]
        self.assertIsNone(transacao['conta_destino_nome'])


class TestesSemN1(BaseAPI):
    """O número de consultas não pode crescer com o número de linhas."""

    def contar_consultas(self, rota):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as consultas:
            self.client.get(rota)
        return len(consultas)

    def test_listagem_de_transacoes(self):
        self.criar_despesa('1.00')
        com_uma = self.contar_consultas('/api/transacoes/')
        for _ in range(10):
            self.criar_despesa('1.00')
            self.criar_transferencia('1.00', self.corrente, self.carteira)
        self.assertEqual(self.contar_consultas('/api/transacoes/'), com_uma)

    def test_listagem_de_contas_com_saldo(self):
        com_duas = self.contar_consultas('/api/contas/')
        for numero in range(10):
            conta = self.criar_conta(self.ana, f'Conta {numero}')
            self.criar_despesa('1.00', conta=conta)
        self.assertEqual(self.contar_consultas('/api/contas/'), com_duas)
