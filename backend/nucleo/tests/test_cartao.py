from datetime import date
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import SimpleTestCase

from nucleo.cartao import dividir_valor, mes_de_fechamento, registrar_compra, vencimento
from nucleo.models import Categoria, Compra, Conta, Transacao
from nucleo.periodos import Mes

from .base import BaseAPI


def cartao(fechamento, vencimento_dia):
    # Objeto sem salvar: as regras de data não precisam do banco
    return Conta(tipo=Conta.Tipo.CARTAO, dia_fechamento=fechamento, dia_vencimento=vencimento_dia)


class TestesEmQualFaturaCai(SimpleTestCase):
    def test_compra_antes_do_fechamento_entra_na_fatura_do_mes(self):
        self.assertEqual(mes_de_fechamento(cartao(25, 5), date(2026, 10, 24)), Mes(2026, 10))

    def test_compra_no_dia_do_fechamento_vai_para_a_proxima(self):
        self.assertEqual(mes_de_fechamento(cartao(25, 5), date(2026, 10, 25)), Mes(2026, 11))

    def test_compra_depois_do_fechamento_vai_para_a_proxima(self):
        self.assertEqual(mes_de_fechamento(cartao(25, 5), date(2026, 10, 30)), Mes(2026, 11))

    def test_compra_depois_do_fechamento_de_dezembro_vai_para_janeiro(self):
        self.assertEqual(mes_de_fechamento(cartao(25, 5), date(2026, 12, 26)), Mes(2027, 1))

    def test_fechamento_31_em_mes_de_30_dias_e_o_dia_30(self):
        # Em novembro o fechamento é dia 30: compra no dia 30 já vai para dezembro
        self.assertEqual(mes_de_fechamento(cartao(31, 10), date(2026, 11, 29)), Mes(2026, 11))
        self.assertEqual(mes_de_fechamento(cartao(31, 10), date(2026, 11, 30)), Mes(2026, 12))


class TestesVencimento(SimpleTestCase):
    def test_vencimento_depois_do_fechamento_e_no_mesmo_mes(self):
        self.assertEqual(vencimento(cartao(3, 10), Mes(2026, 10)), date(2026, 10, 10))

    def test_vencimento_antes_do_fechamento_e_no_mes_seguinte(self):
        self.assertEqual(vencimento(cartao(25, 5), Mes(2026, 10)), date(2026, 11, 5))

    def test_vencimento_igual_ao_fechamento_e_no_mes_seguinte(self):
        self.assertEqual(vencimento(cartao(10, 10), Mes(2026, 10)), date(2026, 11, 10))

    def test_vencimento_31_em_fevereiro_e_o_ultimo_dia(self):
        self.assertEqual(vencimento(cartao(20, 31), Mes(2027, 2)), date(2027, 2, 28))
        self.assertEqual(vencimento(cartao(20, 31), Mes(2028, 2)), date(2028, 2, 29))

    def test_vencimento_atravessa_o_ano(self):
        self.assertEqual(vencimento(cartao(25, 5), Mes(2026, 12)), date(2027, 1, 5))


class TestesDividirValor(SimpleTestCase):
    def test_divisao_exata(self):
        self.assertEqual(dividir_valor(Decimal('1200.00'), 12), [Decimal('100.00')] * 12)

    def test_centavos_que_sobram_vao_na_primeira(self):
        self.assertEqual(
            dividir_valor(Decimal('100.00'), 3),
            [Decimal('33.34'), Decimal('33.33'), Decimal('33.33')],
        )

    def test_soma_das_parcelas_e_sempre_o_total(self):
        for total, parcelas in [('100.00', 3), ('0.05', 4), ('999.99', 7), ('10.00', 1)]:
            with self.subTest(total=total, parcelas=parcelas):
                self.assertEqual(sum(dividir_valor(Decimal(total), parcelas)), Decimal(total))


