from datetime import date
from decimal import Decimal

from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.test import APIClient

from nucleo.models import Orcamento
from nucleo.orcamentos import vigentes
from nucleo.periodos import Mes

from .base import BaseAPI


class BaseOrcamentos(BaseAPI):
    def criar_orcamento(self, valor, inicio, categoria=None, usuario=None):
        return Orcamento.objects.create(
            usuario=usuario or self.ana,
            categoria=categoria or self.mercado,
            valor=Decimal(valor),
            inicio=inicio,
        )


class TestesVigencia(BaseOrcamentos):
    def limites(self, mes, usuario=None):
        return {o.categoria.nome: o.valor for o in vigentes(usuario or self.ana, mes)}

    def test_vale_a_partir_do_inicio(self):
        self.criar_orcamento('800.00', date(2026, 3, 1))
        self.assertEqual(self.limites(Mes(2026, 2)), {})
        self.assertEqual(self.limites(Mes(2026, 3)), {'Mercado': Decimal('800.00')})
        self.assertEqual(self.limites(Mes(2030, 1)), {'Mercado': Decimal('800.00')})

    def test_limite_novo_nao_reescreve_os_meses_antigos(self):
        self.criar_orcamento('800.00', date(2026, 1, 1))
        self.criar_orcamento('900.00', date(2026, 11, 1))
        self.assertEqual(self.limites(Mes(2026, 10)), {'Mercado': Decimal('800.00')})
        self.assertEqual(self.limites(Mes(2026, 11)), {'Mercado': Decimal('900.00')})
        self.assertEqual(self.limites(Mes(2027, 5)), {'Mercado': Decimal('900.00')})

    def test_uma_linha_por_categoria(self):
        lazer = self.criar_categoria(self.ana, 'Lazer', 'despesa')
        self.criar_orcamento('800.00', date(2026, 1, 1))
        self.criar_orcamento('850.00', date(2026, 6, 1))
        self.criar_orcamento('300.00', date(2026, 2, 1), categoria=lazer)
        self.assertEqual(
            self.limites(Mes(2026, 10)), {'Mercado': Decimal('850.00'), 'Lazer': Decimal('300.00')}
        )

    def test_orcamento_de_outro_usuario_nao_entra(self):
        self.criar_orcamento('999.00', date(2026, 1, 1), categoria=self.categoria_da_bia, usuario=self.bia)
        self.assertEqual(self.limites(Mes(2026, 10)), {})


class TestesConstraintsDoOrcamento(BaseOrcamentos):
    def assert_banco_recusa(self, valor, inicio):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.criar_orcamento(valor, inicio)

    def test_valor_zero_e_recusado(self):
        self.assert_banco_recusa('0', date(2026, 1, 1))

    def test_inicio_fora_do_primeiro_dia_e_recusado(self):
        self.assert_banco_recusa('100.00', date(2026, 1, 15))

    def test_duas_vigencias_no_mesmo_mes_sao_recusadas(self):
        self.criar_orcamento('100.00', date(2026, 1, 1))
        self.assert_banco_recusa('200.00', date(2026, 1, 1))


class TestesAPIDeOrcamentos(BaseOrcamentos):
    def criar(self, **mudancas):
        dados = {'categoria': self.mercado.id, 'valor': '800.00', 'inicio': '2026-01', **mudancas}
        return self.client.post('/api/orcamentos/', dados)

    def test_cria_orcamento(self):
        resposta = self.criar()
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['inicio'], '2026-01')
        self.assertEqual(resposta.data['categoria_nome'], 'Mercado')
        self.assertEqual(Orcamento.objects.get().usuario, self.ana)

    def test_validacoes(self):
        casos = {
            'categoria de receita': ({'categoria': self.salario.id}, 'categoria'),
            'categoria de outro usuario': ({'categoria': self.categoria_da_bia.id}, 'categoria'),
            'valor zero': ({'valor': '0'}, 'valor'),
            'mes invalido': ({'inicio': '2026-13'}, 'inicio'),
        }
        for caso, (mudancas, campo) in casos.items():
            with self.subTest(caso=caso):
                resposta = self.criar(**mudancas)
                self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST, resposta.data)
                self.assertIn(campo, resposta.data)

    def test_mesmo_mes_de_inicio_responde_400(self):
        self.criar()
        resposta = self.criar(valor='900.00')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('inicio', resposta.data)

    def test_editar_mantendo_o_proprio_inicio_funciona(self):
        orcamento = self.criar_orcamento('800.00', date(2026, 1, 1))
        resposta = self.client.patch(f'/api/orcamentos/{orcamento.id}/', {'valor': '750.00'})
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)

    def test_filtro_por_mes_lista_os_limites_vigentes(self):
        self.criar_orcamento('800.00', date(2026, 1, 1))
        self.criar_orcamento('900.00', date(2026, 11, 1))
        todos = self.client.get('/api/orcamentos/').data
        outubro = self.client.get('/api/orcamentos/?mes=2026-10').data
        self.assertEqual(len(todos), 2)
        self.assertEqual([o['valor'] for o in outubro], ['800.00'])

    def test_filtro_com_mes_invalido_responde_400(self):
        resposta = self.client.get('/api/orcamentos/?mes=outubro')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_isolamento(self):
        da_bia = self.criar_orcamento(
            '999.00', date(2026, 1, 1), categoria=self.categoria_da_bia, usuario=self.bia
        )
        self.assertEqual(self.client.get('/api/orcamentos/').data, [])
        self.assertEqual(self.client.get('/api/orcamentos/?mes=2026-10').data, [])
        rota = f'/api/orcamentos/{da_bia.id}/'
        self.assertEqual(self.client.get(rota).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(rota).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(APIClient().get('/api/orcamentos/').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_categoria_com_orcamento_nao_muda_de_natureza_nem_e_apagada(self):
        self.criar_orcamento('800.00', date(2026, 1, 1))
        rota = f'/api/categorias/{self.mercado.id}/'
        self.assertEqual(
            self.client.patch(rota, {'natureza': 'receita'}).status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(self.client.delete(rota).status_code, status.HTTP_409_CONFLICT)
