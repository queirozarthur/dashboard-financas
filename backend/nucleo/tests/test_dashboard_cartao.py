from datetime import date
from decimal import Decimal

from nucleo.cartao import pagar_fatura, registrar_compra
from nucleo.models import Categoria, Conta
from nucleo.periodos import Mes

from .base import BaseAPI


class CenarioCartao(BaseAPI):
    """
    Nubank fecha dia 25 e vence dia 5; a corrente começa com 1.000,00.
      10/10  TV 1.200,00 em 12x (Eletrônicos, variável): 100,00 por mês de 05/11/2026 a 05/10/2027
      20/10  Streaming 90,00 à vista (Assinaturas, fixo): vence em 05/11
      01/11  pagamento da fatura de novembro (190,00) pela corrente
      05/11  salário de 3.000,00 na corrente
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.nubank = Conta.objects.create(
            usuario=cls.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )
        cls.eletronicos = cls.criar_categoria(
            cls.ana, 'Eletrônicos', Categoria.Natureza.DESPESA, Categoria.Tipo.VARIAVEL
        )
        cls.assinaturas = cls.criar_categoria(
            cls.ana, 'Assinaturas', Categoria.Natureza.DESPESA, Categoria.Tipo.FIXO
        )
        cls.tv = registrar_compra(
            usuario=cls.ana, cartao=cls.nubank, categoria=cls.eletronicos, descricao='TV',
            valor_total=Decimal('1200.00'), parcelas=12, data_compra=date(2026, 10, 10),
        )
        registrar_compra(
            usuario=cls.ana, cartao=cls.nubank, categoria=cls.assinaturas, descricao='Streaming',
            valor_total=Decimal('90.00'), parcelas=1, data_compra=date(2026, 10, 20),
        )
        pagar_fatura(cls.nubank, Mes(2026, 11), conta=cls.corrente, data=date(2026, 11, 1))

    def setUp(self):
        super().setUp()
        self.criar_receita('3000.00', data=date(2026, 11, 5))

    def dashboard(self, mes):
        return self.client.get(f'/api/dashboard/?mes={mes}').data


class TestesDashboardComCartao(CenarioCartao):
    def test_mes_da_compra_nao_tem_despesa(self):
        dados = self.dashboard('2026-10')
        self.assertEqual(dados['despesas'], '0.00')
        self.assertEqual(dados['gastos_por_categoria'], [])

    def test_mes_da_fatura_tem_as_parcelas_e_nao_o_pagamento(self):
        dados = self.dashboard('2026-11')
        # 190,00 das parcelas; o pagamento de 190,00 é transferência e não soma de novo
        self.assertEqual(dados['despesas'], '190.00')
        self.assertEqual(dados['receitas'], '3000.00')
        self.assertEqual(dados['resultado'], '2810.00')

    def test_gastos_por_categoria_usam_a_categoria_da_compra(self):
        gastos = self.dashboard('2026-11')['gastos_por_categoria']
        self.assertEqual(
            [(g['categoria'], g['total'], g['tipo']) for g in gastos],
            [('Eletrônicos', '100.00', 'variavel'), ('Assinaturas', '90.00', 'fixo')],
        )

    def test_fixo_e_variavel_com_parcelas(self):
        self.assertEqual(
            self.dashboard('2026-11')['fixo_variavel'], {'fixo': '90.00', 'variavel': '100.00'}
        )

    def test_meses_seguintes_tem_so_a_parcela_da_tv(self):
        for mes in ['2026-12', '2027-06', '2027-10']:
            with self.subTest(mes=mes):
                self.assertEqual(self.dashboard(mes)['despesas'], '100.00')
        self.assertEqual(self.dashboard('2027-11')['despesas'], '0.00')

    def test_comparacao_com_mes_anterior(self):
        dados = self.dashboard('2026-12')
        self.assertEqual(dados['mes_anterior']['despesas'], '190.00')
        self.assertEqual(dados['variacao']['despesas'], '-90.00')

    def test_evolucao_mostra_cada_parcela_no_mes_da_fatura(self):
        meses = self.client.get('/api/dashboard/evolucao/?mes=2027-01&meses=4').data['meses']
        self.assertEqual(
            [(m['mes'], m['despesas']) for m in meses],
            [('2026-10', '0.00'), ('2026-11', '190.00'), ('2026-12', '100.00'), ('2027-01', '100.00')],
        )

    def test_soma_das_despesas_de_todos_os_meses_e_o_total_comprado(self):
        meses = self.client.get('/api/dashboard/evolucao/?mes=2027-12&meses=24').data['meses']
        self.assertEqual(sum(Decimal(m['despesas']) for m in meses), Decimal('1290.00'))


class TestesSaldoComCartao(CenarioCartao):
    def saldo_total(self, mes):
        return self.dashboard(mes)['saldo_total']

    def saldos(self):
        return {c['nome']: c['saldo'] for c in self.client.get('/api/contas/').data}

    def test_saldo_total_no_fim_do_mes_da_compra_ignora_parcelas_futuras(self):
        self.assertEqual(self.saldo_total('2026-10'), '1000.00')

    def test_saldo_total_no_fim_do_mes_da_fatura_paga(self):
        # Corrente: 1000 + 3000 − 190 = 3810. Cartão: −190 + 190 = 0 (parcela de dezembro ainda não venceu)
        self.assertEqual(self.saldo_total('2026-11'), '3810.00')

    def test_fatura_vencida_e_nao_paga_reduz_o_saldo_total(self):
        # A fatura de dezembro (100,00) não foi paga: entra como dívida do cartão
        self.assertEqual(self.saldo_total('2026-12'), '3710.00')

    def test_saldo_do_cartao_na_lista_de_contas_e_a_divida_total(self):
        saldos = self.saldos()
        # 1.290,00 comprados − 190,00 pagos: inclui as parcelas futuras da TV
        self.assertEqual(saldos['Nubank'], '-1100.00')
        self.assertEqual(saldos['Corrente'], '3810.00')

    def test_pagar_a_fatura_nao_muda_o_saldo_total(self):
        antes = self.saldo_total('2026-12')
        self.client.post(
            f'/api/cartoes/{self.nubank.id}/faturas/2026-12/pagar/',
            {'conta': self.corrente.id, 'data': '2026-12-01'},
        )
        self.assertEqual(self.saldo_total('2026-12'), antes)
        self.assertEqual(self.dashboard('2026-12')['despesas'], '100.00')

    def test_cancelar_o_pagamento_nao_muda_as_despesas(self):
        self.client.delete(f'/api/cartoes/{self.nubank.id}/faturas/2026-11/pagar/')
        self.assertEqual(self.dashboard('2026-11')['despesas'], '190.00')
        self.assertEqual(self.saldo_total('2026-11'), '3810.00')


class TestesExtratoComCartao(CenarioCartao):
    def tipos_no_extrato(self, conta, mes):
        resposta = self.client.get(f'/api/transacoes/?conta={conta.id}&mes={mes}')
        return sorted((t['tipo'], t['valor']) for t in resposta.data['results'])

    def test_extrato_do_cartao_tem_parcelas_e_pagamento(self):
        self.assertEqual(
            self.tipos_no_extrato(self.nubank, '2026-11'),
            [('despesa', '100.00'), ('despesa', '90.00'), ('transferencia', '190.00')],
        )

    def test_extrato_da_corrente_tem_o_pagamento(self):
        self.assertIn(('transferencia', '190.00'), self.tipos_no_extrato(self.corrente, '2026-11'))


class TestesCartaoDeOutroUsuarioNaDashboard(BaseAPI):
    def test_compras_da_bia_nao_aparecem_para_a_ana(self):
        cartao_da_bia = Conta.objects.create(
            usuario=self.bia, nome='Cartão da Bia', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )
        registrar_compra(
            usuario=self.bia, cartao=cartao_da_bia, categoria=self.categoria_da_bia,
            valor_total=Decimal('500.00'), parcelas=2, data_compra=date(2026, 10, 10),
        )
        dados = self.client.get('/api/dashboard/?mes=2026-11').data
        self.assertEqual(dados['despesas'], '0.00')
        self.assertEqual(dados['saldo_total'], '1000.00')
