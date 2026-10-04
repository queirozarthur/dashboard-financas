from datetime import date
from decimal import Decimal
from unittest import mock

from rest_framework import status
from rest_framework.test import APIClient

from nucleo.models import Conta, Recorrencia, Transacao
from nucleo.periodos import Mes
from nucleo.recorrencias import confirmar

from .base import BaseAPI


class BaseRecorrenciasAPI(BaseAPI):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.nubank = Conta.objects.create(
            usuario=cls.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )

    def dados(self, **mudancas):
        return {
            'descricao': 'Aluguel', 'tipo': 'despesa', 'valor': '1500.00', 'dia': 10,
            'inicio': '2026-01', 'conta': self.corrente.id, 'categoria': self.mercado.id,
            **mudancas,
        }

    def criar(self, **mudancas):
        # format=json para mandar null de verdade nos campos opcionais
        return self.client.post('/api/recorrencias/', self.dados(**mudancas), format='json')

    def criar_recorrencia(self, usuario=None, **campos):
        dados = {
            'usuario': usuario or self.ana, 'descricao': 'Aluguel', 'tipo': Transacao.Tipo.DESPESA,
            'valor': Decimal('1500.00'), 'conta': self.corrente, 'categoria': self.mercado,
            'dia': 10, 'inicio': date(2026, 1, 1), **campos,
        }
        return Recorrencia.objects.create(**dados)


