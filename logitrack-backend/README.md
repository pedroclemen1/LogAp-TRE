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

Usuário de demonstração carregado pelo seed: `operador@logitrack.com` / `logap123`.

Os valores padrão do Compose são apropriados apenas para desenvolvimento. Antes do deploy, defina
uma senha de banco segura e gere segredos aleatórios com pelo menos 32 bytes. A configuração
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
- `prod`: exige banco, CORS, segredos e URL de convite via ambiente, não executa seed, desabilita
  Swagger e reduz logs SQL.

Sem um perfil, a aplicação exige todas as variáveis sensíveis e de conexão. Os
fallbacks locais existem somente em `application-dev.yml`, evitando que um
deploy iniciado sem `prod` aceite silenciosamente o segredo de desenvolvimento.

## Healthchecks

`GET /actuator/health` é público e serve somente ao Docker e à plataforma de deploy. Ele não
expõe detalhes internos, porque a plataforma não possui um JWT de usuário para promover ou
reiniciar uma instância. `GET /api/health` valida também a cadeia de autenticação da aplicação e,
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
./mvn.sh -B verify
```

Executa a suíte completa, incluindo os testes de integração com PostgreSQL real por
Testcontainers. Para quem tem JDK 21 e Maven locais, `./mvnw clean verify` é equivalente.

O `clean` importa depois de renomear um arquivo SQL: o Maven não apaga de `target/classes` a
cópia do resource antigo, e o Flyway encontraria o nome antigo e o novo no mesmo artefato.

O schema é versionado exclusivamente pelo Flyway. Depois que uma migration chegar a um ambiente
compartilhado, não a edite: novas mudanças recebem uma nova versão.

## Deploy

A API é publicada como **Web Service Docker**, com o PostgreSQL como serviço gerenciado na mesma
região. O `docker-compose.yml` existe apenas para desenvolvimento local; a plataforma constrói
somente o `Dockerfile` deste diretório.

| Campo | Valor |
| --- | --- |
| Runtime | Docker |
| Root Directory | `logitrack-backend` |
| Dockerfile Path | `Dockerfile` |
| Health Check Path | `/actuator/health` |

O container inicia como usuário sem privilégios e escuta a variável `PORT`, caindo para `10000`
quando ela não existir. Não é necessário alterar o `Dockerfile` por ambiente.

### Variáveis obrigatórias

O Spring JDBC não aceita a URL no formato `postgresql://` que os painéis costumam exibir. Monte
`DB_URL` no formato JDBC, sem usuário e senha, usando o **endereço interno** do banco:

```dotenv
SPRING_PROFILES_ACTIVE=prod

DB_URL=jdbc:postgresql://<hostname-interno>:5432/<database>
DB_USER=<usuario>
DB_PASSWORD=<senha>

JWT_SECRET=<aleatorio, no minimo 32 bytes>
JWT_EXPIRATION_MINUTES=60
BFF_SHARED_SECRET=<aleatorio, no minimo 32 bytes>

CORS_ORIGINS=https://<frontend>/
INVITATION_BASE_URL=https://<frontend>/convite
INVITATION_EXPIRATION_HOURS=48

FORWARD_HEADERS_STRATEGY=framework
```

O perfil `prod` **não possui fallback** para nenhuma dessas. Faltando qualquer uma, o startup
falha em vez de subir com configuração local silenciosa.

`BFF_SHARED_SECRET` autentica o frontend como o BFF confiável e precisa do **mesmo valor nos dois
serviços**. Gere-o distinto do `JWT_SECRET`: os dois protegem coisas diferentes e devem poder ser
rotacionados de forma independente. Rotacioná-lo exige atualizar os dois serviços na mesma janela.

`CORS_ORIGINS` aceita várias origens separadas por vírgula, sempre completas e sem caminho. Não
use `*`, porque a API aceita credenciais no CORS.

Não configure `FLYWAY_LOCATIONS` nem `SPRING_FLYWAY_LOCATIONS`. O perfil `prod` fixa
`classpath:db/migration`; os dados de `db/seed` pertencem exclusivamente ao perfil `dev`.

### Primeiro gestor

Produção não carrega o seed e não oferece cadastro público, então o banco nasce sem contas. No
primeiro deploy, habilite temporariamente o provisionamento:

```dotenv
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_NAME=<nome>
BOOTSTRAP_ADMIN_EMAIL=<email>
BOOTSTRAP_ADMIN_PASSWORD=<senha com no minimo 12 caracteres>
```

No perfil `prod`, um banco vazio sem bootstrap habilitado impede o startup: a aplicação não fica
publicada sem uma conta administrativa. O bootstrap é idempotente e não redefine credenciais em
reinicializações posteriores.

Depois de validar o primeiro login, conclua a troca obrigatória de senha, defina
`BOOTSTRAP_ADMIN_ENABLED=false`, **remova** as três variáveis restantes e faça um novo deploy. A
troca de senha invalida o JWT do primeiro login, então frontend e backend desta versão precisam
estar publicados em conjunto.

Não coloque o gestor real em uma migration e não habilite o seed em produção.

### Verificação do deploy

```bash
curl --fail https://<api>/actuator/health   # {"status":"UP"}
```

Confirme nos logs do primeiro deploy: migrations do Flyway concluídas sem erro, Hibernate validou
o schema, nenhuma migration de `db/seed` executada, nenhum SQL ou segredo impresso, e o gestor
inicial criado uma única vez.

Se o startup falhar por variável ausente, corrija no painel — não adicione valores padrão ao
perfil `prod`. Se o health check falhar, confira `SPRING_PROFILES_ACTIVE`, `PORT`, `DB_URL` e se
banco e API estão na mesma região.

## Documentação

- [Arquitetura](docs/arquitetura.md) — divisão dos módulos e serviços de aplicação
- [Decisões técnicas](docs/decisoes-tecnicas.md) — contas, convites, RBAC, códigos de erro e
  auditoria de N+1
- [Decisões de banco](docs/decisoes-de-banco.md) — schema, índices, migrations e as consultas do
  dashboard
