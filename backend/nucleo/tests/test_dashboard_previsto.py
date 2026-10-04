from datetime import date
from decimal import Decimal

from nucleo.models import Recorrencia, Transacao
from nucleo.periodos import Mes
from nucleo.recorrencias import confirmar

from .base import BaseAPI

OUTUBRO = Mes(2026, 10)


class TestesPrevistoNaDashboard(BaseAPI):
    def criar_recorrencia(self, usuario=None, **campos):
        dados = {
            'usuario': usuario or self.ana, 'descricao': 'Aluguel', 'tipo': Transacao.Tipo.DESPESA,
            'valor': Decimal('1500.00'), 'conta': self.corrente, 'categoria': self.mercado,
            'dia': 10, 'inicio': date(2026, 1, 1), **campos,
        }
        return Recorrencia.objects.create(**dados)

    def criar_salario(self, **campos):
        return self.criar_recorrencia(
            descricao='Salário', tipo=Transacao.Tipo.RECEITA, categoria=self.salario,
            valor=Decimal('5000.00'), dia=5, **campos,
        )

    def dashboard(self, mes='2026-10'):
        return self.client.get(f'/api/dashboard/?mes={mes}').data

    def test_sem_recorrencias_o_previsto_e_zero(self):
        self.criar_despesa('100.00', data=date(2026, 10, 3))
        self.assertEqual(self.dashboard()['previsto'], {
            'receitas': '0.00', 'despesas': '0.00', 'resultado_projetado': '-100.00',
        })

    def test_soma_receitas_e_despesas_previstas(self):
        self.criar_salario()
        self.criar_recorrencia()
        self.criar_recorrencia(descricao='Internet', valor=Decimal('120.00'))
        self.criar_despesa('80.00', data=date(2026, 10, 3))
        dados = self.dashboard()
        # Receitas e despesas do mês continuam só com o que aconteceu
        self.assertEqual(dados['despesas'], '80.00')
        self.assertEqual(dados['previsto'], {
            'receitas': '5000.00', 'despesas': '1620.00', 'resultado_projetado': '3300.00',
        })

    def test_transferencia_prevista_fica_fora(self):
        self.criar_recorrencia(
            descricao='Aporte', tipo=Transacao.Tipo.TRANSFERENCIA, categoria=None,
            conta_destino=self.carteira, valor=Decimal('300.00'),
        )
        self.assertEqual(self.dashboard()['previsto']['despesas'], '0.00')

    def test_confirmar_move_do_previsto_para_o_realizado(self):
        aluguel = self.criar_recorrencia()
        antes = self.dashboard()
        confirmar(aluguel, OUTUBRO)
        depois = self.dashboard()
        self.assertEqual(antes['previsto']['despesas'], '1500.00')
        self.assertEqual(depois['previsto']['despesas'], '0.00')
        self.assertEqual(depois['despesas'], '1500.00')
        # Confirmado com o mesmo valor, a projeção não muda
        self.assertEqual(depois['previsto']['resultado_projetado'], antes['previsto']['resultado_projetado'])

    def test_projecao_usa_o_valor_real_depois_de_confirmar(self):
        luz = self.criar_recorrencia(descricao='Luz', valor=Decimal('200.00'))
        confirmar(luz, OUTUBRO, valor=Decimal('187.45'))
        self.assertEqual(self.dashboard()['previsto']['resultado_projetado'], '-187.45')

    def test_fora_do_periodo_e_de_outro_usuario_nao_entram(self):
        self.criar_recorrencia(descricao='Acabou', fim=date(2026, 9, 1))
        self.criar_recorrencia(descricao='Começa depois', inicio=date(2026, 11, 1))
        self.criar_recorrencia(usuario=self.bia, conta=self.conta_da_bia, categoria=self.categoria_da_bia)
        self.assertEqual(self.dashboard()['previsto']['despesas'], '0.00')

    def test_previsto_e_de_cada_mes(self):
        aluguel = self.criar_recorrencia()
        confirmar(aluguel, OUTUBRO)
        self.assertEqual(self.dashboard('2026-10')['previsto']['despesas'], '0.00')
        self.assertEqual(self.dashboard('2026-11')['previsto']['despesas'], '1500.00')

    def test_aluguel_de_outubro_pago_em_novembro(self):
        # Realizado segue a data; previsto segue a competência. O aluguel de outubro pago
        # em 02/11 sai do previsto de outubro e entra nas despesas de novembro
        aluguel = self.criar_recorrencia()
        confirmar(aluguel, OUTUBRO, data=date(2026, 11, 2))
        outubro, novembro = self.dashboard('2026-10'), self.dashboard('2026-11')
        self.assertEqual(outubro['despesas'], '0.00')
        self.assertEqual(outubro['previsto']['despesas'], '0.00')
        self.assertEqual(novembro['despesas'], '1500.00')
        self.assertEqual(novembro['previsto']['despesas'], '1500.00')
