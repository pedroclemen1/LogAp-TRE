# LogiTrack Pro

Sistema web de gestão de frota com dashboard analítico, desenvolvido como desafio técnico da LogAp.

Substitui o controle por planilhas isoladas por uma base única: cadastro de frota, operação de
viagens, agendamento de manutenções, emissão de romaneios e cinco indicadores extraídos por SQL.

O repositório reúne **dois serviços independentes**, cada um com seu Dockerfile, seu Compose, seu
ciclo de deploy e sua documentação:

| Serviço | Papel | Stack |
|---|---|---|
| [`logitrack-backend/`](logitrack-backend/) | API REST e regras de negócio | Java 21, Spring Boot 3.5, PostgreSQL 16, Flyway, JWT |
| [`logitrack-frontend/`](logitrack-frontend/) | Interface web e BFF | Next 16, React 19, TypeScript, Tailwind 4, next-intl |

---

## Arquitetura em uma tela

```text
navegador ──HTML/RSC──> Next (BFF, :3000) ──REST + JWT──> Spring (:8080) ──> PostgreSQL (:5432)
```

O Next não é apenas a interface: ele atua como **Backend for Frontend**. O JWT vive num cookie
`httpOnly` que o JavaScript do navegador nunca alcança, e é o servidor Next que monta o header
`Authorization` ao falar com a API.

Duas consequências dessa escolha:

- **XSS não alcança o token.** Não existe token em `localStorage` nem em variável de cliente.
- **CORS deixa de existir para a aplicação.** O navegador conversa só com o Next. Por isso o
  DevTools não mostra chamadas à API — elas partem do servidor.

O frontend, portanto, precisa de um processo Node e não pode ser publicado como site estático.

---

## O que foi entregue

O desafio pedia **um** módulo de CRUD e o dashboard. Foram implementados os dois módulos propostos,
mais os cadastros e fluxos que a operação exigia para os indicadores fazerem sentido.

**Operação**

- **Viagens** — programação, início, conclusão trecho a trecho, cancelamento e histórico imutável.
- **Manutenções** — agendamento, execução, conclusão, alertas de atraso e catálogo de serviços.
- **Romaneios** — emissão por trecho, correção, importação, código de integridade e download em PDF.
- **Frota** — cadastro, status operacional derivado e exportação em CSV/XLS.
- **Motoristas e catálogo de serviços** — cadastros de apoio com status operacional.

**Dashboard** — as cinco métricas obrigatórias, todas em SQL nativo.

**Segurança** — login com JWT, dois perfis (`OPERADOR` e `GESTOR`), cadastro fechado por convite
individual de uso único, troca obrigatória da senha inicial com invalidação do token anterior e
limitação de tentativas de login.

**Interface** — português e inglês, temas claro e escuro, layout responsivo. Estado de lista
(busca, filtro, página) mora na URL, então o filtro sobrevive a reload e ao botão de voltar.

**Números do que existe hoje**

| | |
|---|---:|
| Endpoints REST | 50 em 10 controllers |
| Tabelas no schema | 13 |
| Migrations Flyway | 20 versionadas + 1 seed repetível |
| Testes do backend | 231 |
| Testes do frontend | 85 |

---

## As cinco métricas

Todas extraídas por `nativeQuery`, não por derivação em memória:

| Métrica | Método em [`DashboardRepository`](logitrack-backend/src/main/java/br/com/logap/logitrack/dashboard/DashboardRepository.java) |
|---|---|
| Total de KM percorrido | `totalKm` |
| Volume por categoria (Leve / Pesado) | `volumePorCategoria` |
| Cronograma das próximas 5 manutenções | `proximasManutencoes` |
| Ranking de utilização por veículo | `rankingUtilizacao` |
| Projeção financeira do mês atual | `projecaoFinanceiraMesAtual` |

O SQL comentado, com a justificativa de cada decisão de consulta, está em
[`logitrack-backend/docs/decisoes-de-banco.md`](logitrack-backend/docs/decisoes-de-banco.md).

Duas decisões que valem destaque, porque são o tipo de detalhe que muda o plano de execução:

- A projeção financeira usa o intervalo semiaberto `[início do mês, início do próximo)` em vez de
  `DATE_TRUNC` sobre a coluna. `DATE_TRUNC` aplicado à coluna impediria o uso do índice.
