from datetime import date
from decimal import Decimal

from django.db import connection
from django.test.utils import CaptureQueriesContext

from nucleo.cartao import registrar_compra
from nucleo.models import Categoria, Conta, Orcamento, Recorrencia, Transacao
from nucleo.periodos import Mes
from nucleo.recorrencias import confirmar

from .base import BaseAPI

OUTUBRO = date(2026, 10, 15)


class BaseOrcamentosNaDashboard(BaseAPI):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.lazer = cls.criar_categoria(cls.ana, 'Lazer', Categoria.Natureza.DESPESA)

    def orcar(self, valor, categoria=None, inicio=date(2026, 1, 1), usuario=None):
        return Orcamento.objects.create(
            usuario=usuario or self.ana, categoria=categoria or self.mercado,
            valor=Decimal(valor), inicio=inicio,
        )

    def bloco(self, mes='2026-10'):
        return self.client.get(f'/api/dashboard/?mes={mes}').data['orcamentos']

    def linha(self, nome, mes='2026-10'):
        return next(c for c in self.bloco(mes)['categorias'] if c['categoria'] == nome)


class TestesOrcamentosNaDashboard(BaseOrcamentosNaDashboard):
    def test_sem_orcamentos_o_bloco_vem_vazio(self):
        self.criar_despesa('50.00', data=OUTUBRO)
        self.assertEqual(self.bloco(), {
            'categorias': [],
            'total': {'limite': '0.00', 'gasto': '0.00', 'previsto': '0.00',
                      'restante': '0.00', 'percentual': None},
        })

    def test_gasto_restante_e_percentual(self):
        self.orcar('800.00')
        self.criar_despesa('500.00', data=OUTUBRO)
        self.criar_despesa('120.00', data=OUTUBRO)
        self.assertEqual(self.linha('Mercado'), {
            'categoria_id': self.mercado.id, 'categoria': 'Mercado', 'cor': 'laranja', 'icone': 'etiqueta',
            'limite': '800.00',
            'gasto': '620.00', 'previsto': '0.00', 'restante': '180.00', 'percentual': '77.5',
        })

    def test_so_conta_despesas_do_mes_e_da_categoria(self):
        self.orcar('800.00')
        self.criar_despesa('100.00', data=OUTUBRO)
        self.criar_despesa('999.00', data=date(2026, 9, 30))
        self.criar_despesa('999.00', categoria=self.lazer, data=OUTUBRO)
        self.criar_receita('999.00', data=OUTUBRO)
        self.criar_transferencia('999.00', self.corrente, self.carteira, data=OUTUBRO)
        self.assertEqual(self.linha('Mercado')['gasto'], '100.00')

    def test_categoria_com_orcamento_e_sem_gasto_aparece_zerada(self):
        self.orcar('300.00', categoria=self.lazer)
        self.assertEqual(self.linha('Lazer')['gasto'], '0.00')
        self.assertEqual(self.linha('Lazer')['restante'], '300.00')
        self.assertEqual(self.linha('Lazer')['percentual'], '0.0')

    def test_estourar_deixa_restante_negativo(self):
        self.orcar('100.00')
        self.criar_despesa('130.00', data=OUTUBRO)
        self.assertEqual(self.linha('Mercado')['restante'], '-30.00')
        self.assertEqual(self.linha('Mercado')['percentual'], '130.0')

    def test_parcelas_do_cartao_entram_no_mes_da_fatura(self):
        self.orcar('800.00')
        nubank = Conta.objects.create(
            usuario=self.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )
        registrar_compra(
            usuario=self.ana, cartao=nubank, categoria=self.mercado, valor_total=Decimal('300.00'),
            parcelas=3, data_compra=date(2026, 9, 10),
        )
        # Compra de 10/09 com fechamento 25: parcelas vencem em 05/10, 05/11 e 05/12
        self.assertEqual(self.linha('Mercado')['gasto'], '100.00')

    def test_vale_o_limite_vigente_em_cada_mes(self):
        self.orcar('800.00')
        self.orcar('900.00', inicio=date(2026, 11, 1))
        self.assertEqual(self.linha('Mercado', '2026-10')['limite'], '800.00')
        self.assertEqual(self.linha('Mercado', '2026-11')['limite'], '900.00')
        self.assertEqual(self.bloco('2025-12')['categorias'], [])

    def test_categorias_em_ordem_alfabetica_e_total(self):
        self.orcar('800.00')
        self.orcar('200.00', categoria=self.lazer)
        self.criar_despesa('600.00', data=OUTUBRO)
        self.criar_despesa('50.00', categoria=self.lazer, data=OUTUBRO)
        bloco = self.bloco()
        self.assertEqual([c['categoria'] for c in bloco['categorias']], ['Lazer', 'Mercado'])
        self.assertEqual(bloco['total'], {
            'limite': '1000.00', 'gasto': '650.00', 'previsto': '0.00',
            'restante': '350.00', 'percentual': '65.0',
        })

    def test_dados_de_outro_usuario_nao_entram(self):
        self.orcar('500.00', categoria=self.categoria_da_bia, usuario=self.bia)
        self.criar_despesa('99.00', conta=self.conta_da_bia, usuario=self.bia,
                           categoria=self.categoria_da_bia, data=OUTUBRO)
        self.assertEqual(self.bloco()['categorias'], [])


class TestesPrevistoNoOrcamento(BaseOrcamentosNaDashboard):
    def setUp(self):
        super().setUp()
        self.orcar('2000.00')
        self.aluguel = Recorrencia.objects.create(
            usuario=self.ana, descricao='Aluguel', tipo=Transacao.Tipo.DESPESA, valor=Decimal('1500.00'),
            conta=self.corrente, categoria=self.mercado, dia=10, inicio=date(2026, 1, 1),
        )

    def test_recorrencia_nao_confirmada_entra_como_previsto(self):
        self.criar_despesa('300.00', data=OUTUBRO)
        self.assertEqual(self.linha('Mercado'), {
            'categoria_id': self.mercado.id, 'categoria': 'Mercado', 'cor': 'laranja', 'icone': 'etiqueta',
            'limite': '2000.00',
            'gasto': '300.00', 'previsto': '1500.00', 'restante': '200.00', 'percentual': '90.0',
        })

    def test_confirmar_move_do_previsto_para_o_gasto(self):
        antes = self.linha('Mercado')
        confirmar(self.aluguel, Mes(2026, 10))
        depois = self.linha('Mercado')
        self.assertEqual((depois['gasto'], depois['previsto']), ('1500.00', '0.00'))
        self.assertEqual(depois['restante'], antes['restante'])

    def test_recorrencia_de_outra_categoria_nao_entra(self):
        self.aluguel.categoria = self.lazer
        self.aluguel.save()
        self.assertEqual(self.linha('Mercado')['previsto'], '0.00')


class TestesConsultasDoOrcamento(BaseOrcamentosNaDashboard):
    def contar(self):
        with CaptureQueriesContext(connection) as consultas:
            self.client.get('/api/dashboard/?mes=2026-10')
        return len(consultas)

    def test_numero_de_consultas_nao_cresce_com_os_orcamentos(self):
        self.orcar('100.00')
        antes = self.contar()
        for numero in range(6):
            categoria = self.criar_categoria(self.ana, f'Cat {numero}', Categoria.Natureza.DESPESA)
            self.orcar('100.00', categoria=categoria)
            self.orcar('150.00', categoria=categoria, inicio=date(2026, 6, 1))
            self.criar_despesa('10.00', categoria=categoria, data=OUTUBRO)
        self.assertEqual(self.contar(), antes)
