from rest_framework import status

from nucleo.models import Transacao

from .base import BaseAPI


class TestesValidacaoTransacao(BaseAPI):
    def postar(self, **campos):
        dados = {'tipo': 'despesa', 'valor': '10.00', 'data': '2026-10-05',
                 'conta': self.corrente.id, 'categoria': self.mercado.id}
        dados.update(campos)
        # Campos com None não são enviados, como um formulário que não preencheu o campo
        return self.client.post(
            '/api/transacoes/', {k: v for k, v in dados.items() if v is not None}, format='json'
        )

    def assert_recusa(self, campo_com_erro, **campos):
        resposta = self.postar(**campos)
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST, resposta.data)
        self.assertIn(campo_com_erro, resposta.data)
        self.assertEqual(Transacao.objects.count(), 0)

    def test_receita_valida_e_criada(self):
        resposta = self.postar(tipo='receita', categoria=self.salario.id)
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)

    def test_despesa_valida_e_criada(self):
        resposta = self.postar()
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)

    def test_transferencia_valida_e_criada(self):
        resposta = self.postar(tipo='transferencia', categoria=None, conta_destino=self.carteira.id)
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)

    def test_valor_vem_como_texto_com_duas_casas(self):
        resposta = self.postar(valor='10.5')
        self.assertEqual(resposta.data['valor'], '10.50')

    def test_valor_zero_e_recusado(self):
        self.assert_recusa('valor', valor='0')

    def test_valor_negativo_e_recusado(self):
        self.assert_recusa('valor', valor='-5.00')

    def test_receita_sem_categoria_e_recusada(self):
        self.assert_recusa('categoria', tipo='receita', categoria=None)

    def test_despesa_sem_categoria_e_recusada(self):
        self.assert_recusa('categoria', categoria=None)

    def test_despesa_com_conta_destino_e_recusada(self):
        self.assert_recusa('conta_destino', conta_destino=self.carteira.id)

    def test_transferencia_sem_conta_destino_e_recusada(self):
        self.assert_recusa('conta_destino', tipo='transferencia', categoria=None)

    def test_transferencia_para_a_mesma_conta_e_recusada(self):
        self.assert_recusa(
            'conta_destino', tipo='transferencia', categoria=None, conta_destino=self.corrente.id
        )

    def test_transferencia_com_categoria_e_recusada(self):
        self.assert_recusa('categoria', tipo='transferencia', conta_destino=self.carteira.id)

    def test_despesa_com_categoria_de_receita_e_recusada(self):
        self.assert_recusa('categoria', categoria=self.salario.id)

    def test_receita_com_categoria_de_despesa_e_recusada(self):
        self.assert_recusa('categoria', tipo='receita', categoria=self.mercado.id)


class TestesEdicaoParcialTransacao(BaseAPI):
    """No PATCH as regras valem para o resultado final, misturando o que chegou com o que já estava salvo."""

    def setUp(self):
        super().setUp()
        self.despesa = self.criar_despesa('10.00')
        self.rota = f'/api/transacoes/{self.despesa.id}/'

    def test_mudar_so_o_valor_funciona(self):
        resposta = self.client.patch(self.rota, {'valor': '20.00'})
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)

    def test_virar_receita_mantendo_categoria_de_despesa_e_recusado(self):
        resposta = self.client.patch(self.rota, {'tipo': 'receita'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('categoria', resposta.data)

    def test_virar_transferencia_sem_conta_destino_e_recusado(self):
        resposta = self.client.patch(self.rota, {'tipo': 'transferencia', 'categoria': None}, format='json')
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('conta_destino', resposta.data)

    def test_virar_transferencia_completa_funciona(self):
        resposta = self.client.patch(
            self.rota,
            {'tipo': 'transferencia', 'categoria': None, 'conta_destino': self.carteira.id},
            format='json',
        )
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)

    def test_valor_zero_no_patch_e_recusado(self):
        resposta = self.client.patch(self.rota, {'valor': '0'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)


class TestesValidacaoConta(BaseAPI):
    def test_nome_repetido_e_recusado(self):
        resposta = self.client.post('/api/contas/', {'nome': 'Corrente', 'tipo': 'corrente'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nome', resposta.data)

    def test_nome_de_conta_de_outro_usuario_pode_ser_usado(self):
        resposta = self.client.post('/api/contas/', {'nome': 'Conta da Bia', 'tipo': 'corrente'})
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)

    def test_editar_conta_mantendo_o_proprio_nome_funciona(self):
        resposta = self.client.put(
            f'/api/contas/{self.corrente.id}/',
            {'nome': 'Corrente', 'tipo': 'corrente', 'saldo_inicial': '500.00'},
        )
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)

    def test_apagar_conta_com_transacoes_responde_409(self):
        self.criar_despesa('10.00')
        resposta = self.client.delete(f'/api/contas/{self.corrente.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)

    def test_apagar_conta_sem_transacoes_funciona(self):
        resposta = self.client.delete(f'/api/contas/{self.carteira.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_204_NO_CONTENT)


class TestesValidacaoCategoria(BaseAPI):
    def test_nome_e_natureza_repetidos_sao_recusados(self):
        resposta = self.client.post(
            '/api/categorias/', {'nome': 'Mercado', 'natureza': 'despesa', 'tipo': 'fixo'}
        )
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nome', resposta.data)

    def test_mesmo_nome_com_outra_natureza_e_aceito(self):
        resposta = self.client.post(
            '/api/categorias/', {'nome': 'Mercado', 'natureza': 'receita', 'tipo': 'variavel'}
        )
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)

    def test_mudar_natureza_de_categoria_com_transacoes_e_recusado(self):
        self.criar_despesa('10.00')
        resposta = self.client.patch(f'/api/categorias/{self.mercado.id}/', {'natureza': 'receita'})
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('natureza', resposta.data)

    def test_mudar_natureza_de_categoria_sem_transacoes_funciona(self):
        resposta = self.client.patch(f'/api/categorias/{self.mercado.id}/', {'natureza': 'receita'})
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)

    def test_mudar_so_o_tipo_de_categoria_com_transacoes_funciona(self):
        self.criar_despesa('10.00')
        resposta = self.client.patch(f'/api/categorias/{self.mercado.id}/', {'tipo': 'fixo'})
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)

    def test_apagar_categoria_com_transacoes_responde_409(self):
        self.criar_despesa('10.00')
        resposta = self.client.delete(f'/api/categorias/{self.mercado.id}/')
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)
