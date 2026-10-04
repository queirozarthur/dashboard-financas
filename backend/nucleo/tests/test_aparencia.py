from datetime import date
from decimal import Decimal
from importlib import import_module

from django.apps import apps as apps_atuais
from rest_framework import status

from nucleo.aparencia import Cor, Icone, proxima_cor
from nucleo.models import Categoria, Conta, Orcamento

from .base import BaseAPI


class TestesCorAutomatica(BaseAPI):
    """A base já cria, para a Ana: Corrente, Carteira (contas) e Salário, Mercado (categorias)."""

    def test_paleta_segue_a_ordem_e_volta_ao_inicio(self):
        self.assertEqual([proxima_cor(n) for n in range(3)], ['azul', 'laranja', 'turquesa'])
        self.assertEqual(proxima_cor(8), 'azul')

    def test_contas_recebem_as_cores_em_ordem(self):
        self.assertEqual(self.corrente.cor, Cor.AZUL)
        self.assertEqual(self.carteira.cor, Cor.LARANJA)
        nova = self.criar_conta(self.ana, 'Poupança')
        self.assertEqual(nova.cor, Cor.TURQUESA)

    def test_cada_usuario_tem_a_propria_sequencia(self):
        self.assertEqual(self.conta_da_bia.cor, Cor.AZUL)

    def test_icone_da_conta_vem_do_tipo(self):
        self.assertEqual(self.corrente.icone, Icone.BANCO)
        self.assertEqual(self.carteira.icone, Icone.CARTEIRA)
        cartao = Conta.objects.create(
            usuario=self.ana, nome='Nubank', tipo=Conta.Tipo.CARTAO, dia_fechamento=25, dia_vencimento=5
        )
        self.assertEqual(cartao.icone, Icone.CARTAO)

    def test_categoria_nova_recebe_etiqueta_e_proxima_cor(self):
        self.assertEqual(self.salario.icone, Icone.ETIQUETA)
        self.assertEqual(self.mercado.cor, Cor.LARANJA)

    def test_cor_e_icone_escolhidos_sao_mantidos(self):
        categoria = Categoria.objects.create(
            usuario=self.ana, nome='Pet', natureza='despesa', tipo='variavel',
            cor=Cor.VIOLETA, icone=Icone.PET,
        )
        categoria.refresh_from_db()
        self.assertEqual((categoria.cor, categoria.icone), (Cor.VIOLETA, Icone.PET))

    def test_editar_nao_troca_a_cor(self):
        self.corrente.nome = 'Conta corrente'
        self.corrente.save()
        self.corrente.refresh_from_db()
        self.assertEqual(self.corrente.cor, Cor.AZUL)


class TestesCorPelaAPI(BaseAPI):
    def test_criar_sem_cor_ganha_a_automatica(self):
        resposta = self.client.post('/api/categorias/', {'nome': 'Pet', 'natureza': 'despesa', 'tipo': 'variavel'})
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual(resposta.data['cor'], Cor.TURQUESA)
        self.assertEqual(resposta.data['icone'], Icone.ETIQUETA)

    def test_escolher_cor_e_icone(self):
        resposta = self.client.post(
            '/api/contas/',
            {'nome': 'Poupança', 'tipo': 'corrente', 'cor': 'verde', 'icone': 'cofrinho'},
        )
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        self.assertEqual((resposta.data['cor'], resposta.data['icone']), ('verde', 'cofrinho'))

    def test_trocar_a_cor_depois(self):
        resposta = self.client.patch(f'/api/categorias/{self.mercado.id}/', {'cor': 'vermelho'})
        self.assertEqual(resposta.data['cor'], 'vermelho')

    def test_cor_e_icone_fora_da_lista_sao_recusados(self):
        resposta = self.client.post(
            '/api/categorias/',
            {'nome': 'X', 'natureza': 'despesa', 'tipo': 'fixo', 'cor': 'dourado', 'icone': 'foguete'},
        )
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cor', resposta.data)
        self.assertIn('icone', resposta.data)

    def test_transacao_traz_a_cor_e_o_icone_da_categoria(self):
        self.criar_despesa('10.00')
        transacao = self.client.get('/api/transacoes/').data['results'][0]
        self.assertEqual((transacao['categoria_cor'], transacao['categoria_icone']), ('laranja', 'etiqueta'))

    def test_transferencia_vem_sem_cor_de_categoria(self):
        self.criar_transferencia('10.00', self.corrente, self.carteira)
        transacao = self.client.get('/api/transacoes/').data['results'][0]
        self.assertIsNone(transacao['categoria_cor'])

    def test_dashboard_traz_as_cores_das_categorias(self):
        self.criar_despesa('10.00', data=date(2026, 10, 5))
        Orcamento.objects.create(
            usuario=self.ana, categoria=self.mercado, valor=Decimal('100.00'), inicio=date(2026, 1, 1)
        )
        dados = self.client.get('/api/dashboard/?mes=2026-10').data
        self.assertEqual(dados['gastos_por_categoria'][0]['cor'], 'laranja')
        self.assertEqual(dados['orcamentos']['categorias'][0]['icone'], 'etiqueta')


class TestesMigrationDeCores(BaseAPI):
    def test_preenche_cadastros_antigos_em_ordem_por_usuario(self):
        # Simula cadastros de antes da migration: cor e ícone vazios
        Conta.objects.update(cor='', icone='')
        Categoria.objects.update(cor='', icone='')

        migration = import_module('nucleo.migrations.0006_cor_e_icone')
        migration.preencher_cadastros_existentes(apps_atuais, None)

        self.corrente.refresh_from_db()
        self.carteira.refresh_from_db()
        self.conta_da_bia.refresh_from_db()
        self.mercado.refresh_from_db()
        self.assertEqual((self.corrente.cor, self.corrente.icone), ('azul', 'banco'))
        self.assertEqual((self.carteira.cor, self.carteira.icone), ('laranja', 'carteira'))
        self.assertEqual(self.conta_da_bia.cor, 'azul')
        self.assertEqual((self.mercado.cor, self.mercado.icone), ('laranja', 'etiqueta'))
