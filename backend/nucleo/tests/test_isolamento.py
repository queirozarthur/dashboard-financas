from rest_framework import status
from rest_framework.test import APIClient

from nucleo.models import Conta, Transacao

from .base import BaseAPI


class TestesSemLogin(BaseAPI):
    def test_todas_as_rotas_exigem_login(self):
        anonimo = APIClient()
        for rota in ['/api/contas/', '/api/categorias/', '/api/transacoes/']:
            with self.subTest(rota=rota):
                self.assertEqual(anonimo.get(rota).status_code, status.HTTP_401_UNAUTHORIZED)


class TestesListagemSoDoUsuario(BaseAPI):
    def test_lista_so_as_contas_do_usuario(self):
        nomes = [c['nome'] for c in self.client.get('/api/contas/').data]
        self.assertCountEqual(nomes, ['Corrente', 'Carteira'])

    def test_lista_so_as_categorias_do_usuario(self):
        nomes = [c['nome'] for c in self.client.get('/api/categorias/').data]
        self.assertCountEqual(nomes, ['Salário', 'Mercado'])

    def test_lista_so_as_transacoes_do_usuario(self):
        minha = self.criar_despesa('10.00')
        self.criar_despesa('99.00', conta=self.conta_da_bia, usuario=self.bia, categoria=self.categoria_da_bia)
        ids = [t['id'] for t in self.client.get('/api/transacoes/').data['results']]
        self.assertEqual(ids, [minha.id])


class TestesObjetoDeOutroUsuario(BaseAPI):
    """Ler, editar ou apagar o objeto de outro usuário responde 404, como se não existisse."""

    def setUp(self):
        super().setUp()
        transacao_da_bia = self.criar_despesa(
            '99.00', conta=self.conta_da_bia, usuario=self.bia, categoria=self.categoria_da_bia
        )
        self.rotas_da_bia = [
            f'/api/contas/{self.conta_da_bia.id}/',
            f'/api/categorias/{self.categoria_da_bia.id}/',
            f'/api/transacoes/{transacao_da_bia.id}/',
        ]

    def test_ler_responde_404(self):
        for rota in self.rotas_da_bia:
            with self.subTest(rota=rota):
                self.assertEqual(self.client.get(rota).status_code, status.HTTP_404_NOT_FOUND)

    def test_editar_responde_404(self):
        for rota in self.rotas_da_bia:
            with self.subTest(rota=rota):
                resposta = self.client.patch(rota, {'nome': 'invadido', 'descricao': 'invadido'})
                self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)

    def test_apagar_responde_404_e_nao_apaga(self):
        for rota in self.rotas_da_bia:
            with self.subTest(rota=rota):
                self.assertEqual(self.client.delete(rota).status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Conta.objects.filter(pk=self.conta_da_bia.pk).exists())
        self.assertEqual(Transacao.objects.filter(usuario=self.bia).count(), 1)


class TestesDonoDefinidoNoServidor(BaseAPI):
    def test_usuario_enviado_pelo_cliente_e_ignorado(self):
        resposta = self.client.post(
            '/api/contas/', {'nome': 'Poupança', 'tipo': 'corrente', 'usuario': self.bia.id}
        )
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conta.objects.get(pk=resposta.data['id']).usuario, self.ana)


class TestesTransacaoComDadosDeOutroUsuario(BaseAPI):
    def postar(self, **campos):
        dados = {'tipo': 'despesa', 'valor': '10.00', 'data': '2026-10-05',
                 'conta': self.corrente.id, 'categoria': self.mercado.id}
        dados.update(campos)
        return self.client.post('/api/transacoes/', dados)

    def test_conta_de_outro_usuario_e_recusada(self):
        resposta = self.postar(conta=self.conta_da_bia.id)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('conta', resposta.data)

    def test_conta_destino_de_outro_usuario_e_recusada(self):
        resposta = self.postar(tipo='transferencia', categoria='', conta_destino=self.conta_da_bia.id)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('conta_destino', resposta.data)

    def test_categoria_de_outro_usuario_e_recusada(self):
        resposta = self.postar(categoria=self.categoria_da_bia.id)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('categoria', resposta.data)

    def test_nao_da_para_mover_transacao_para_conta_de_outro_usuario(self):
        transacao = self.criar_despesa('10.00')
        resposta = self.client.patch(f'/api/transacoes/{transacao.id}/', {'conta': self.conta_da_bia.id})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        transacao.refresh_from_db()
        self.assertEqual(transacao.conta, self.corrente)
