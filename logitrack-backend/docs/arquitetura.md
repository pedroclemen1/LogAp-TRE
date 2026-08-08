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
[`decisoes-tecnicas.md`](decisoes-tecnicas.md).

Locks pessimistas serializam alocação do mesmo veículo. Advisory locks do
PostgreSQL protegem recursos que ainda não possuem uma linha para bloquear,
como o primeiro gestor e um novo convite por e-mail.

O schema contém apenas tabelas que um caso de uso lê ou escreve. Combustível e
despesas operacionais não fazem parte do escopo e, por isso, não têm tabela: se
esse domínio entrar no produto, nasce em uma migration própria, com entidade e
endpoints, e não como estrutura especulativa que o `validate` do Hibernate nem
verificaria.

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

## Decisão de arquitetura: vertical slice com costuras hexagonais

### Contexto

O código está organizado em **vertical slice**: um pacote por domínio, cada um fechado com
controller, service, repository, entity e `dto/`. As entidades são **ricas** —
`Trip.iniciar()/concluir()/cancelar()`, `Maintenance.iniciar()/concluir()` — e não sacos de getters.

A alternativa considerada era adotar hexagonal (ports & adapters) ou MVC por camada técnica. O
critério de decisão foi testabilidade: quais mudanças permitiriam testar regra de negócio sem subir
Spring nem banco.

O diagnóstico mostrou que a organização dos pacotes não era o obstáculo. Três detalhes de
infraestrutura acoplavam o domínio ao ambiente:

1. **Chamadas diretas ao relógio do sistema**, sem `Clock` injetado — inclusive `LocalDate.now()`
   dentro do DTO `MaintenanceResponse`, derivando se a manutenção estava atrasada. Qualquer teste de
   viagem, manutenção ou dashboard dependia do dia em que rodasse.
2. **`SecurityContextHolder` estático** dentro de `TripService`, exigindo contexto Spring em toda
   mutação de viagem apenas para saber quem assinou o evento.
3. **Guardas de estado fora das entidades**: as validações de transição viviam no serviço, e a
   entidade aceitava a mudança em qualquer estado.

### Opções avaliadas

#### Hexagonal completa

Domínio sem Spring nem JPA, portas de entrada e saída, adaptadores, mapeamento em cada fronteira.

Custo: para 7 domínios, aproximadamente **dobra a contagem de arquivos** e adiciona tradução por
operação. Benefício: hexagonal se paga com adaptadores intercambiáveis, múltiplos consumidores ou
integrações externas a isolar. Aqui há **um** banco, **um** mecanismo de entrega (REST) e nenhuma
integração externa. O ganho de testabilidade viria das três costuras acima — que custam uma fração.

**Rejeitada:** cerimônia sem contrapartida nesta escala.

#### MVC padrão por camada técnica

`controllers/`, `services/`, `repositories/`, `models/` agrupados por tipo.

Trocaria coesão por domínio por coesão por tipo, espalhando a lógica de viagem por quatro pacotes. E
vem historicamente acompanhado de entidade anêmica — exatamente o que o projeto já tinha evitado.

**Rejeitada:** custo de migração alto, perda de coesão, nenhum problema atual resolvido.

#### Vertical slice + costuras hexagonais pontuais

Preserva estrutura por domínio e entidades ricas. Importa da hexagonal só o princípio que paga
aqui: empurrar infraestrutura para fora do núcleo de decisão, nos pontos exatos onde ela impedia
teste determinístico.

**Aceita.**

### Decisão

Manter o vertical slice e fechar as três costuras:

| Costura | Implementação |
|---|---|
| Relógio | `config/TimeConfig` expõe `Clock` como bean e nenhuma regra chama `now()` direto. `Maintenance.estaAtrasada(LocalDate)` recebe o dia por parâmetro, mantendo a derivação no domínio e fora do DTO. |
| Autor da auditoria | Porta `shared/CurrentUserProvider`, implementada por `auth/SecurityContextCurrentUserProvider`. |
| Guardas de estado | Vivem em `Trip` e `Maintenance`, junto do estado que protegem. |

#### Validar e aplicar separados

`Trip` e `Maintenance` expõem `validarPodeIniciar()` e `validarPodeAlterar()` além dos métodos que
mutam. A aparente duplicação é proposital.

O serviço precisa tomar o lock pessimista do veículo e consultar alocação **entre** a checagem de
estado e a mutação. Se chamasse apenas `iniciar()`, o erro de alocação apareceria antes do erro de
estado, invertendo a precedência desejada: o erro de estado é mais específico para quem está na tela
e deve vencer. Por isso o serviço valida primeiro, e o método que muta revalida — a entidade nunca
aceita transição inválida, mesmo que um chamador futuro esqueça o primeiro passo.

#### Restrição sobre as mensagens de erro

O frontend traduz erros da API por duas vias: o campo estável `code` do `ApiError`, usado nos fluxos
mais recentes, e o casamento exato da mensagem em português, herdado dos fluxos anteriores. Hoje são
9 códigos e 90 mensagens literais em `shared/api/api-error-localization.ts`.

Consequência prática: **alterar o texto de uma mensagem ainda quebra a tradução em silêncio.**
Enquanto a migração para `code` não estiver completa, toda regra nova deve receber um código
específico, e mudanças de texto precisam acompanhar o catálogo do frontend.

### Consequências

As regras de transição passaram a ser testáveis com `new Trip(...)` e `assertThrows`, sem Spring e
sem banco. Derivações que dependem de "hoje" ficaram determinísticas com `Clock.fixed`.

O custo é modesto e visível: dois métodos públicos onde haveria um nas transições com lock, e o
`Clock` no construtor de quatro serviços.

#### Limitação conhecida

`TripService` e `MaintenanceService` traduzem `DataIntegrityViolationException` em erro de negócio
comparando o **nome da constraint como texto** (`uk_viagens_em_andamento_motorista`,
`uk_manutencoes_em_realizacao_veiculo`). Uma migration que renomeie a constraint transformaria o erro
amigável em HTTP 500, sem aviso em tempo de compilação.

A proteção atual é o teste de concorrência, que exercita exatamente esse caminho e falharia se a
tradução parasse de funcionar. Uma solução mais robusta seria consultar o catálogo do PostgreSQL ou
mapear o código de erro `23505` com verificação da coluna afetada.

### Quando reabrir

- Um segundo consumidor da API além do frontend Next.
- Integração externa a isolar (gateway de pagamento, telemetria de veículo, roteirizador).
- Necessidade real de trocar o mecanismo de persistência.

Nenhum desses existe hoje.
