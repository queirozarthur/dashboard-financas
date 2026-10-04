from datetime import date
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import SimpleTestCase

from nucleo.models import Conta, Recorrencia, Transacao
from nucleo.periodos import Mes
from nucleo.recorrencias import (
    ErroDeRecorrencia,
    RecorrenciaJaConfirmada,
    confirmar,
    data_sugerida,
    esta_ativa,
    previstas,
)

from .base import BaseAPI

OUTUBRO = Mes(2026, 10)


class TestesDatas(SimpleTestCase):
    def test_dia_31_em_mes_curto_vira_o_ultimo_dia(self):
        self.assertEqual(Mes(2026, 11).dia(31), date(2026, 11, 30))
        self.assertEqual(Mes(2027, 2).dia(30), date(2027, 2, 28))
        self.assertEqual(Mes(2028, 2).dia(31), date(2028, 2, 29))
        self.assertEqual(Mes(2026, 10).dia(31), date(2026, 10, 31))

    def test_data_sugerida_usa_o_dia_da_recorrencia(self):
        self.assertEqual(data_sugerida(Recorrencia(dia=31), Mes(2026, 9)), date(2026, 9, 30))

    def test_ativa_entre_inicio_e_fim_inclusive(self):
        aluguel = Recorrencia(inicio=date(2026, 3, 1), fim=date(2026, 10, 1))
        self.assertFalse(esta_ativa(aluguel, Mes(2026, 2)))
        self.assertTrue(esta_ativa(aluguel, Mes(2026, 3)))
        self.assertTrue(esta_ativa(aluguel, Mes(2026, 10)))
        self.assertFalse(esta_ativa(aluguel, Mes(2026, 11)))

    def test_sem_fim_vale_para_sempre(self):
        self.assertTrue(esta_ativa(Recorrencia(inicio=date(2026, 3, 1), fim=None), Mes(2040, 1)))


class BaseRecorrencias(BaseAPI):
    def criar_recorrencia(self, **campos):
        dados = {
            'usuario': self.ana,
            'descricao': 'Aluguel',
            'tipo': Transacao.Tipo.DESPESA,
            'valor': Decimal('1500.00'),
            'conta': self.corrente,
            'categoria': self.mercado,
            'dia': 10,
            'inicio': date(2026, 1, 1),
        }
        dados.update(campos)
        return Recorrencia.objects.create(**dados)


class TestesPrevistas(BaseRecorrencias):
    def descricoes(self, mes=OUTUBRO, usuario=None):
        return [r.descricao for r in previstas(usuario or self.ana, mes)]

    def test_recorrencia_ativa_aparece_prevista(self):
        self.criar_recorrencia()
        self.assertEqual(self.descricoes(), ['Aluguel'])

    def test_fora_do_periodo_nao_aparece(self):
        self.criar_recorrencia(descricao='Antiga', inicio=date(2026, 1, 1), fim=date(2026, 9, 1))
        self.criar_recorrencia(descricao='Futura', inicio=date(2026, 11, 1))
        self.criar_recorrencia(descricao='Acaba agora', inicio=date(2026, 1, 1), fim=date(2026, 10, 1))
        self.assertEqual(self.descricoes(), ['Acaba agora'])

    def test_confirmada_no_mes_sai_dos_previstos(self):
        aluguel = self.criar_recorrencia()
        confirmar(aluguel, OUTUBRO)
        self.assertEqual(self.descricoes(), [])
        self.assertEqual(self.descricoes(mes=Mes(2026, 11)), ['Aluguel'])

    def test_mes_nao_confirmado_continua_previsto_so_naquele_mes(self):
        self.criar_recorrencia()
        confirmar(Recorrencia.objects.get(), Mes(2026, 11))
        self.assertEqual(self.descricoes(mes=OUTUBRO), ['Aluguel'])
        self.assertEqual(self.descricoes(mes=Mes(2026, 11)), [])

    def test_apagar_a_transacao_volta_para_previsto(self):
        aluguel = self.criar_recorrencia()
        confirmar(aluguel, OUTUBRO).delete()
        self.assertEqual(self.descricoes(), ['Aluguel'])

    def test_recorrencias_de_outro_usuario_nao_aparecem(self):
        self.criar_recorrencia(
            usuario=self.bia, conta=self.conta_da_bia, categoria=self.categoria_da_bia
        )
        self.assertEqual(self.descricoes(), [])


