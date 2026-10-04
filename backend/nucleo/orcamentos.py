from .models import Orcamento


def vigentes(usuario, mes):
    """Para cada categoria, o limite com o início mais recente até `mes` (inclusive)."""
    # DISTINCT ON do PostgreSQL: uma linha por categoria, a primeira na ordem pedida
    return (
        Orcamento.objects.filter(usuario=usuario, inicio__lte=mes.primeiro_dia())
        .order_by('categoria_id', '-inicio')
        .distinct('categoria_id')
        .select_related('categoria')
    )