- O volume por categoria parte de `veiculos` com `LEFT JOIN`, para que uma categoria sem viagens
  apareça com zero. Um `INNER JOIN` faria a linha desaparecer do relatório.

Uma regra de negócio atravessa todas elas: quilometragem só é realizada quando a chegada real é
registrada. Viagem programada ou em andamento ainda é plano de rota; cancelada nunca entra.

---

## Como rodar

Requisitos: Docker e Docker Compose. Não é necessário ter JDK ou Node instalados.

Os serviços são independentes e não há Compose conjunto na raiz — isso é deliberado e acompanha o
deploy real, em que cada um tem variáveis e escala próprias.

**1. API e banco**

```bash
cd logitrack-backend
cp .env.example .env
docker compose up -d --build
```

**2. Interface**

```bash
cd logitrack-frontend
cp .env.example .env
docker compose up -d --build
```

| | |
|---|---|
| Interface | http://localhost:3000 |
| API | http://localhost:8080 |
| Swagger | http://localhost:8080/docs |
| PostgreSQL | `localhost:5432`, banco `logitrack` |

Credenciais do seed de demonstração: `operador@logitrack.com` / `logap123`.

Essas credenciais existem apenas em desenvolvimento. O perfil `prod` não carrega `db/seed`, então
em produção o banco nasce sem contas e o primeiro gestor vem do bootstrap por variável de ambiente.

---

## Banco de dados

O script fornecido no desafio foi tomado como ponto de partida e evoluiu por **migrations
versionadas do Flyway**, não por alteração direta. Quem cria e altera tabela é o Flyway; o
Hibernate roda com `ddl-auto: validate` e apenas confere.

Dois princípios guiaram as mudanças de schema:

1. **Status é consulta, não coluna.** Não existe coluna de status de viagem nem de veículo. Um
   `EM_ANDAMENTO` gravado em coluna continuaria em andamento para sempre se ninguém rodasse um job
   de correção; derivado por SQL, nunca sai de sincronia.
2. **Dados fictícios não entram no histórico obrigatório.** A massa de demonstração é um script
   repetível isolado em `db/seed`, carregado somente pelo perfil `dev`. Produção fixa
   `classpath:db/migration`.

A justificativa de cada alteração — índices, recusa do UUID, normalização das ordens de manutenção,
identidade dos trechos — está em
[`logitrack-backend/docs/decisoes-de-banco.md`](logitrack-backend/docs/decisoes-de-banco.md).

---

## Verificação

```bash
cd logitrack-backend  && ./mvn.sh -B verify   # 231 testes
cd logitrack-frontend && npm run verify       # 85 testes + typecheck + lint + build
```

Os testes de integração sobem PostgreSQL real por Testcontainers, e não um banco em memória: as
métricas dependem de índice parcial, `DATE_TRUNC` e `INTERVAL`, que um H2 não reproduz. Há ainda um
teste de orçamento de consultas que falha se alguma listagem voltar a emitir N+1.

---

## Estrutura e documentação

```text
logitrack-backend/
├── README.md      setup, perfis, verificação e deploy da API
└── docs/
    ├── arquitetura.md          divisão dos módulos e a decisão de vertical slice
    ├── decisoes-tecnicas.md    autenticação, RBAC, códigos de erro, rate limit, N+1
    └── decisoes-de-banco.md    schema, índices, migrations e as consultas do dashboard

logitrack-frontend/
├── README.md      setup, rotas, qualidade e deploy da interface
└── docs/
    ├── arquitetura.md          camadas, direção das dependências e limites
    └── decisoes-tecnicas.md    BFF, i18n, tema, datas sem fuso, erros e convites
```

Este arquivo é o resumo dos dois serviços em conjunto. **Cada serviço tem o próprio `README.md`,
com as instruções de execução e publicação, e a própria pasta `docs/`, onde o desenvolvimento é
comentado com profundidade** — o porquê de cada decisão, as alternativas avaliadas e recusadas, e
as armadilhas encontradas no caminho.

Comece pelo `README.md` do serviço que interessa; os documentos de `docs/` são o aprofundamento e
podem ser lidos em qualquer ordem.

---

## Licença

[MIT](LICENSE).