class TestesConfirmar(BaseRecorrencias):
    def test_cria_a_transacao_com_os_valores_sugeridos(self):
        aluguel = self.criar_recorrencia(dia=31)
        transacao = confirmar(aluguel, Mes(2026, 11))
        self.assertEqual(transacao.tipo, Transacao.Tipo.DESPESA)
        self.assertEqual(transacao.valor, Decimal('1500.00'))
        self.assertEqual(transacao.data, date(2026, 11, 30))
        self.assertEqual(transacao.conta, self.corrente)
        self.assertEqual(transacao.categoria, self.mercado)
        self.assertEqual(transacao.descricao, 'Aluguel')
        self.assertEqual(transacao.recorrencia, aluguel)
        self.assertEqual(transacao.competencia, date(2026, 11, 1))

    def test_valor_data_e_conta_podem_ser_trocados(self):
        luz = self.criar_recorrencia(descricao='Luz', valor=Decimal('200.00'))
        transacao = confirmar(
            luz, OUTUBRO, valor=Decimal('187.45'), data=date(2026, 10, 12), conta=self.carteira
        )
        self.assertEqual(transacao.valor, Decimal('187.45'))
        self.assertEqual(transacao.data, date(2026, 10, 12))
        self.assertEqual(transacao.conta, self.carteira)

    def test_competencia_nao_muda_com_a_data(self):
        # Aluguel de outubro pago em 2 de novembro continua sendo de outubro
        transacao = confirmar(self.criar_recorrencia(), OUTUBRO, data=date(2026, 11, 2))
        self.assertEqual(transacao.competencia, date(2026, 10, 1))

    def test_confirmar_duas_vezes_no_mesmo_mes_e_recusado(self):
        aluguel = self.criar_recorrencia()
        confirmar(aluguel, OUTUBRO)
        with self.assertRaises(RecorrenciaJaConfirmada):
            confirmar(aluguel, OUTUBRO)
        self.assertEqual(aluguel.confirmacoes.count(), 1)

    def test_confirmar_fora_do_periodo_e_recusado(self):
        aluguel = self.criar_recorrencia(inicio=date(2026, 11, 1))
        with self.assertRaises(ErroDeRecorrencia):
            confirmar(aluguel, OUTUBRO)

    def test_recorrencia_de_transferencia_gera_transferencia(self):
        aporte = self.criar_recorrencia(
            descricao='Aporte', tipo=Transacao.Tipo.TRANSFERENCIA, categoria=None,
            conta_destino=self.carteira, valor=Decimal('300.00'),
        )
        transacao = confirmar(aporte, OUTUBRO)
        self.assertEqual(transacao.tipo, Transacao.Tipo.TRANSFERENCIA)
        self.assertEqual(transacao.conta_destino, self.carteira)
        self.assertIsNone(transacao.categoria)

    def test_so_a_confirmada_entra_no_saldo(self):
        self.criar_recorrencia(descricao='Prevista')
        confirmar(self.criar_recorrencia(descricao='Confirmada', valor=Decimal('100.00')), OUTUBRO)
        self.assertEqual(Conta.objects.com_saldo().get(pk=self.corrente.pk).saldo, Decimal('900.00'))

    def test_apagar_a_recorrencia_mantem_as_transacoes(self):
        aluguel = self.criar_recorrencia()
        transacao = confirmar(aluguel, OUTUBRO)
        aluguel.delete()
        transacao.refresh_from_db()
        self.assertIsNone(transacao.recorrencia)
        self.assertEqual(transacao.competencia, date(2026, 10, 1))


class TestesConstraintsDaRecorrencia(BaseRecorrencias):
    def assert_banco_recusa(self, **campos):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.criar_recorrencia(**campos)

    def test_valor_zero_e_recusado(self):
        self.assert_banco_recusa(valor=Decimal('0'))

    def test_despesa_sem_categoria_e_recusada(self):
        self.assert_banco_recusa(categoria=None)

    def test_transferencia_com_categoria_e_recusada(self):
        self.assert_banco_recusa(tipo=Transacao.Tipo.TRANSFERENCIA, conta_destino=self.carteira)

    def test_transferencia_para_a_mesma_conta_e_recusada(self):
        self.assert_banco_recusa(
            tipo=Transacao.Tipo.TRANSFERENCIA, categoria=None, conta_destino=self.corrente
        )

    def test_dia_fora_de_1_a_31_e_recusado(self):
        for dia in [0, 32]:
            with self.subTest(dia=dia):
                self.assert_banco_recusa(dia=dia)

    def test_inicio_fora_do_primeiro_dia_e_recusado(self):
        self.assert_banco_recusa(inicio=date(2026, 1, 15))

    def test_fim_antes_do_inicio_e_recusado(self):
        self.assert_banco_recusa(inicio=date(2026, 5, 1), fim=date(2026, 4, 1))

    def test_fim_fora_do_primeiro_dia_e_recusado(self):
        self.assert_banco_recusa(fim=date(2026, 12, 31))

    def test_fim_no_mesmo_mes_do_inicio_e_aceito(self):
        self.criar_recorrencia(inicio=date(2026, 5, 1), fim=date(2026, 5, 1))

    def test_transacao_de_recorrencia_sem_competencia_e_recusada(self):
        aluguel = self.criar_recorrencia()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Transacao.objects.create(
                usuario=self.ana, conta=self.corrente, categoria=self.mercado, tipo=Transacao.Tipo.DESPESA,
                valor=Decimal('10.00'), data=date(2026, 10, 10), recorrencia=aluguel,
            )

    def test_banco_recusa_segunda_confirmacao_no_mesmo_mes(self):
        aluguel = self.criar_recorrencia()
        confirmar(aluguel, OUTUBRO)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Transacao.objects.create(
                usuario=self.ana, conta=self.corrente, categoria=self.mercado, tipo=Transacao.Tipo.DESPESA,
                valor=Decimal('10.00'), data=date(2026, 10, 10), recorrencia=aluguel,
                competencia=date(2026, 10, 1),
            )
