from decimal import Decimal

from django.db.models import Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth

from . import orcamentos, recorrencias
from .models import DINHEIRO, Categoria, Conta, Transacao

ZERO = Decimal('0.00')


def texto(valor):
    # O JSONRenderer do DRF converteria Decimal em float; dinheiro sai sempre como texto
    return str(Decimal(valor).quantize(Decimal('0.01')))


def soma(filtro=None):
    return Coalesce(Sum('valor', filter=filtro), Value(ZERO), output_field=DINHEIRO)


def transacoes_do_periodo(usuario, inicio, fim_exclusivo):
    # Só receita e despesa: transferência move dinheiro entre contas, não é ganho nem gasto
    return Transacao.objects.filter(
        usuario=usuario,
        data__gte=inicio,
        data__lt=fim_exclusivo,
        tipo__in=[Transacao.Tipo.RECEITA, Transacao.Tipo.DESPESA],
    )


def totais_do_mes(usuario, mes):
    totais = transacoes_do_periodo(usuario, mes.primeiro_dia(), mes.fim_exclusivo()).aggregate(
        receitas=soma(Q(tipo=Transacao.Tipo.RECEITA)),
        despesas=soma(Q(tipo=Transacao.Tipo.DESPESA)),
    )
    totais['resultado'] = totais['receitas'] - totais['despesas']
    return totais


def previsto_do_mes(usuario, mes):
    # Só receita e despesa, como nos totais: transferência prevista não é ganho nem gasto
    return recorrencias.previstas(usuario, mes).aggregate(
        receitas=soma(Q(tipo=Transacao.Tipo.RECEITA)),
        despesas=soma(Q(tipo=Transacao.Tipo.DESPESA)),
    )


def percentual(parte, todo):
    if not todo:
        return None
    return str((parte * 100 / todo).quantize(Decimal('0.1')))


def orcamentos_do_mes(usuario, mes):
    # Três consultas fixas, qualquer que seja o número de categorias: limites, gastos e previstos
    limites = list(orcamentos.vigentes(usuario, mes))
    ids = [limite.categoria_id for limite in limites]

    gastos = dict(
        transacoes_do_periodo(usuario, mes.primeiro_dia(), mes.fim_exclusivo())
        .filter(tipo=Transacao.Tipo.DESPESA, categoria_id__in=ids)
        .values('categoria_id')
        .annotate(total=soma())
        .order_by()
        .values_list('categoria_id', 'total')
    )
    previstos = dict(
        recorrencias.previstas(usuario, mes)
        .filter(tipo=Transacao.Tipo.DESPESA, categoria_id__in=ids)
        .values('categoria_id')
        .annotate(total=soma())
        .order_by()
        .values_list('categoria_id', 'total')
    )

    def linha(limite, gasto, previsto):
        # percentual = quanto do limite já está comprometido; passa de 100 quando estoura
        return {
            'limite': texto(limite),
            'gasto': texto(gasto),
            'previsto': texto(previsto),
            'restante': texto(limite - gasto - previsto),
            'percentual': percentual(gasto + previsto, limite),
        }

    categorias = []
    for orcamento in sorted(limites, key=lambda o: o.categoria.nome):
        gasto = gastos.get(orcamento.categoria_id, ZERO)
        previsto = previstos.get(orcamento.categoria_id, ZERO)
        categorias.append({
            'categoria_id': orcamento.categoria_id,
            'categoria': orcamento.categoria.nome,
            **linha(orcamento.valor, gasto, previsto),
        })

    total = linha(
        sum((o.valor for o in limites), ZERO),
        sum(gastos.values(), ZERO),
        sum(previstos.values(), ZERO),
    )
    return {'categorias': categorias, 'total': total}


def saldo_total(usuario, ate):
    contas = Conta.objects.filter(usuario=usuario).com_saldo(ate=ate)
    return contas.aggregate(total=Coalesce(Sum('saldo'), Value(ZERO), output_field=DINHEIRO))['total']


