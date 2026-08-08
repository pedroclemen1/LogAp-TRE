# Arquitetura do backend

## Organização

O código usa pacotes por funcionalidade (`trip`, `manifest`, `maintenance`,
`vehicle`, `auth`) em vez de pacotes globais de controller/service/repository.
Controller traduz HTTP, service coordena casos de uso, entidade protege estado
e repository concentra persistência. DTOs não são entidades JPA.

`allocation` é um coordenador de aplicação porque uma reserva de veículo cruza
viagens, manutenções e frota. Mantê-lo dentro de `vehicle` fazia o módulo de
frota conhecer repositories de dois outros módulos, embora a regra não fosse
apenas cadastral.

O catálogo de tipos de serviço vive em `maintenance.catalog`: ele pertence ao
domínio de manutenção, mas possui ciclo de cadastro próprio e não deve ser
confundido com o caso de uso `maintenance.MaintenanceService`, que gerencia as
ordens executadas pela frota.

## Serviços maiores

Os dois fluxos que concentravam responsabilidades foram divididos sem alterar a
API:

- `TripService` continua como fachada transacional; `TripRouteService` cuida da
  validação, reconciliação e progressão ordenada dos trechos;
- `ManifestService` é a fachada; `ManifestQueryService` concentra leitura e
  carregamentos em lote, enquanto `ManifestCommandService` concentra emissão e
  correção.

As fachadas preservam uma entrada estável para controllers e testes. A divisão
foi feita por caso de uso, não por helpers genéricos que esconderiam regras de
domínio.

## Persistência e consultas

Flyway é o único responsável pelo schema; Hibernate usa `ddl-auto=validate`.
`open-in-view=false` impede que serialização HTTP dispare consultas fora do
caso de uso. Páginas com associações usam entity graphs, fetch join ou segunda
consulta em lote. Os limites automatizados estão descritos em
`auditoria-n-plus-one.md`.

Locks pessimistas serializam alocação do mesmo veículo. Advisory locks do
PostgreSQL protegem recursos que ainda não possuem uma linha para bloquear,
como o primeiro gestor e um novo convite por e-mail.

As antigas tabelas de abastecimentos e despesas foram removidas antes do
primeiro deploy compartilhado junto com a página de relatórios, pois nenhum
caso de uso restante as lia ou escrevia. Se esse domínio voltar ao produto, ele
deve nascer em uma migration nova e com endpoints próprios, não como schema
especulativo.

## Fronteiras de segurança

Autenticação JWT é tratada pelos filtros; autorização administrativa usa method
security no ponto de entrada do caso de uso. A role é recarregada do banco a
cada requisição. Bootstrap e convites permanecem no módulo `auth`, e credenciais
temporárias nunca são persistidas em texto puro.

As anotações de RBAC estão nos controllers administrativos, que são a única
borda de entrada atual. Se listeners, jobs ou outro adaptador passarem a chamar
esses casos de uso, a política deve migrar para uma fachada de aplicação ou ser
repetida explicitamente na nova borda; não se deve assumir que o service está
protegido por si só.

## Integridade do romaneio

O campo histórico `autenticacao` expõe um checksum SHA-256 truncado do conteúdo
canônico do romaneio. Ele detecta alterações e erros acidentais, mas não é uma
assinatura digital nem prova autoria contra alguém capaz de recalcular o hash.
Por isso o colaborador se chama `ManifestIntegrityCodeGenerator`. Caso surja a
exigência de autenticidade criptográfica, a evolução deve usar HMAC com segredo
próprio e versão de chave, ou assinatura assimétrica; o segredo JWT não deve ser
reutilizado.
