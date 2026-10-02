from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase

from nucleo.models import Categoria, Conta, Transacao

Usuario = get_user_model()


class BaseModelos(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = Usuario.objects.create_user('ana', password='senha-teste')
        cls.corrente = Conta.objects.create(
            usuario=cls.usuario, nome='Corrente', tipo=Conta.Tipo.CORRENTE
        )
        cls.carteira = Conta.objects.create(
            usuario=cls.usuario, nome='Carteira', tipo=Conta.Tipo.DINHEIRO
        )
        cls.mercado = Categoria.objects.create(
            usuario=cls.usuario,
            nome='Mercado',
            natureza=Categoria.Natureza.DESPESA,
            tipo=Categoria.Tipo.VARIAVEL,
        )

    def criar_transacao(self, **campos):
        dados = {
            'usuario': self.usuario,
            'conta': self.corrente,
            'categoria': self.mercado,
            'valor': Decimal('50.00'),
            'data': date(2026, 10, 1),
            'tipo': Transacao.Tipo.DESPESA,
        }
        dados.update(campos)
        return Transacao.objects.create(**dados)

    def assert_banco_recusa(self, **campos):
        # atomic isola o erro para que o TestCase continue usando a conexão
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.criar_transacao(**campos)


class TestesTransacaoNoBanco(BaseModelos):
    def test_despesa_valida_e_gravada(self):
        self.criar_transacao()
        self.assertEqual(Transacao.objects.count(), 1)

    def test_transferencia_valida_e_gravada(self):
        self.criar_transacao(
            tipo=Transacao.Tipo.TRANSFERENCIA, categoria=None, conta_destino=self.carteira
        )
        self.assertEqual(Transacao.objects.count(), 1)

    def test_valor_zero_e_recusado(self):
        self.assert_banco_recusa(valor=Decimal('0'))

    def test_valor_negativo_e_recusado(self):
        self.assert_banco_recusa(valor=Decimal('-10.00'))

    def test_despesa_sem_categoria_e_recusada(self):
        self.assert_banco_recusa(categoria=None)

    def test_despesa_com_conta_destino_e_recusada(self):
        self.assert_banco_recusa(conta_destino=self.carteira)

    def test_transferencia_sem_conta_destino_e_recusada(self):
        self.assert_banco_recusa(tipo=Transacao.Tipo.TRANSFERENCIA, categoria=None)

    def test_transferencia_com_categoria_e_recusada(self):
        self.assert_banco_recusa(tipo=Transacao.Tipo.TRANSFERENCIA, conta_destino=self.carteira)

    def test_transferencia_para_a_mesma_conta_e_recusada(self):
        self.assert_banco_recusa(
            tipo=Transacao.Tipo.TRANSFERENCIA, categoria=None, conta_destino=self.corrente
        )


class TestesExclusaoProtegida(BaseModelos):
    def test_conta_com_transacao_nao_pode_ser_apagada(self):
        self.criar_transacao()
        with self.assertRaises(ProtectedError):
            self.corrente.delete()

    def test_conta_destino_de_transferencia_nao_pode_ser_apagada(self):
        self.criar_transacao(
            tipo=Transacao.Tipo.TRANSFERENCIA, categoria=None, conta_destino=self.carteira
        )
        with self.assertRaises(ProtectedError):
            self.carteira.delete()

    def test_categoria_com_transacao_nao_pode_ser_apagada(self):
        self.criar_transacao()
        with self.assertRaises(ProtectedError):
            self.mercado.delete()

    def test_conta_sem_transacao_pode_ser_apagada(self):
        self.carteira.delete()
        self.assertFalse(Conta.objects.filter(pk=self.carteira.pk).exists())


class TestesNomesUnicos(BaseModelos):
    def test_conta_com_nome_repetido_e_recusada(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Conta.objects.create(usuario=self.usuario, nome='Corrente', tipo=Conta.Tipo.CORRENTE)

    def test_outro_usuario_pode_repetir_nome_de_conta(self):
        outro = Usuario.objects.create_user('bia', password='senha-teste')
        Conta.objects.create(usuario=outro, nome='Corrente', tipo=Conta.Tipo.CORRENTE)
        self.assertEqual(Conta.objects.filter(nome='Corrente').count(), 2)

    def test_categoria_com_nome_e_natureza_repetidos_e_recusada(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Categoria.objects.create(
                usuario=self.usuario,
                nome='Mercado',
                natureza=Categoria.Natureza.DESPESA,
                tipo=Categoria.Tipo.FIXO,
            )

    def test_mesmo_nome_de_categoria_com_natureza_diferente_e_aceito(self):
        Categoria.objects.create(
            usuario=self.usuario,
            nome='Mercado',
            natureza=Categoria.Natureza.RECEITA,
            tipo=Categoria.Tipo.VARIAVEL,
        )
        self.assertEqual(Categoria.objects.filter(nome='Mercado').count(), 2)