def gastos_por_categoria(usuario, mes, total_despesas):
    grupos = (
        transacoes_do_periodo(usuario, mes.primeiro_dia(), mes.fim_exclusivo())
        .filter(tipo=Transacao.Tipo.DESPESA)
        .values('categoria_id', 'categoria__nome', 'categoria__tipo')
        .annotate(total=soma())
        .order_by('-total', 'categoria__nome')
    )
    return [
        {
            'categoria_id': grupo['categoria_id'],
            'categoria': grupo['categoria__nome'],
            'tipo': grupo['categoria__tipo'],
            'total': texto(grupo['total']),
            'percentual': str((grupo['total'] * 100 / total_despesas).quantize(Decimal('0.1'))),
        }
        for grupo in grupos
    ]


def fixo_e_variavel(usuario, mes):
    grupos = (
        transacoes_do_periodo(usuario, mes.primeiro_dia(), mes.fim_exclusivo())
        .filter(tipo=Transacao.Tipo.DESPESA)
        .values('categoria__tipo')
        .annotate(total=soma())
        .order_by()
    )
    totais = {tipo: ZERO for tipo in Categoria.Tipo.values}
    totais.update({grupo['categoria__tipo']: grupo['total'] for grupo in grupos})
    return {tipo: texto(total) for tipo, total in totais.items()}


def resumo_do_mes(usuario, mes):
    atual = totais_do_mes(usuario, mes)
    anterior = totais_do_mes(usuario, mes.anterior())
    previsto = previsto_do_mes(usuario, mes)
    return {
        'mes': str(mes),
        'receitas': texto(atual['receitas']),
        'despesas': texto(atual['despesas']),
        'resultado': texto(atual['resultado']),
        'saldo_total': texto(saldo_total(usuario, ate=mes.ultimo_dia())),
        'gastos_por_categoria': gastos_por_categoria(usuario, mes, atual['despesas']),
        'fixo_variavel': fixo_e_variavel(usuario, mes),
        'mes_anterior': {
            'mes': str(mes.anterior()),
            'receitas': texto(anterior['receitas']),
            'despesas': texto(anterior['despesas']),
            'resultado': texto(anterior['resultado']),
        },
        # Diferença em reais; percentual não existe quando o mês anterior é zero
        'variacao': {
            campo: texto(atual[campo] - anterior[campo])
            for campo in ['receitas', 'despesas', 'resultado']
        },
        # Recorrências ainda não confirmadas; receitas e despesas acima ficam só com o que aconteceu
        'previsto': {
            'receitas': texto(previsto['receitas']),
            'despesas': texto(previsto['despesas']),
            'resultado_projetado': texto(
                atual['resultado'] + previsto['receitas'] - previsto['despesas']
            ),
        },
        'orcamentos': orcamentos_do_mes(usuario, mes),
    }


def evolucao(usuario, ultimo_mes, quantidade):
    meses = [ultimo_mes.somar(-deslocamento) for deslocamento in reversed(range(quantidade))]
    grupos = (
        transacoes_do_periodo(usuario, meses[0].primeiro_dia(), ultimo_mes.fim_exclusivo())
        .annotate(inicio_do_mes=TruncMonth('data'))
        .values('inicio_do_mes')
        .annotate(
            receitas=soma(Q(tipo=Transacao.Tipo.RECEITA)),
            despesas=soma(Q(tipo=Transacao.Tipo.DESPESA)),
        )
        .order_by()
    )
    por_mes = {grupo['inicio_do_mes']: grupo for grupo in grupos}

    serie = []
    for mes in meses:
        # Mês sem transações entra com zero para o gráfico não ter buracos
        grupo = por_mes.get(mes.primeiro_dia(), {'receitas': ZERO, 'despesas': ZERO})
        serie.append({
            'mes': str(mes),
            'receitas': texto(grupo['receitas']),
            'despesas': texto(grupo['despesas']),
            'resultado': texto(grupo['receitas'] - grupo['despesas']),
        })
    return {'meses': serie}
