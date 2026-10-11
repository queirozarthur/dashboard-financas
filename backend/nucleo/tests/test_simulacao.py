from datetime import date

from rest_framework import status

from nucleo.models import Compra, Transacao

from .test_faturas import BaseFaturas


class TestesSimulacaoDaCompra(BaseFaturas):
    """GET /api/compras/simulacao/: as parcelas que a compra geraria, sem gravar nada."""

    def simular(self, **mudancas):
        parametros = {
            'cartao': self.nubank.id,
            'valor_total': '100.00',
            'parcelas': 3,
            'data_compra': '2026-10-10',
            **mudancas,
        }
        return self.client.get('/api/compras/simulacao/', parametros)

    def test_mostra_valor_e_vencimento_de_cada_parcela(self):
        resposta = self.simular()
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)
        self.assertEqual(
            [(p['numero'], p['valor'], p['vencimento'], p['fatura_paga']) for p in resposta.data['parcelas']],
            [
                ('1/3', '33.34', '2026-11-05', False),
                ('2/3', '33.33', '2026-12-05', False),
                ('3/3', '33.33', '2027-01-05', False),
            ],
        )

    def test_nao_grava_nada(self):
        self.simular()
        self.assertFalse(Compra.objects.exists())
        self.assertFalse(Transacao.objects.exists())

    def test_compra_no_dia_do_fechamento_cai_na_fatura_seguinte(self):
        parcelas = self.simular(parcelas=1, data_compra='2026-10-25').data['parcelas']
        self.assertEqual(parcelas[0]['vencimento'], '2026-12-05')

    def test_marca_a_parcela_que_cairia_em_fatura_ja_paga(self):
        self.comprar()
        self.pagar()  # fatura que vence em 05/11
        parcelas = self.simular().data['parcelas']
        self.assertEqual([p['fatura_paga'] for p in parcelas], [True, False, False])

    def test_da_o_mesmo_resultado_que_a_compra(self):
        simuladas = self.simular(valor_total='250.00', parcelas=4).data['parcelas']
        resposta = self.client.post('/api/compras/', {
            'cartao': self.nubank.id, 'categoria': self.mercado.id,
            'valor_total': '250.00', 'parcelas': 4, 'data_compra': '2026-10-10',
        })
        geradas = resposta.data['parcelas_geradas']
        self.assertEqual(
            [(p['numero'], p['valor'], p['vencimento']) for p in simuladas],
            [(p['numero'], p['valor'], p['vencimento']) for p in geradas],
        )

    def test_mesmas_validacoes_da_compra(self):
        casos = [
            ({'cartao': self.corrente.id}, 'cartao'),
            ({'valor_total': '0'}, 'valor_total'),
            ({'parcelas': 0}, 'parcelas'),
            ({'parcelas': 49}, 'parcelas'),
            ({'data_compra': 'ontem'}, 'data_compra'),
        ]
        for mudanca, campo in casos:
            with self.subTest(mudanca=mudanca):
                resposta = self.simular(**mudanca)
                self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(campo, resposta.data)

    def test_campos_faltando_respondem_400(self):
        resposta = self.client.get('/api/compras/simulacao/')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            set(resposta.data), {'cartao', 'valor_total', 'parcelas', 'data_compra'}
        )

    def test_cartao_de_outro_usuario_e_recusado_como_inexistente(self):
        resposta = self.simular(cartao=self.cartao_da_bia.id)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cartao', resposta.data)

    def test_exige_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.simular().status_code, status.HTTP_401_UNAUTHORIZED)


class TestesCorDaCategoriaNoCartao(BaseFaturas):
    """A tela do cartão mostra o quadradinho colorido da categoria sem outra busca."""

    def setUp(self):
        super().setUp()
        self.mercado.cor = 'verde'
        self.mercado.icone = 'carrinho'
        self.mercado.save()

    def test_parcela_da_fatura_traz_cor_e_icone(self):
        self.comprar(data_compra=date(2026, 10, 10))
        parcela = self.client.get(self.rota()).data['parcelas'][0]
        self.assertEqual((parcela['categoria_cor'], parcela['categoria_icone']), ('verde', 'carrinho'))

    def test_compra_traz_cor_e_icone(self):
        compra = self.comprar()
        dados = self.client.get(f'/api/compras/{compra.id}/').data
        self.assertEqual((dados['categoria_cor'], dados['categoria_icone']), ('verde', 'carrinho'))
