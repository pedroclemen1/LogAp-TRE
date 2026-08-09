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

A API está publicada como **Web Service Docker**, com PostgreSQL gerenciado na mesma região — o
endereço interno do banco só resolve assim, e é ele que mantém o tráfego fora da internet pública. O
`docker-compose.yml` serve apenas ao desenvolvimento local; a plataforma constrói somente o
`Dockerfile` deste diretório, com `logitrack-backend` como raiz e `/actuator/health` como health
check.

A mesma imagem sobe em qualquer ambiente: o container roda como usuário sem privilégios e escuta a
porta indicada por `PORT`, caindo para `10000` quando ela não existe. Não há Dockerfile por ambiente.

### Configuração como contrato

O `application-prod.yml` não contém valor algum — apenas declara de que variáveis a aplicação
precisa. Fora do perfil `dev` **não existe fallback**: se qualquer uma faltar, o startup falha.

A escolha é deliberada. Um segredo com valor padrão silencioso é pior que a ausência dele, porque a
aplicação sobe aparentando saúde enquanto usa credencial de desenvolvimento em produção. Falhar no
boot torna o erro imediato e legível.

| Variável | Papel |
|---|---|
| `SPRING_PROFILES_ACTIVE` | ativa o perfil `prod`, que desliga Swagger, silencia SQL e exige HTTPS nos convites |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | conexão com o banco |
| `JWT_SECRET`, `JWT_EXPIRATION_MINUTES` | assinatura e duração da sessão |
| `BFF_SHARED_SECRET` | prova de que a chamada vem do frontend confiável |
| `CORS_ORIGINS` | origem permitida, sempre explícita |
| `INVITATION_BASE_URL` | base do link de convite |
| `FORWARD_HEADERS_STRATEGY` | faz `getRemoteAddr()` refletir o cliente atrás do proxy |

Quatro decisões embutidas nessa lista:

**`DB_URL` usa o formato JDBC** (`jdbc:postgresql://host:5432/base`), com usuário e senha em variáveis
separadas. O formato `postgresql://user:pass@host/base` que os provedores exibem não é aceito pelo
driver do Spring.

**`BFF_SHARED_SECRET` é distinto do `JWT_SECRET`** e idêntico nos dois serviços. Separá-los permite
rotacionar um sem encerrar as sessões abertas pelo outro, já que protegem coisas diferentes: um
assina a sessão do usuário, o outro identifica o frontend perante a API.

**`CORS_ORIGINS` nunca é `*`**, porque a API aceita credenciais no CORS e o coringa desabilitaria a
própria restrição.

**As locations do Flyway não são configuráveis por ambiente.** O perfil `prod` fixa
`classpath:db/migration`, então a massa de demonstração de `db/seed` não tem como alcançar produção
nem por engano de configuração.

### Primeira conta

Produção não carrega o seed e não oferece cadastro público, então o banco nasce sem usuários. Em vez
de gravar um administrador em migration — o que colocaria uma credencial no histórico versionado — a
conta inicial vem de um provisionamento por variável de ambiente, ativado apenas no primeiro deploy.

O comportamento em `prod` é intencionalmente rígido: banco vazio **sem** esse provisionamento impede
o startup. A aplicação não fica publicada sem ninguém capaz de administrá-la.

A conta criada nasce com troca de senha obrigatória, e a troca invalida o token do primeiro acesso.
Isso é o que permite descartar as variáveis de bootstrap logo após o primeiro login: a senha que
passou pelo painel deixa de valer. Os usuários seguintes entram por convite.

O provisionamento é idempotente — reinicializações não redefinem credenciais.

## Documentação

- [Dicionário de campos](docs/dicionario-de-campos.md) — **o que digitar em cada formulário**:
  formato, limites e valores aceitos, campo por campo
- [Arquitetura](docs/arquitetura.md) — divisão dos módulos e serviços de aplicação
- [Decisões técnicas](docs/decisoes-tecnicas.md) — contas, convites, RBAC, códigos de erro e
  prevenção de N+1
- [Decisões de banco](docs/decisoes-de-banco.md) — schema, índices, migrations e as consultas do
  dashboard
