# LogiTrack Pro — Backend

API REST do LogiTrack Pro em Java 21, Spring Boot 3.5, PostgreSQL, Flyway e autenticação JWT.

## Docker

O Compose deste diretório sobe somente a API e o PostgreSQL. O frontend possui seu próprio
Compose em `../logitrack-frontend`; não há Compose conjunto na raiz.

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8080
- Swagger: http://localhost:8080/docs
- Health de infraestrutura (público): http://localhost:8080/actuator/health
- Health da API (requer JWT): http://localhost:8080/api/health
- PostgreSQL: `localhost:5432`, banco `logitrack`

Os valores padrão do Compose são apropriados apenas para desenvolvimento. Antes do deploy, defina
uma senha de banco segura e gere um `JWT_SECRET` aleatório com pelo menos 32 bytes. A configuração
padrão da aplicação executa somente `classpath:db/migration`; o Compose ativa o perfil `dev`, que
inclui `classpath:db/seed` para disponibilizar os dados demonstrativos.

## Execução sem Docker

Com PostgreSQL disponível localmente:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Quem não possui JDK 21 e Maven instalados pode usar `./mvn.sh` para executar os
mesmos objetivos dentro de um container. As configurações podem ser
substituídas pelas variáveis documentadas em `.env.example`.

## Perfis de execução

- `dev`: usado pelo Compose e pela execução local, habilita os dados demonstrativos e o Swagger;
- `test`: banco efêmero e massa controlada pela suíte;
- `prod`: exige banco, CORS e JWT via ambiente, não executa seed, desabilita Swagger e reduz logs SQL.

Sem um perfil, a aplicação exige todas as variáveis sensíveis e de conexão. Os
fallbacks locais existem somente em `application-dev.yml`, evitando que um
deploy iniciado sem `prod` aceite silenciosamente o segredo de desenvolvimento.

O guia completo de configuração do serviço, PostgreSQL, secrets, bootstrap do primeiro gestor e
health check está em [`docs/deploy-render.md`](docs/deploy-render.md).

As decisões sobre bootstrap, troca obrigatória de senha, convites, RBAC e códigos estáveis de erro
estão em [`docs/autenticacao-e-autorizacao.md`](docs/autenticacao-e-autorizacao.md).

A divisão dos módulos e serviços de aplicação está registrada em
[`docs/arquitetura.md`](docs/arquitetura.md).

## Healthchecks

`GET /actuator/health` é público e serve somente ao Docker e à plataforma de deploy. Ele não
expõe detalhes internos. `GET /api/health` valida também a cadeia de autenticação da aplicação e,
por isso, exige o mesmo header das demais rotas protegidas:

```http
Authorization: Bearer <token>
```

Com um token válido, a resposta é:

```json
{"message":"api is running"}
```

## Verificação

```bash
./mvnw clean test
./mvnw package
```

O schema é versionado exclusivamente pelo Flyway. Depois que uma migration chegar a um ambiente
compartilhado, não a edite: novas mudanças devem receber uma nova versão. A estratégia de versões,
seed e recuperação está documentada em `docs/decisoes-flyway.md`. A revisão das consultas e os
limites que protegem contra N+1 estão em `docs/auditoria-n-plus-one.md`.
