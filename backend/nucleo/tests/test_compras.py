from datetime import date
from decimal import Decimal

from rest_framework import status

from nucleo.cartao import registrar_compra
from nucleo.models import Compra, Conta, Transacao

from .base import BaseAPI


class BaseCompras(BaseAPI):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # Fecha dia 25 e vence dia 5 do mês seguinte
        cls.nubank = Conta.objects.create(
            usuario=cls.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )
        cls.cartao_da_bia = Conta.objects.create(
            usuario=cls.bia, nome='Cartão da Bia', tipo=Conta.Tipo.CARTAO, dia_fechamento=10, dia_vencimento=20
        )

    def dados(self, **mudancas):
        return {
            'cartao': self.nubank.id,
            'categoria': self.mercado.id,
            'descricao': 'Geladeira',
            'valor_total': '100.00',
            'parcelas': 3,
            'data_compra': '2026-10-10',
            **mudancas,
        }

    def comprar(self, usuario=None, cartao=None, categoria=None, valor='100.00', parcelas=3):
        return registrar_compra(
            usuario=usuario or self.ana,
            cartao=cartao or self.nubank,
            categoria=categoria or self.mercado,
            valor_total=Decimal(valor),
            parcelas=parcelas,
            data_compra=date(2026, 10, 10),
        )


class TestesCartaoPelaApi(BaseCompras):
    def test_cria_cartao_com_os_dias(self):
        resposta = self.client.post('/api/contas/', {
            'nome': 'Inter', 'tipo': 'cartao', 'dia_fechamento': 3, 'dia_vencimento': 10,
        })
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['dia_fechamento'], 3)

    def test_cartao_sem_os_dias_responde_400(self):
        resposta = self.client.post('/api/contas/', {'nome': 'Inter', 'tipo': 'cartao'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dia_fechamento', resposta.data)
        self.assertIn('dia_vencimento', resposta.data)

    def test_conta_que_nao_e_cartao_nao_tem_os_dias(self):
        resposta = self.client.post('/api/contas/', {'nome': 'Poupança', 'tipo': 'corrente', 'dia_fechamento': 3})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dia_fechamento', resposta.data)

    def test_dia_fora_de_1_a_31_responde_400(self):
        resposta = self.client.post('/api/contas/', {
            'nome': 'Inter', 'tipo': 'cartao', 'dia_fechamento': 32, 'dia_vencimento': 0,
        })
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dia_fechamento', resposta.data)
        self.assertIn('dia_vencimento', resposta.data)


class TestesCriarCompra(BaseCompras):
    def test_cria_compra_e_gera_as_parcelas(self):
        resposta = self.client.post('/api/compras/', self.dados())
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)

        compra = Compra.objects.get(pk=resposta.data['id'])
        self.assertEqual(compra.usuario, self.ana)
        self.assertEqual(
            [(p['numero'], p['valor'], p['vencimento']) for p in resposta.data['parcelas_geradas']],
            [
                ('1/3', '33.34', '2026-11-05'),
                ('2/3', '33.33', '2026-12-05'),
                ('3/3', '33.33', '2027-01-05'),
            ],
        )
        self.assertEqual(Transacao.objects.filter(compra=compra, conta=self.nubank, tipo='despesa').count(), 3)

    def test_usuario_vem_do_login_e_nao_do_cliente(self):
        resposta = self.client.post('/api/compras/', self.dados(usuario=self.bia.id))
        self.assertEqual(Compra.objects.get(pk=resposta.data['id']).usuario, self.ana)

    def test_conta_que_nao_e_cartao_responde_400(self):
        resposta = self.client.post('/api/compras/', self.dados(cartao=self.corrente.id))
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cartao', resposta.data)

    def test_categoria_de_receita_responde_400(self):
        resposta = self.client.post('/api/compras/', self.dados(categoria=self.salario.id))
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('categoria', resposta.data)

    def test_valor_zero_ou_negativo_responde_400(self):
        for valor in ['0', '-10.00']:
            with self.subTest(valor=valor):
                resposta = self.client.post('/api/compras/', self.dados(valor_total=valor))
                self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('valor_total', resposta.data)

    def test_parcelas_fora_do_limite_respondem_400(self):
        for parcelas in [0, 49]:
            with self.subTest(parcelas=parcelas):
                resposta = self.client.post('/api/compras/', self.dados(parcelas=parcelas))
                self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('parcelas', resposta.data)

    def test_cartao_e_categoria_de_outro_usuario_respondem_400(self):
        resposta = self.client.post(
            '/api/compras/', self.dados(cartao=self.cartao_da_bia.id, categoria=self.categoria_da_bia.id)
        )
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cartao', resposta.data)
        self.assertIn('categoria', resposta.data)

    def test_compra_invalida_nao_grava_nada(self):
        self.client.post('/api/compras/', self.dados(parcelas=0))
        self.assertFalse(Compra.objects.exists())
        self.assertFalse(Transacao.objects.exists())


class TestesListarEApagarCompra(BaseCompras):
    def test_lista_so_as_compras_do_usuario(self):
        minha = self.comprar()
        self.comprar(usuario=self.bia, cartao=self.cartao_da_bia, categoria=self.categoria_da_bia)
        ids = [c['id'] for c in self.client.get('/api/compras/').data['results']]
        self.assertEqual(ids, [minha.id])

    def test_listagem_nao_tem_n_mais_1(self):
        for _ in range(5):
            self.comprar(parcelas=12)
        # Contagem da paginação + compras com cartão e categoria + parcelas
        with self.assertNumQueries(3):
            self.client.get('/api/compras/')

    def test_compra_de_outro_usuario_responde_404(self):
        da_bia = self.comprar(usuario=self.bia, cartao=self.cartao_da_bia, categoria=self.categoria_da_bia)
        self.assertEqual(self.client.get(f'/api/compras/{da_bia.id}/').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(f'/api/compras/{da_bia.id}/').status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Compra.objects.filter(pk=da_bia.id).exists())

    def test_apagar_compra_apaga_as_parcelas(self):
        compra = self.comprar()
        resposta = self.client.delete(f'/api/compras/{compra.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Transacao.objects.filter(compra_id=compra.id).exists())

    def test_compra_nao_pode_ser_editada(self):
        compra = self.comprar()
        for metodo in [self.client.put, self.client.patch]:
            with self.subTest(metodo=metodo.__name__):
                resposta = metodo(f'/api/compras/{compra.id}/', {'descricao': 'Outra'})
                self.assertEqual(resposta.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_parcelas_aparecem_na_dashboard_no_mes_da_fatura(self):
        self.comprar()
        resposta = self.client.get('/api/dashboard/?mes=2026-11')
        self.assertEqual(resposta.data['despesas'], '33.34')