class TestesCadastro(BaseRecorrenciasAPI):
    def test_cria_recorrencia_com_meses_no_formato_aaaa_mm(self):
        resposta = self.criar(fim='2026-12')
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['inicio'], '2026-01')
        self.assertEqual(resposta.data['fim'], '2026-12')
        recorrencia = Recorrencia.objects.get()
        self.assertEqual(recorrencia.usuario, self.ana)
        self.assertEqual(recorrencia.inicio, date(2026, 1, 1))

    def test_sem_fim_vem_nulo(self):
        self.assertIsNone(self.criar().data['fim'])

    def test_recorrencia_de_transferencia(self):
        resposta = self.criar(tipo='transferencia', categoria=None, conta_destino=self.carteira.id)
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['conta_destino_nome'], 'Carteira')

    def test_validacoes_de_lancamento(self):
        casos = {
            'valor zero': ({'valor': '0'}, 'valor'),
            'despesa sem categoria': ({'categoria': None}, 'categoria'),
            'categoria de receita': ({'categoria': self.salario.id}, 'categoria'),
            'transferencia para a mesma conta': (
                {'tipo': 'transferencia', 'categoria': None, 'conta_destino': self.corrente.id},
                'conta_destino',
            ),
            'despesa no cartao': ({'conta': self.nubank.id}, 'conta'),
            'transferencia para o cartao': (
                {'tipo': 'transferencia', 'categoria': None, 'conta_destino': self.nubank.id},
                'conta_destino',
            ),
            'dia 32': ({'dia': 32}, 'dia'),
            'dia 0': ({'dia': 0}, 'dia'),
            'mes invalido': ({'inicio': '2026-13'}, 'inicio'),
            'data completa no lugar do mes': ({'inicio': '2026-01-15'}, 'inicio'),
            'fim antes do inicio': ({'inicio': '2026-05', 'fim': '2026-04'}, 'fim'),
        }
        for caso, (mudancas, campo) in casos.items():
            with self.subTest(caso=caso):
                resposta = self.criar(**mudancas)
                self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST, resposta.data)
                self.assertIn(campo, resposta.data)
        self.assertFalse(Recorrencia.objects.exists())

    def test_editar_o_valor_nao_muda_meses_ja_confirmados(self):
        aluguel = self.criar_recorrencia()
        transacao = confirmar(aluguel, Mes(2026, 10))
        resposta = self.client.patch(f'/api/recorrencias/{aluguel.id}/', {'valor': '1600.00'})
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)
        transacao.refresh_from_db()
        self.assertEqual(transacao.valor, Decimal('1500.00'))

    def test_patch_no_fim_respeita_o_inicio_salvo(self):
        aluguel = self.criar_recorrencia(inicio=date(2026, 5, 1))
        resposta = self.client.patch(f'/api/recorrencias/{aluguel.id}/', {'fim': '2026-04'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_apagar_recorrencia_mantem_as_transacoes(self):
        aluguel = self.criar_recorrencia()
        confirmar(aluguel, Mes(2026, 10))
        resposta = self.client.delete(f'/api/recorrencias/{aluguel.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Transacao.objects.filter(competencia=date(2026, 10, 1)).count(), 1)


class TestesIsolamento(BaseRecorrenciasAPI):
    def test_exige_login(self):
        anonimo = APIClient()
        for rota in ['/api/recorrencias/', '/api/recorrencias/previstas/']:
            with self.subTest(rota=rota):
                self.assertEqual(anonimo.get(rota).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_lista_so_as_do_usuario(self):
        self.criar_recorrencia()
        self.criar_recorrencia(usuario=self.bia, conta=self.conta_da_bia, categoria=self.categoria_da_bia)
        self.assertEqual(len(self.client.get('/api/recorrencias/').data), 1)

    def test_recorrencia_de_outro_usuario_responde_404(self):
        da_bia = self.criar_recorrencia(
            usuario=self.bia, conta=self.conta_da_bia, categoria=self.categoria_da_bia
        )
        rota = f'/api/recorrencias/{da_bia.id}/'
        self.assertEqual(self.client.get(rota).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.post(rota + 'confirmar/', {'mes': '2026-10'}).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_conta_e_categoria_de_outro_usuario_sao_recusadas(self):
        resposta = self.criar(conta=self.conta_da_bia.id, categoria=self.categoria_da_bia.id)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('conta', resposta.data)
        self.assertIn('categoria', resposta.data)

    def test_usuario_enviado_pelo_cliente_e_ignorado(self):
        resposta = self.criar(usuario=self.bia.id)
        self.assertEqual(Recorrencia.objects.get(pk=resposta.data['id']).usuario, self.ana)


class TestesPrevistas(BaseRecorrenciasAPI):
    def test_lista_os_previstos_do_mes_com_a_data_sugerida(self):
        self.criar_recorrencia(dia=31)
        previstas = self.client.get('/api/recorrencias/previstas/?mes=2026-11').data
        self.assertEqual(len(previstas), 1)
        self.assertEqual(previstas[0]['descricao'], 'Aluguel')
        self.assertEqual(previstas[0]['data'], '2026-11-30')
        self.assertEqual(previstas[0]['valor'], '1500.00')
        self.assertEqual(previstas[0]['conta_nome'], 'Corrente')

    def test_confirmada_sai_da_lista(self):
        aluguel = self.criar_recorrencia()
        confirmar(aluguel, Mes(2026, 10))
        self.assertEqual(self.client.get('/api/recorrencias/previstas/?mes=2026-10').data, [])

    def test_sem_mes_usa_o_mes_atual(self):
        self.criar_recorrencia(inicio=date(2027, 3, 1))
        with mock.patch('nucleo.views.timezone.localdate', return_value=date(2027, 3, 15)):
            previstas = self.client.get('/api/recorrencias/previstas/').data
        self.assertEqual(previstas[0]['data'], '2027-03-10')

    def test_mes_invalido_responde_400(self):
        resposta = self.client.get('/api/recorrencias/previstas/?mes=2026-13')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)


class TestesConfirmarPelaAPI(BaseRecorrenciasAPI):
    def setUp(self):
        super().setUp()
        self.aluguel = self.criar_recorrencia()
        self.rota = f'/api/recorrencias/{self.aluguel.id}/confirmar/'

    def test_confirmar_cria_a_transacao(self):
        resposta = self.client.post(self.rota, {'mes': '2026-10'})
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['valor'], '1500.00')
        self.assertEqual(resposta.data['data'], '2026-10-10')
        self.assertEqual(resposta.data['recorrencia'], self.aluguel.id)
        self.assertEqual(resposta.data['competencia'], '2026-10-01')

    def test_confirmar_com_valor_data_e_conta_trocados(self):
        resposta = self.client.post(self.rota, {
            'mes': '2026-10', 'valor': '1480.00', 'data': '2026-11-02', 'conta': self.carteira.id,
        })
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['valor'], '1480.00')
        self.assertEqual(resposta.data['data'], '2026-11-02')
        self.assertEqual(resposta.data['conta'], self.carteira.id)
        self.assertEqual(resposta.data['competencia'], '2026-10-01')

    def test_confirmar_duas_vezes_responde_409(self):
        self.client.post(self.rota, {'mes': '2026-10'})
        resposta = self.client.post(self.rota, {'mes': '2026-10'})
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)

    def test_mes_fora_do_periodo_responde_400(self):
        resposta = self.client.post(self.rota, {'mes': '2025-12'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('mes', resposta.data)

    def test_pedidos_invalidos_respondem_400(self):
        casos = {
            'sem mes': ({}, 'mes'),
            'mes invalido': ({'mes': 'outubro'}, 'mes'),
            'valor zero': ({'mes': '2026-10', 'valor': '0'}, 'valor'),
            'conta de outro usuario': ({'mes': '2026-10', 'conta': self.conta_da_bia.id}, 'conta'),
            'conta cartao': ({'mes': '2026-10', 'conta': self.nubank.id}, 'conta'),
        }
        for caso, (dados, campo) in casos.items():
            with self.subTest(caso=caso):
                resposta = self.client.post(self.rota, dados)
                self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST, resposta.data)
                self.assertIn(campo, resposta.data)
        self.assertFalse(Transacao.objects.filter(recorrencia=self.aluguel).exists())

    def test_trocar_conta_para_a_mesma_do_destino_e_recusado(self):
        aporte = self.criar_recorrencia(
            descricao='Aporte', tipo=Transacao.Tipo.TRANSFERENCIA, categoria=None, conta_destino=self.carteira,
        )
        resposta = self.client.post(
            f'/api/recorrencias/{aporte.id}/confirmar/', {'mes': '2026-10', 'conta': self.carteira.id}
        )
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transacao_confirmada_pode_ser_editada_e_apagada(self):
        transacao_id = self.client.post(self.rota, {'mes': '2026-10'}).data['id']
        rota_transacao = f'/api/transacoes/{transacao_id}/'
        self.assertEqual(
            self.client.patch(rota_transacao, {'valor': '1490.00'}).status_code, status.HTTP_200_OK
        )
        self.assertEqual(self.client.delete(rota_transacao).status_code, status.HTTP_204_NO_CONTENT)
        previstas = self.client.get('/api/recorrencias/previstas/?mes=2026-10').data
        self.assertEqual([p['recorrencia'] for p in previstas], [self.aluguel.id])


class TestesContaECategoriaUsadasPorRecorrencia(BaseRecorrenciasAPI):
    def test_categoria_usada_nao_muda_de_natureza(self):
        self.criar_recorrencia()
        resposta = self.client.patch(f'/api/categorias/{self.mercado.id}/', {'natureza': 'receita'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('natureza', resposta.data)

    def test_conta_usada_nao_pode_ser_apagada(self):
        self.criar_recorrencia(conta=self.carteira)
        resposta = self.client.delete(f'/api/contas/{self.carteira.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('recorrências', resposta.data['detail'])

    def test_categoria_usada_nao_pode_ser_apagada(self):
        self.criar_recorrencia()
        resposta = self.client.delete(f'/api/categorias/{self.mercado.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)
