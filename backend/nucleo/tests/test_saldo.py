from decimal import Decimal

from rest_framework import status

from nucleo.models import Conta

from .base import BaseAPI


class TestesSaldo(BaseAPI):
    """saldo = saldo_inicial + receitas − despesas + transferências recebidas − transferências enviadas"""

    def saldo(self, conta):
        return Conta.objects.com_saldo().get(pk=conta.pk).saldo

    def test_sem_transacoes_o_saldo_e_o_inicial(self):
        self.assertEqual(self.saldo(self.corrente), Decimal('1000.00'))
        self.assertEqual(self.saldo(self.carteira), Decimal('0.00'))

    def test_receita_soma_e_despesa_subtrai(self):
        self.criar_receita('3000.00')
        self.criar_despesa('250.50')
        self.assertEqual(self.saldo(self.corrente), Decimal('3749.50'))

    def test_transferencia_tira_da_origem_e_poe_no_destino(self):
        self.criar_transferencia('200.00', self.corrente, self.carteira)
        self.assertEqual(self.saldo(self.corrente), Decimal('800.00'))
        self.assertEqual(self.saldo(self.carteira), Decimal('200.00'))

    def test_transferencia_nao_muda_o_total_das_contas(self):
        total_antes = self.saldo(self.corrente) + self.saldo(self.carteira)
        self.criar_transferencia('200.00', self.corrente, self.carteira)
        self.assertEqual(self.saldo(self.corrente) + self.saldo(self.carteira), total_antes)

    def test_varias_entradas_e_saidas_nao_multiplicam_valores(self):
        # Protege contra o erro de somar as duas relações no mesmo JOIN
        self.criar_receita('100.00')
        self.criar_receita('100.00')
        self.criar_despesa('30.00')
        self.criar_transferencia('50.00', self.corrente, self.carteira)
        self.criar_transferencia('20.00', self.carteira, self.corrente)
        self.criar_transferencia('20.00', self.carteira, self.corrente)
        # 1000 + 200 − 30 − 50 + 40
        self.assertEqual(self.saldo(self.corrente), Decimal('1160.00'))
        # 0 + 50 − 40
        self.assertEqual(self.saldo(self.carteira), Decimal('10.00'))

    def test_saldo_inicial_negativo_e_considerado(self):
        cheque_especial = self.criar_conta(self.ana, 'Cheque especial', saldo_inicial='-300.00')
        self.criar_receita('100.00', conta=cheque_especial)
        self.assertEqual(self.saldo(cheque_especial), Decimal('-200.00'))

    def test_transacoes_de_outro_usuario_nao_afetam_o_saldo(self):
        self.criar_despesa('99.00', conta=self.conta_da_bia, usuario=self.bia, categoria=self.categoria_da_bia)
        self.assertEqual(self.saldo(self.corrente), Decimal('1000.00'))
        self.assertEqual(self.saldo(self.conta_da_bia), Decimal('-99.00'))


class TestesSaldoNaAPI(BaseAPI):
    def test_listagem_traz_o_saldo_como_texto(self):
        self.criar_despesa('0.50')
        contas = {c['nome']: c for c in self.client.get('/api/contas/').data}
        self.assertEqual(contas['Corrente']['saldo'], '999.50')

    def test_criar_conta_devolve_o_saldo(self):
        resposta = self.client.post(
            '/api/contas/', {'nome': 'Poupança', 'tipo': 'corrente', 'saldo_inicial': '50.00'}
        )
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resposta.data['saldo'], '50.00')

    def test_editar_saldo_inicial_atualiza_o_saldo(self):
        self.criar_despesa('100.00')
        resposta = self.client.patch(f'/api/contas/{self.corrente.id}/', {'saldo_inicial': '2000.00'})
        self.assertEqual(resposta.data['saldo'], '1900.00')

    def test_saldo_nao_pode_ser_enviado_pelo_cliente(self):
        resposta = self.client.patch(f'/api/contas/{self.corrente.id}/', {'saldo': '999999.00'})
        self.assertEqual(resposta.data['saldo'], '1000.00')
