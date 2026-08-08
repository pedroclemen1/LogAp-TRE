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

## Decisão de arquitetura: vertical slice com costuras hexagonais

**Data:** 2026-08-07
**Status:** aceito
**Contexto do plano:** `docs/PLANO-BACKEND.md`, Parte A

### Contexto

O backend tem 86 arquivos Java e 4.692 linhas, organizados em **vertical slice**: um pacote por
domínio (`auth`, `vehicle`, `trip`, `maintenance`, `maintenanceservice`, `driver`, `dashboard`),
cada um fechado com controller, service, repository, entity e `dto/`. As entidades já eram **ricas**
— `Trip.iniciar()/concluir()/cancelar()`, `Maintenance.iniciar()/concluir()` — e não meros sacos de
getters.

Ao planejar a suíte de testes (o projeto tinha **zero**), surgiu a pergunta: migrar para hexagonal
(ports & adapters) ou para MVC padrão por camada técnica?

O diagnóstico mostrou que a arquitetura não era o obstáculo. Três detalhes de infraestrutura tinham
vazado para dentro do domínio, e eram esses que travavam o teste:

1. **12 chamadas diretas ao relógio do sistema**, nenhum `Clock` injetado — incluindo
   `LocalDate.now()` **dentro do DTO** `MaintenanceResponse`, derivando se a manutenção estava
   atrasada. Qualquer teste de viagem, manutenção ou dashboard dependia do dia em que rodasse.
2. **`SecurityContextHolder` estático** dentro de `TripService.currentAuthor()`, obrigando contexto
   Spring em toda mutação de viagem só para saber quem assinou o evento.
3. **Guardas de estado fora das entidades**: `TripService.start()` tinha cinco validações antes de
   chamar `trip.iniciar()`. A entidade aceitava a transição em qualquer estado.

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
| Relógio | `config/TimeConfig` expõe `Clock` como bean; as 12 chamadas passaram a `now(clock)`. `Maintenance.estaAtrasada(LocalDate)` recebe o dia por parâmetro e a regra saiu do DTO. |
| Autor da auditoria | Porta `shared/CurrentUserProvider`, implementada por `auth/SecurityContextCurrentUserProvider`. |
| Guardas de estado | Movidas para `Trip` e `Maintenance`, com mensagens de erro preservadas byte a byte. |

#### Validar e aplicar separados

`Trip` e `Maintenance` expõem `validarPodeIniciar()`/`validarPodeAlterar()` além dos métodos que
mutam. Não é redundância acidental.

Os serviços precisam tomar o lock pessimista do veículo e consultar alocação **entre** a checagem de
estado e a mutação. Se o serviço só chamasse `iniciar()`, o erro de alocação passaria a aparecer
antes do erro de estado — invertendo a precedência atual, em que o erro de estado (mais específico
para quem está na tela) vence. O serviço chama `validarPodeIniciar()` na posição onde as guardas
ficavam, e o método que muta revalida para que a entidade nunca aceite transição inválida, mesmo se
um chamador futuro esquecer o primeiro passo.

#### Restrição que atravessa tudo

**As mensagens de erro não podem mudar de texto.** O frontend traduz erros da API casando **82
strings em português literal** (`shared/api/api-error-localization.ts`). Alterar uma mensagem aqui
quebra a i18n do front em silêncio. Ver `docs/PLANO-CORRECOES.md`, T1 — inclusive a recomendação de
substituir esse acoplamento por um campo `code` estável no `ApiError`.

### Consequências

**Positivas.** As regras de transição viraram testáveis com `new Trip(...)` e `assertThrows`, sem
Spring e sem banco. Derivações que dependem de "hoje" ficaram determinísticas com `Clock.fixed`. A
regra de atraso saiu de um objeto de serialização e voltou para o domínio.

**Negativas.** Dois métodos públicos onde havia um, nas transições com lock — mitigado por
comentário na entidade explicando o par. O `Clock` aparece no construtor de quatro serviços.

**Aceito como dívida.** `TripService.flushAllocation()` e `MaintenanceService.start()` traduzem
`DataIntegrityViolationException` casando o **nome da constraint por string**
(`uk_viagens_em_andamento_motorista`, `uk_manutencoes_em_realizacao_veiculo`). Uma migration que
renomeie a constraint transforma o erro amigável em HTTP 500 sem aviso. Não foi alterado nesta
rodada; a proteção é o teste de concorrência (Parte B, B3.2), que exercita exatamente esse caminho.

### Quando reabrir

- Um segundo consumidor da API além do frontend Next.
- Integração externa a isolar (gateway de pagamento, telemetria de veículo, roteirizador).
- Necessidade real de trocar o mecanismo de persistência.

Nenhum desses existe hoje.
