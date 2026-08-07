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
| `API_BASE_URL` | em produção sem Compose | URL da API vista pelo servidor Next |
| `DOCKER_API_BASE_URL` | não | URL repassada a `API_BASE_URL` pelo Compose |
| `API_REQUEST_TIMEOUT_MS` | não | Timeout das chamadas do BFF; padrão `15000` |
| `WEB_PORT` | não | Porta publicada pelo Compose; padrão `3000` |

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
| `/` | visão geral |
| `/viagens` | gestão de viagens |
| `/viagens/nova` | criação de viagem |
| `/viagens/[tripId]` | detalhes e operação da viagem |
| `/romaneios` | documentos de transporte por trecho |
| `/frota` | gestão e exportação da frota |
| `/motoristas` | cadastro de motoristas |
| `/servicos-manutencao` | catálogo de serviços |
| `/manutencoes` | cronograma e execução de manutenções |

## Deploy

O frontend não pode ser publicado como Static Site: Server Components consultam a API, Server
Actions executam mutações, Route Handlers geram arquivos e a sessão depende de cookie
`HttpOnly`. No Render, utilize um **Web Service** com o `Dockerfile` deste diretório e configure
`API_BASE_URL` como secret/variável do serviço.

## Documentação interna

As motivações arquiteturais e decisões que não pertencem ao guia público ficam em `docs/`:

- [Arquitetura e limites entre camadas](docs/arquitetura.md)
- [Decisões técnicas e segurança](docs/decisoes-tecnicas.md)
- [Deploy, operação e verificação](docs/deploy-e-operacao.md)
