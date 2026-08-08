# Auditoria de consultas N+1

## Critério

Uma consulta N+1 acontece quando a quantidade de SQL cresce junto com a
quantidade de linhas retornadas, normalmente pela inicialização repetida de uma
associação `LAZY`.

A revisão combinou inspeção dos relacionamentos JPA com testes de orçamento de
consultas usando `Hibernate Statistics`. Os testes criam cinco registros,
consultam uma página com três itens e falham se o Hibernate fizer uma consulta
adicional por linha.

## Fluxos revisados

| Fluxo | Estratégia | Limite de statements |
|---|---|---:|
| Lista de viagens | página com `veiculo`/`motorista` via `JOIN FETCH` + cidades em lote | 3 |
| Candidatos a romaneio | página de viagens + trechos em lote + IDs de romaneio em lote | 4 |
| Lista de manutenções | página de IDs + `EntityGraph` para veículo, itens e catálogo | 3 |
| Lista simples de veículos | IDs em uso, IDs em manutenção e veículos | 3 |
| Lista de motoristas | IDs em uso e motoristas | 2 |
| Romaneios emitidos | página de IDs + documento/itens em lote | 3 |
| Detalhe da viagem | viagem, trechos e eventos | 3 |
| Dashboard | consultas agregadas fixas; não percorre entidades JPA | quantidade constante |

O `count` da paginação está incluído nos limites. Em páginas finais o Spring
pode omiti-lo, então os testes usam mais registros que o tamanho da página.

## Problema corrigido

A criação e a edição de uma manutenção chamavam `findById` uma vez para cada
serviço solicitado. O catálogo agora recebe todos os IDs e executa um único
`findAllById`, validando em memória serviços ausentes ou inativos. Inserts dos
itens continuam naturalmente proporcionais à quantidade gravada; o problema
eliminado foi a multiplicação de `SELECT`s.

## Proteção contra regressão

Os limites estão em `NPlusOneQueryIT`. Um novo campo de DTO que atravesse uma
associação não carregada fará o número de statements ultrapassar o orçamento e
quebrará a suíte antes de chegar à produção.
