from datetime import date
from decimal import Decimal
from unittest import mock

from django.db import IntegrityError, transaction
from django.test import SimpleTestCase
from rest_framework import status

from nucleo.cartao import fechamento_da_fatura, registrar_compra
from nucleo.models import Compra, Conta, Transacao
from nucleo.periodos import Mes

from .base import BaseAPI


def cartao(fechamento, vencimento_dia):
    return Conta(tipo=Conta.Tipo.CARTAO, dia_fechamento=fechamento, dia_vencimento=vencimento_dia)


class TestesFechamentoDaFatura(SimpleTestCase):
    def test_vencimento_depois_do_fechamento_fecha_no_mesmo_mes(self):
        self.assertEqual(fechamento_da_fatura(cartao(3, 10), Mes(2026, 10)), date(2026, 10, 3))

    def test_vencimento_antes_do_fechamento_fecha_no_mes_anterior(self):
        self.assertEqual(fechamento_da_fatura(cartao(25, 5), Mes(2026, 11)), date(2026, 10, 25))

    def test_fatura_de_janeiro_fecha_em_dezembro(self):
        self.assertEqual(fechamento_da_fatura(cartao(25, 5), Mes(2027, 1)), date(2026, 12, 25))

    def test_fechamento_31_em_fevereiro(self):
        self.assertEqual(fechamento_da_fatura(cartao(31, 10), Mes(2027, 3)), date(2027, 2, 28))


