# Deploy do backend no Render

Este documento descreve o deploy da API como um **Web Service Docker** e do
PostgreSQL como um serviço gerenciado do Render. O `docker-compose.yml` existe
somente para desenvolvimento local; o Render constrói apenas o `Dockerfile`
deste diretório.

## Arquitetura do ambiente

- frontend e backend são serviços independentes;
- a API usa o perfil Spring `prod`;
- a API e o PostgreSQL ficam na mesma conta e região do Render;
- a API se conecta ao endereço interno do banco;
- Flyway executa apenas `classpath:db/migration`;
- Swagger e logs de SQL ficam desabilitados em produção;
- `/actuator/health` é o health check público da infraestrutura;
- `/api/health` permanece protegido por JWT.

O endereço interno evita que o tráfego entre a API e o banco atravesse a
internet pública. As credenciais e chaves devem ser cadastradas em
**Environment** no painel do Render e nunca em arquivos versionados.

## 1. Criar o PostgreSQL

Crie um Render Postgres na mesma região escolhida para a API. Na página do
banco, guarde separadamente os dados da conexão interna:

- hostname;
- porta, normalmente `5432`;
- database;
- username;
- password.

O Spring JDBC não aceita diretamente a URL fornecida no formato
`postgresql://...`. Monte `DB_URL` no formato JDBC, sem incluir usuário e senha:

```text
jdbc:postgresql://<hostname-interno>:5432/<database>
```

## 2. Criar o Web Service

Use as seguintes configurações:

| Campo | Valor |
| --- | --- |
| Runtime | Docker |
| Branch | branch destinada ao deploy |
| Root Directory | `logitrack-backend` |
| Dockerfile Path | `Dockerfile` |
| Health Check Path | `/actuator/health` |

O container inicia como usuário sem privilégios. No perfil `prod`, a API escuta
a variável `PORT`; quando ela não existir, usa `10000`, que é a porta padrão
recomendada pelo Render. Não é necessário alterar o `Dockerfile` para cada
ambiente.

## 3. Variáveis obrigatórias

Cadastre no serviço da API:

```dotenv
SPRING_PROFILES_ACTIVE=prod

DB_URL=jdbc:postgresql://<hostname-interno>:5432/<database>
DB_USER=<usuario-do-banco>
DB_PASSWORD=<senha-do-banco>

CORS_ORIGINS=https://<frontend>.onrender.com
JWT_SECRET=<segredo-aleatorio-com-no-minimo-32-bytes>
JWT_EXPIRATION_MINUTES=60

BFF_SHARED_SECRET=<segredo-aleatorio-com-no-minimo-32-bytes>


INVITATION_BASE_URL=https://<frontend>.onrender.com/convite
INVITATION_EXPIRATION_HOURS=48

LOGIN_RATE_LIMIT_ENABLED=true
LOGIN_RATE_LIMIT_MAX_FAILED_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW=15m
LOGIN_RATE_LIMIT_CLEANUP_INTERVAL=5m
LOGIN_RATE_LIMIT_MAX_TRACKED_IDENTITIES=10000
FORWARD_HEADERS_STRATEGY=framework
```

`CORS_ORIGINS` aceita mais de uma origem separada por vírgula. Informe origens
completas, incluindo `https://`, e sem caminho. Não use `*` porque a API aceita
credenciais no CORS.

`JWT_SECRET` deve ser aleatório e possuir pelo menos 32 bytes para HS256. Não
reutilize senha de usuário, senha do banco ou valor do ambiente local.

`BFF_SHARED_SECRET` autentica o frontend como o BFF confiável e também exige no
mínimo 32 bytes. **O mesmo valor precisa ser cadastrado nos dois serviços** — a
API e o frontend. Ele não possui default fora do perfil `dev`: se faltar, o
startup falha na validação de `app.security.bff.shared-secret`. Gere um segredo
distinto do `JWT_SECRET`, pois os dois protegem coisas diferentes e devem poder
ser rotacionados de forma independente. A rotação exige atualizar os dois
serviços na mesma janela, senão o frontend perde a confiança da API.

`PORT` é opcional:

```dotenv
PORT=10000
```

O perfil `prod` não possui fallback para banco, CORS, segredo JWT nem duração do
token. A URL pública dos convites também é obrigatória para impedir que links de
produção apontem para `localhost`. Se uma dessas variáveis estiver ausente, o
startup falha em vez de usar uma configuração local silenciosamente.

Não configure `FLYWAY_LOCATIONS` nem `SPRING_FLYWAY_LOCATIONS` no Render. O
perfil de produção fixa a localização em `classpath:db/migration`; os dados de
`db/seed` pertencem exclusivamente ao perfil `dev` usado pelo Compose local.

### Limitação de tentativas de login

Por padrão, cinco credenciais inválidas dentro de quinze minutos bloqueiam
novas tentativas para a mesma combinação de identidade e endereço remoto até o
fim da janela. A API responde com HTTP `429`,
`ApiError.code=LOGIN_RATE_LIMIT_EXCEEDED` e o cabeçalho `Retry-After`. Um login
válido remove imediatamente as falhas daquela combinação.

