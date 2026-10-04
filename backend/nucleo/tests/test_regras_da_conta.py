from datetime import date
from decimal import Decimal

from rest_framework import status

from nucleo.models import Conta, Recorrencia

from .base import BaseAPI

DIAS = {'dia_fechamento': 25, 'dia_vencimento': 5}


class TestesTrocarTipoDaConta(BaseAPI):
    def mudar(self, conta, **campos):
        return self.client.patch(f'/api/contas/{conta.id}/', campos, format='json')

    def test_entre_corrente_dinheiro_e_investimento_pode_mesmo_com_lancamentos(self):
        self.criar_despesa('10.00')
        resposta = self.mudar(self.corrente, tipo='investimento')
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)

    def test_virar_cartao_com_lancamentos_e_recusado(self):
        self.criar_despesa('10.00')
        resposta = self.mudar(self.corrente, tipo='cartao', **DIAS)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('tipo', resposta.data)
        self.corrente.refresh_from_db()
        self.assertEqual(self.corrente.tipo, Conta.Tipo.CORRENTE)

    def test_transferencia_recebida_tambem_conta_como_lancamento(self):
        self.criar_transferencia('10.00', self.corrente, self.carteira)
        resposta = self.mudar(self.carteira, tipo='cartao', **DIAS)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recorrencia_tambem_conta_como_lancamento(self):
        Recorrencia.objects.create(
            usuario=self.ana, descricao='Aluguel', tipo='despesa', valor=Decimal('100.00'),
            conta=self.carteira, categoria=self.mercado, dia=10, inicio=date(2026, 1, 1),
        )
        resposta = self.mudar(self.carteira, tipo='cartao', **DIAS)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_deixar_de_ser_cartao_com_compras_e_recusado(self):
        cartao = Conta.objects.create(usuario=self.ana, nome='Nubank', tipo='cartao', **DIAS)
        self.client.post('/api/compras/', {
            'cartao': cartao.id, 'categoria': self.mercado.id, 'valor_total': '30.00',
            'parcelas': 1, 'data_compra': '2026-10-01',
        })
        resposta = self.mudar(cartao, tipo='corrente', dia_fechamento=None, dia_vencimento=None)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('tipo', resposta.data)

    def test_conta_sem_lancamentos_pode_virar_cartao(self):
        resposta = self.mudar(self.carteira, tipo='cartao', saldo_inicial='0.00', **DIAS)
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)


class TestesSaldoInicialDoCartao(BaseAPI):
    def test_cartao_novo_com_saldo_inicial_e_recusado(self):
        resposta = self.client.post(
            '/api/contas/', {'nome': 'Nubank', 'tipo': 'cartao', 'saldo_inicial': '-500.00', **DIAS}
        )
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('saldo_inicial', resposta.data)

    def test_cartao_novo_sem_saldo_inicial_e_aceito(self):
        resposta = self.client.post('/api/contas/', {'nome': 'Nubank', 'tipo': 'cartao', **DIAS})
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['saldo_inicial'], '0.00')

    def test_conta_comum_pode_comecar_negativa(self):
        resposta = self.client.post(
            '/api/contas/', {'nome': 'Cheque especial', 'tipo': 'corrente', 'saldo_inicial': '-300.00'}
        )
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['saldo'], '-300.00')
