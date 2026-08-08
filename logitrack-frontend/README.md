# LogiTrack Pro — Frontend

Interface web para gestão logística construída com Next.js 16, React 19, TypeScript strict,
Tailwind CSS 4 e `next-intl`. O Next atua como Backend for Frontend (BFF) da API Spring, mantendo
o JWT fora do JavaScript do navegador.

## Funcionalidades

- Visão geral com indicadores operacionais.
- Gestão de viagens, trechos e registros de chegada.
- Emissão, correção, importação e download em PDF de romaneios.
- Gestão e exportação de frota em CSV/XLS.
- Cadastro de motoristas e catálogo de serviços.
- Planejamento, execução e alertas de manutenções atrasadas.
- Interface em português e inglês.
- Temas claro e escuro.
- Layout responsivo e sessão autenticada em cookie `HttpOnly`.
- Troca obrigatória da senha inicial com rotação do JWT sem expô-lo ao navegador.
- Cadastro fechado por convite individual, temporário e de uso único.

## Requisitos

- Node.js 22.
- npm 10 ou superior.
- API LogiTrack disponível localmente ou em um ambiente remoto.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

A aplicação fica disponível em http://localhost:3000. Em desenvolvimento, a API usa
`http://localhost:8080` como endereço padrão.

Quando o seed demonstrativo do backend estiver habilitado, as credenciais locais são:

```text
operador@logitrack.com
logap123
```

Essas credenciais são exclusivamente de desenvolvimento e não devem existir em produção.

## Variáveis de ambiente

Copie `.env.example` para `.env` quando precisar sobrescrever os valores locais.

| Variável | Obrigatória | Finalidade |
|---|---:|---|
| `API_BASE_URL` | em produção | URL da API vista pelo servidor Next |
| `BFF_SHARED_SECRET` | em produção | Identifica este serviço como o BFF confiável perante a API |
| `DOCKER_API_BASE_URL` | não | URL repassada a `API_BASE_URL` pelo Compose |
| `API_REQUEST_TIMEOUT_MS` | não | Timeout das chamadas do BFF; padrão `15000` |
| `WEB_PORT` | não | Porta publicada pelo Compose; padrão `3000` |

Em produção não há fallback para as duas obrigatórias: sem elas o serviço lança na inicialização
em vez de atender requisições com configuração de desenvolvimento.

A URL da API e o token não usam variáveis `NEXT_PUBLIC_*`: o navegador conversa com o Next, e o
Next conversa com o Spring.

## Docker

O Compose deste diretório sobe somente o frontend. O backend possui Docker e Compose próprios em
`../logitrack-backend`; não há orquestração conjunta na raiz.

```bash
cp .env.example .env
docker compose up --build
```

Por padrão, o container acessa uma API publicada no host em
`http://host.docker.internal:8080`. Para usar uma API remota, configure `DOCKER_API_BASE_URL`.

## Qualidade

```bash
npm run test       # testes unitários e consistência dos catálogos i18n
npm run typecheck  # TypeScript sem emissão
npm run lint       # Oxlint
npm run check      # test + typecheck + lint
npm run verify     # check + build de produção
```

## Rotas

| Rota | Responsabilidade |
|---|---|
| `/login` | autenticação |
| `/alterar-senha` | troca autenticada da senha inicial ou atual |
| `/convite` | validação e ativação pública de convite individual |
| `/` | visão geral |
| `/viagens` | gestão de viagens |
| `/viagens/nova` | criação de viagem |
| `/viagens/[tripId]` | detalhes e operação da viagem |
| `/romaneios` | documentos de transporte por trecho |
| `/frota` | gestão e exportação da frota |
| `/motoristas` | cadastro de motoristas |
| `/servicos-manutencao` | catálogo de serviços |
| `/manutencoes` | cronograma e execução de manutenções |
| `/usuarios` | geração de convites, disponível somente para gestores |

## Deploy

O frontend **não pode ser publicado como Static Site**: Server Components consultam a API, Server
Actions executam mutações, Route Handlers geram arquivos e a sessão depende de cookie `HttpOnly`.
Ele exige um processo Node e é publicado como **Web Service Docker**.

`output: 'standalone'` faz o Next gerar um servidor com apenas os arquivos necessários. O
Dockerfile copia esse resultado para uma imagem Alpine e executa como usuário sem privilégios.

Frontend e backend possuem Dockerfiles e Composes independentes, acompanhando o deploy real, em
que cada serviço tem ciclo, variáveis e escala próprios.

| Campo | Valor |
| --- | --- |
| Runtime | Docker |
| Root Directory | `logitrack-frontend` |
| Dockerfile Path | `Dockerfile` |
| Health Check Path | `/login` |

```dotenv
API_BASE_URL=<endereco interno da API>
BFF_SHARED_SECRET=<o MESMO valor cadastrado no servico da API>
API_REQUEST_TIMEOUT_MS=30000
```

`API_BASE_URL` precisa ser alcançável pelo container do Next; um endereço interno do provedor é
preferível quando os dois serviços estão na mesma rede privada.

`BFF_SHARED_SECRET` diferente entre os dois serviços é a falha mais fácil de cometer, porque o
sintoma engana: o frontend sobe, a tela de login carrega, e toda autenticação é recusada.

Em plataformas cujo plano gratuito hiberna o serviço por inatividade, o retorno leva de 30 a 60
segundos. O padrão de `API_REQUEST_TIMEOUT_MS` é 15000, então o BFF desistiria antes da API
responder e a primeira visita do dia pareceria quebrada — por isso o valor sugerido acima.

### Antes de publicar

```bash
npm ci
npm run verify
docker compose config
docker compose build
docker compose up -d --wait
docker compose down
```

O Compose possui healthcheck da rota de login. Ele usa `127.0.0.1` explicitamente porque a imagem
Alpine pode resolver `localhost` para IPv6 enquanto o Next escuta em IPv4.

### Diagnóstico

- `API_BASE_URL is required in production`: variável ausente no serviço do frontend.
- `BFF_SHARED_SECRET is required in production`: idem, e o valor precisa bater com o da API.
- Timeout ao abrir uma página: conferir conectividade do container com a API e
  `API_REQUEST_TIMEOUT_MS`.
- Redirecionamento contínuo ao login: verificar expiração do JWT, relógio dos serviços e segredo
  do backend.
- Interface sem estilos: confirmar que `postcss.config.mjs`, `@tailwindcss/postcss` e
  `globals.css` estão presentes no build.
- Tradução ausente: executar `npm test`; a suíte compara os dois catálogos e valida ICU.

### Artefatos gerados

`next-env.d.ts`, `.next/` e `*.tsbuildinfo` são gerados pelas ferramentas e ficam fora do Git.
`node_modules/` nunca entra no repositório nem no contexto Docker; a instalação é refeita por
`npm ci`. `docs/` é versionado, mas fica fora da imagem de runtime pelo `.dockerignore`.

## Documentação

- [Arquitetura e limites entre camadas](docs/arquitetura.md)
- [Decisões técnicas e segurança](docs/decisoes-tecnicas.md)