class BaseFaturas(BaseAPI):
    """Nubank fecha dia 25 e vence dia 5. A compra de 10/10 em 3x vence em 05/11, 05/12 e 05/01."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.nubank = Conta.objects.create(
            usuario=cls.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )
        cls.cartao_da_bia = Conta.objects.create(
            usuario=cls.bia, nome='Cartão da Bia', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )

    def comprar(self, valor='100.00', parcelas=3, data_compra=date(2026, 10, 10), descricao='Geladeira'):
        return registrar_compra(
            usuario=self.ana, cartao=self.nubank, categoria=self.mercado, valor_total=Decimal(valor),
            parcelas=parcelas, data_compra=data_compra, descricao=descricao,
        )

    def rota(self, mes='2026-11', cartao=None):
        return f'/api/cartoes/{(cartao or self.nubank).id}/faturas/{mes}/'

    def pagar(self, mes='2026-11', data='2026-11-01', conta=None):
        return self.client.post(
            self.rota(mes) + 'pagar/', {'conta': (conta or self.corrente).id, 'data': data}
        )


class TestesVerFatura(BaseFaturas):
    def test_fatura_reune_as_parcelas_do_mes(self):
        self.comprar()
        self.comprar(valor='50.00', parcelas=1, data_compra=date(2026, 10, 20), descricao='Farmácia')
        self.comprar(valor='999.00', parcelas=1, data_compra=date(2026, 10, 25))  # já cai em dezembro
        fatura = self.client.get(self.rota()).data
        self.assertEqual(fatura['mes'], '2026-11')
        self.assertEqual(fatura['fechamento'], '2026-10-25')
        self.assertEqual(fatura['vencimento'], '2026-11-05')
        self.assertEqual(fatura['total'], '83.34')
        self.assertEqual(fatura['situacao'], 'pendente')
        self.assertIsNone(fatura['pagamento'])
        self.assertEqual(
            [(p['descricao'], p['numero'], p['valor'], p['data_compra']) for p in fatura['parcelas']],
            [('Geladeira', '1/3', '33.34', '2026-10-10'), ('Farmácia', '1/1', '50.00', '2026-10-20')],
        )

    def test_fatura_sem_compras_vem_zerada(self):
        fatura = self.client.get(self.rota()).data
        self.assertEqual(fatura['total'], '0.00')
        self.assertEqual(fatura['parcelas'], [])

    def test_fechada_depende_da_data_de_hoje(self):
        with mock.patch('nucleo.serializers.timezone.localdate', return_value=date(2026, 10, 24)):
            self.assertFalse(self.client.get(self.rota()).data['fechada'])
        with mock.patch('nucleo.serializers.timezone.localdate', return_value=date(2026, 10, 25)):
            self.assertTrue(self.client.get(self.rota()).data['fechada'])

    def test_cartao_de_outro_usuario_responde_404(self):
        resposta = self.client.get(self.rota(cartao=self.cartao_da_bia))
        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)

    def test_conta_que_nao_e_cartao_responde_404(self):
        resposta = self.client.get(self.rota(cartao=self.corrente))
        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)

    def test_mes_invalido_responde_400(self):
        resposta = self.client.get(self.rota(mes='2026-13'))
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)


class TestesPagarFatura(BaseFaturas):
    def setUp(self):
        super().setUp()
        self.compra = self.comprar()

    def test_pagar_cria_transferencia_com_o_total(self):
        resposta = self.pagar()
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['situacao'], 'paga')
        self.assertEqual(resposta.data['pagamento']['data'], '2026-11-01')
        self.assertEqual(resposta.data['pagamento']['conta'], self.corrente.id)
        self.assertEqual(resposta.data['pagamento']['valor'], '33.34')

        pagamento = Transacao.objects.get(fatura_paga__isnull=False)
        self.assertEqual(pagamento.tipo, Transacao.Tipo.TRANSFERENCIA)
        self.assertEqual(pagamento.conta, self.corrente)
        self.assertEqual(pagamento.conta_destino, self.nubank)
        self.assertEqual(pagamento.fatura_paga, date(2026, 11, 5))

    def test_valor_enviado_pelo_cliente_e_ignorado(self):
        self.client.post(self.rota() + 'pagar/', {
            'conta': self.corrente.id, 'data': '2026-11-01', 'valor': '1.00',
        })
        self.assertEqual(Transacao.objects.get(fatura_paga__isnull=False).valor, Decimal('33.34'))

    def test_pagamento_move_o_dinheiro_entre_as_contas(self):
        self.pagar()
        saldos = {c.nome: c.saldo for c in Conta.objects.com_saldo().filter(usuario=self.ana)}
        self.assertEqual(saldos['Corrente'], Decimal('966.66'))
        # A dívida cai de 100,00 para 66,66: sobram as duas parcelas futuras
        self.assertEqual(saldos['Nubank'], Decimal('-66.66'))

    def test_pagamento_nao_e_despesa_na_dashboard(self):
        self.pagar()
        dados = self.client.get('/api/dashboard/?mes=2026-11').data
        self.assertEqual(dados['despesas'], '33.34')

    def test_antes_do_fechamento_e_recusado(self):
        resposta = self.pagar(data='2026-10-24')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('25/10/2026', resposta.data['detail'])
        self.assertFalse(Transacao.objects.filter(fatura_paga__isnull=False).exists())

    def test_no_dia_do_fechamento_e_aceito(self):
        self.assertEqual(self.pagar(data='2026-10-25').status_code, status.HTTP_201_CREATED)

    def test_pagar_duas_vezes_responde_409(self):
        self.pagar()
        resposta = self.pagar(data='2026-11-02')
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(Transacao.objects.filter(fatura_paga__isnull=False).count(), 1)

    def test_fatura_sem_parcelas_e_recusada(self):
        resposta = self.pagar(mes='2026-10', data='2026-10-01')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pagar_com_outro_cartao_e_recusado(self):
        inter = Conta.objects.create(
            usuario=self.ana, nome='Inter', tipo=Conta.Tipo.CARTAO, dia_fechamento=1, dia_vencimento=10
        )
        resposta = self.pagar(conta=inter)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pagar_com_conta_de_outro_usuario_e_recusado(self):
        resposta = self.pagar(conta=self.conta_da_bia)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('conta', resposta.data)

    def test_pagar_fatura_de_outro_usuario_responde_404(self):
        resposta = self.client.post(
            self.rota(cartao=self.cartao_da_bia) + 'pagar/', {'conta': self.corrente.id, 'data': '2026-11-01'}
        )
        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)

    def test_banco_recusa_segundo_pagamento_da_mesma_fatura(self):
        self.pagar()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Transacao.objects.create(
                usuario=self.ana, tipo=Transacao.Tipo.TRANSFERENCIA, conta=self.carteira,
                conta_destino=self.nubank, valor=Decimal('33.34'), data=date(2026, 11, 2),
                fatura_paga=date(2026, 11, 5),
            )


class TestesSituacaoDasParcelas(BaseFaturas):
    def parcelas(self, compra):
        return self.client.get(f'/api/compras/{compra.id}/').data['parcelas_geradas']

    def test_parcelas_comecam_pendentes(self):
        compra = self.comprar()
        for parcela in self.parcelas(compra):
            self.assertEqual(parcela['situacao'], 'pendente')
            self.assertIsNone(parcela['data_pagamento'])

    def test_parcela_da_fatura_paga_mostra_a_data_do_pagamento(self):
        compra = self.comprar()
        self.pagar(data='2026-11-03')
        parcelas = self.parcelas(compra)
        self.assertEqual(
            [(p['numero'], p['situacao'], p['data_pagamento']) for p in parcelas],
            [('1/3', 'paga', '2026-11-03'), ('2/3', 'pendente', None), ('3/3', 'pendente', None)],
        )


class TestesCancelarPagamento(BaseFaturas):
    def setUp(self):
        super().setUp()
        self.compra = self.comprar()

    def test_cancelar_volta_a_fatura_para_pendente(self):
        self.pagar()
        resposta = self.client.delete(self.rota() + 'pagar/')
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data['situacao'], 'pendente')
        self.assertFalse(Transacao.objects.filter(fatura_paga__isnull=False).exists())

    def test_depois_de_cancelar_da_para_pagar_de_novo(self):
        self.pagar()
        self.client.delete(self.rota() + 'pagar/')
        self.assertEqual(self.pagar(data='2026-11-04').status_code, status.HTTP_201_CREATED)

    def test_cancelar_fatura_nao_paga_e_recusado(self):
        resposta = self.client.delete(self.rota() + 'pagar/')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)


class TestesPagamentoPelaRotaDeTransacoes(BaseFaturas):
    def setUp(self):
        super().setUp()
        self.comprar()
        self.pagar()
        self.pagamento = Transacao.objects.get(fatura_paga__isnull=False)
        self.rota_pagamento = f'/api/transacoes/{self.pagamento.id}/'

    def test_pagamento_mostra_a_fatura_paga(self):
        self.assertEqual(self.client.get(self.rota_pagamento).data['fatura_paga'], '2026-11-05')

    def test_editar_pagamento_e_recusado(self):
        resposta = self.client.patch(self.rota_pagamento, {'data': '2026-11-20'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.pagamento.refresh_from_db()
        self.assertEqual(self.pagamento.data, date(2026, 11, 1))

    def test_apagar_pagamento_responde_409_com_a_rota_certa(self):
        resposta = self.client.delete(self.rota_pagamento)
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)
        self.assertIn(f'/api/cartoes/{self.nubank.id}/faturas/2026-11/pagar/', resposta.data['detail'])


class TestesComprasEFaturasPagas(BaseFaturas):
    def test_compra_com_parcela_em_fatura_paga_nao_pode_ser_apagada(self):
        compra = self.comprar()
        self.pagar()
        resposta = self.client.delete(f'/api/compras/{compra.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(compra.parcelas_geradas.count(), 3)

    def test_depois_de_cancelar_o_pagamento_a_compra_pode_ser_apagada(self):
        compra = self.comprar()
        self.pagar()
        self.client.delete(self.rota() + 'pagar/')
        resposta = self.client.delete(f'/api/compras/{compra.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_204_NO_CONTENT)

    def test_compra_que_cairia_em_fatura_paga_e_recusada(self):
        self.comprar()
        self.pagar()
        resposta = self.client.post('/api/compras/', {
            'cartao': self.nubank.id, 'categoria': self.mercado.id, 'descricao': 'Esquecida',
            'valor_total': '20.00', 'parcelas': 1, 'data_compra': '2026-10-12',
        })
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('05/11/2026', resposta.data['data_compra'][0])
        self.assertFalse(Compra.objects.filter(descricao='Esquecida').exists())

    def test_compra_em_fatura_futura_nao_paga_e_aceita(self):
        self.comprar()
        self.pagar()
        resposta = self.client.post('/api/compras/', {
            'cartao': self.nubank.id, 'categoria': self.mercado.id,
            'valor_total': '20.00', 'parcelas': 1, 'data_compra': '2026-10-26',
        })
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