class TestesRegistrarCompra(BaseAPI):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.nubank = Conta.objects.create(
            usuario=cls.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )

    def comprar(self, valor='1200.00', parcelas=12, data_compra=date(2026, 10, 20)):
        return registrar_compra(
            usuario=self.ana, cartao=self.nubank, categoria=self.mercado,
            valor_total=Decimal(valor), parcelas=parcelas, data_compra=data_compra, descricao='TV',
        )

    def test_gera_uma_despesa_por_parcela_no_cartao(self):
        compra = self.comprar()
        parcelas = compra.parcelas_geradas.order_by('numero_parcela')
        self.assertEqual(parcelas.count(), 12)
        self.assertEqual([p.numero_parcela for p in parcelas], list(range(1, 13)))
        for parcela in parcelas:
            self.assertEqual(parcela.tipo, Transacao.Tipo.DESPESA)
            self.assertEqual(parcela.conta, self.nubank)
            self.assertEqual(parcela.categoria, self.mercado)

    def test_cada_parcela_tem_a_data_de_vencimento_da_sua_fatura(self):
        # Compra em 20/10 com fechamento 25 e vencimento 5: primeira fatura vence em 05/11
        compra = self.comprar(parcelas=3)
        datas = [p.data for p in compra.parcelas_geradas.order_by('numero_parcela')]
        self.assertEqual(datas, [date(2026, 11, 5), date(2026, 12, 5), date(2027, 1, 5)])

    def test_compra_a_vista_e_uma_parcela(self):
        compra = self.comprar(valor='50.00', parcelas=1, data_compra=date(2026, 10, 26))
        parcela = compra.parcelas_geradas.get()
        self.assertEqual(parcela.valor, Decimal('50.00'))
        self.assertEqual(parcela.data, date(2026, 12, 5))

    def test_saldo_do_cartao_fica_negativo_com_a_divida(self):
        self.comprar(valor='100.00', parcelas=3)
        self.assertEqual(Conta.objects.com_saldo().get(pk=self.nubank.pk).saldo, Decimal('-100.00'))

    def test_apagar_a_compra_apaga_as_parcelas(self):
        compra = self.comprar()
        compra.delete()
        self.assertFalse(Transacao.objects.filter(conta=self.nubank).exists())

    def test_conta_que_nao_e_cartao_e_recusada(self):
        with self.assertRaises(ValueError):
            registrar_compra(
                usuario=self.ana, cartao=self.corrente, categoria=self.mercado,
                valor_total=Decimal('10.00'), parcelas=1, data_compra=date(2026, 10, 1),
            )
        self.assertFalse(Compra.objects.exists())


class TestesConstraintsDoCartao(BaseAPI):
    def assert_banco_recusa(self, criar):
        with self.assertRaises(IntegrityError), transaction.atomic():
            criar()

    def test_cartao_sem_dias_e_recusado(self):
        self.assert_banco_recusa(lambda: Conta.objects.create(
            usuario=self.ana, nome='Sem dias', tipo=Conta.Tipo.CARTAO
        ))

    def test_cartao_com_dia_invalido_e_recusado(self):
        for fechamento, vencimento_dia in [(0, 5), (32, 5), (25, 0), (25, 40)]:
            with self.subTest(fechamento=fechamento, vencimento=vencimento_dia):
                self.assert_banco_recusa(lambda: Conta.objects.create(
                    usuario=self.ana, nome='Dia ruim', tipo=Conta.Tipo.CARTAO,
                    dia_fechamento=fechamento, dia_vencimento=vencimento_dia,
                ))

    def test_conta_comum_com_dia_de_fechamento_e_recusada(self):
        self.assert_banco_recusa(lambda: Conta.objects.create(
            usuario=self.ana, nome='Corrente 2', tipo=Conta.Tipo.CORRENTE, dia_fechamento=10
        ))

    def test_parcela_sem_numero_e_recusada(self):
        nubank = Conta.objects.create(
            usuario=self.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )
        compra = Compra.objects.create(
            usuario=self.ana, cartao=nubank, categoria=self.mercado,
            valor_total=Decimal('10.00'), data_compra=date(2026, 10, 1),
        )
        self.assert_banco_recusa(lambda: Transacao.objects.create(
            usuario=self.ana, conta=nubank, categoria=self.mercado, tipo=Transacao.Tipo.DESPESA,
            valor=Decimal('10.00'), data=date(2026, 11, 5), compra=compra,
        ))

    def test_compra_com_zero_parcelas_e_recusada(self):
        nubank = Conta.objects.create(
            usuario=self.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )
        self.assert_banco_recusa(lambda: Compra.objects.create(
            usuario=self.ana, cartao=nubank, categoria=self.mercado,
            valor_total=Decimal('10.00'), parcelas=0, data_compra=date(2026, 10, 1),
        ))