O mapa guarda somente uma chave HMAC composta pelo e-mail normalizado e pelo
endereço remoto. O segredo dessa chave é aleatório e existe apenas durante a
vida do processo; e-mails e endereços em texto puro não são mantidos no
limitador nem enviados aos logs. Entradas vencidas são removidas durante o uso.
Ao atingir o limite de identidades, a janela ainda não bloqueada com expiração
mais próxima é despejada antes da inclusão. Bloqueios ativos são preservados;
somente quando todas as entradas já estão bloqueadas a expiração mais próxima
é removida. Assim o teto de memória não cria um bloqueio global nem permite que
um churn barato apague uma proteção ativa.

No perfil `prod`, `FORWARD_HEADERS_STRATEGY=framework` faz o Spring interpretar
os cabeçalhos encaminhados pelo proxy e entregar o endereço resolvido por
`HttpServletRequest.getRemoteAddr()`. Isso pressupõe que o serviço continue
atrás de um proxy confiável que remova ou sobrescreva cabeçalhos `Forwarded` e
`X-Forwarded-*` enviados pelo cliente. Se a API for exposta diretamente ou
migrada para outra infraestrutura, reavalie essa confiança; aceitar esses
cabeçalhos diretamente da internet permitiria trocar a chave do limitador.

Esta implementação armazena os contadores **na memória de cada instância**. Ela
é apropriada para o primeiro deploy com uma única instância no Render, mas os
contadores são perdidos em reinicializações e não são compartilhados entre
réplicas. Antes de escalar horizontalmente, substitua o armazenamento por Redis
ou outro mecanismo distribuído com incremento atômico e expiração. Não aumente
o número de instâncias mantendo o limitador local, pois cada réplica aplicaria
uma janela independente.

A chave composta evita que um atacante em uma origem bloqueie o acesso legítimo
da mesma conta a partir de outra origem. Em contrapartida, uma botnet que altere
endereços pode obter uma nova janela. Antes de abrir cadastro público ou receber
tráfego relevante, acrescente limites independentes por origem, proteção global
no edge/WAF e monitoração de falhas, além do armazenamento distribuído.

## 4. Bootstrap do primeiro gestor

No primeiro deploy de um banco vazio, habilite temporariamente o provisionamento
do gestor com os secrets definidos pelo módulo de bootstrap:

```dotenv
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_NAME=<nome-do-gestor>
BOOTSTRAP_ADMIN_EMAIL=<email-do-gestor>
BOOTSTRAP_ADMIN_PASSWORD=<senha-inicial-forte>
```

A senha inicial deve possuir no mínimo 12 caracteres e no máximo 72 bytes, que
é o limite seguro aceito pelo BCrypt usado pela aplicação.

O bootstrap é idempotente: ele cria o gestor apenas no cenário inicial aceito e
não redefine credenciais em reinicializações posteriores. No perfil `prod`, um
banco vazio sem bootstrap habilitado causa falha de startup: a aplicação não
fica publicada sem uma conta administrativa. Se já existir um gestor, o boot
continua normalmente com o bootstrap desabilitado e sem os secrets de nome,
e-mail e senha.

Depois de validar o primeiro login:

1. conclua a troca obrigatória da senha inicial na tela apresentada após o login;
2. defina `BOOTSTRAP_ADMIN_ENABLED=false`;
3. remova `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e
   `BOOTSTRAP_ADMIN_PASSWORD` do Render;
4. salve as variáveis e faça um novo deploy.

Não coloque o gestor real em uma migration Flyway e não habilite o seed
demonstrativo em produção.

A troca da senha incrementa a versão das credenciais, invalida o JWT emitido no
primeiro login e devolve uma sessão nova. Portanto, confirme que o frontend e o
backend desta versão foram publicados em conjunto.

## 5. Verificação do deploy

O Render só deve direcionar tráfego para a versão depois que este endpoint
responder com status `200`:

```bash
curl --fail https://<api>.onrender.com/actuator/health
```

Resposta esperada:

```json
{"status":"UP"}
```

O endpoint não expõe detalhes dos componentes. Para validar também a cadeia de
autenticação, faça login e consulte:

```bash
curl --fail \
  -H "Authorization: Bearer <token>" \
  https://<api>.onrender.com/api/health
```

Resposta esperada:

```json
{"message":"api is running"}
```

Confirme ainda nos logs do primeiro deploy:

- migrations Flyway concluídas sem erro;
- Hibernate validou o schema;
- nenhuma migration de `db/seed` foi executada;
- nenhum SQL ou secret foi impresso;
- o gestor inicial foi criado uma única vez.

## 6. Operação e recuperação

- Se o startup falhar por placeholder ausente, corrija as variáveis no painel;
  não adicione valores padrão ao perfil `prod`.
- Se o health check falhar, confirme primeiro `SPRING_PROFILES_ACTIVE`, `PORT`,
  `DB_URL` e se banco e API estão na mesma região.
- Faça rotação de `DB_PASSWORD` atualizando o serviço antes de revogar a
  credencial anterior.
- A rotação de `JWT_SECRET` invalida todos os tokens emitidos; programe-a como
  uma janela de encerramento de sessões.
- Use backups do PostgreSQL antes de mudanças operacionais ou migrations de
  maior risco.

## Referências do Render

- [Environment Variables and Secrets](https://render.com/docs/configure-environment-variables)
- [Create and Connect to Render Postgres](https://render.com/docs/postgresql-creating-connecting)
- [Docker on Render](https://render.com/docs/docker)
- [Troubleshooting Deploys](https://render.com/docs/troubleshooting-deploys)
