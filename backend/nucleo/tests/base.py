from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from nucleo.models import Categoria, Conta, Transacao

Usuario = get_user_model()


class BaseAPI(APITestCase):
    """Ana é a usuária logada; Bia é a outra usuária, cujos dados Ana nunca pode ver."""

    # Uma vez por classe: criar usuário é lento por causa do hash da senha
    @classmethod
    def setUpTestData(cls):
        cls.ana = Usuario.objects.create_user('ana', password='senha-teste')
        cls.bia = Usuario.objects.create_user('bia', password='senha-teste')

        cls.corrente = cls.criar_conta(cls.ana, 'Corrente', saldo_inicial='1000.00')
        cls.carteira = cls.criar_conta(cls.ana, 'Carteira', tipo=Conta.Tipo.DINHEIRO)
        cls.salario = cls.criar_categoria(cls.ana, 'Salário', Categoria.Natureza.RECEITA)
        cls.mercado = cls.criar_categoria(cls.ana, 'Mercado', Categoria.Natureza.DESPESA)

        cls.conta_da_bia = cls.criar_conta(cls.bia, 'Conta da Bia')
        cls.categoria_da_bia = cls.criar_categoria(cls.bia, 'Lazer', Categoria.Natureza.DESPESA)

    def setUp(self):
        self.client.force_authenticate(self.ana)

    @staticmethod
    def criar_conta(usuario, nome, tipo=Conta.Tipo.CORRENTE, saldo_inicial='0'):
        return Conta.objects.create(
            usuario=usuario, nome=nome, tipo=tipo, saldo_inicial=Decimal(saldo_inicial)
        )

    @staticmethod
    def criar_categoria(usuario, nome, natureza, tipo=Categoria.Tipo.VARIAVEL):
        return Categoria.objects.create(usuario=usuario, nome=nome, natureza=natureza, tipo=tipo)

    def criar_receita(self, valor, conta=None, data=date(2026, 10, 5), usuario=None, categoria=None):
        return Transacao.objects.create(
            usuario=usuario or self.ana,
            conta=conta or self.corrente,
            categoria=categoria or self.salario,
            tipo=Transacao.Tipo.RECEITA,
            valor=Decimal(valor),
            data=data,
        )

    def criar_despesa(self, valor, conta=None, data=date(2026, 10, 5), usuario=None, categoria=None):
        return Transacao.objects.create(
            usuario=usuario or self.ana,
            conta=conta or self.corrente,
            categoria=categoria or self.mercado,
            tipo=Transacao.Tipo.DESPESA,
            valor=Decimal(valor),
            data=data,
        )

    def criar_transferencia(self, valor, origem, destino, data=date(2026, 10, 5)):
        return Transacao.objects.create(
            usuario=origem.usuario,
            conta=origem,
            conta_destino=destino,
            tipo=Transacao.Tipo.TRANSFERENCIA,
            valor=Decimal(valor),
            data=data,
        )
