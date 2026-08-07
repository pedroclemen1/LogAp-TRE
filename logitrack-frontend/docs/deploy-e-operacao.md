# Deploy e operação

## Modelo de execução

O frontend exige um processo Node porque utiliza Server Components dinâmicos, Server Actions,
Route Handlers, cookies de sessão e proxy. Por isso ele deve ser publicado como Web Service e não
como hospedagem estática.

`output: 'standalone'` faz o Next gerar um servidor com apenas os arquivos necessários. O
Dockerfile copia esse resultado para uma imagem Alpine e executa como usuário sem privilégios.

## Separação dos serviços

Frontend e backend possuem Dockerfiles e Composes independentes. O Compose do frontend não sobe
PostgreSQL nem Spring; ele aponta `API_BASE_URL` para o backend no host ou para uma URL remota.

Essa separação acompanha o deploy real, no qual cada serviço tem ciclo, variáveis e escala próprios.

## Render

Configuração esperada para o frontend:

- Tipo: Web Service.
- Runtime: Docker.
- Root directory: `logitrack-frontend`.
- Healthcheck: `/login`.
- Variável obrigatória: `API_BASE_URL`.
- Variável opcional: `API_REQUEST_TIMEOUT_MS=15000`.

O endereço configurado em `API_BASE_URL` precisa ser acessível pelo container do Next. Uma URL
interna do provedor é preferível quando frontend e backend estiverem na mesma rede privada.

## Verificação antes do deploy

```bash
npm ci
npm run verify
docker compose config
docker compose build
docker compose up -d --wait
docker compose down
```

`npm run verify` executa testes, TypeScript, lint e build de produção. O Compose possui healthcheck
da rota de login e publica a porta configurada por `WEB_PORT`. O healthcheck usa `127.0.0.1`
explicitamente porque a imagem Alpine pode resolver `localhost` para IPv6 enquanto o Next escuta
em IPv4.

## Arquivos de ferramenta e artefatos gerados

- `package-lock.json`, `postcss.config.mjs` e `.oxlintrc.json` fazem parte da configuração
  reproduzível e devem ser versionados.
- `next-env.d.ts`, `.next/` e `*.tsbuildinfo` são gerados pelas ferramentas e permanecem fora do
  Git pela configuração da raiz.
- `node_modules/` nunca entra no repositório nem no contexto Docker; a instalação é refeita por
  `npm ci`.
- `docs/` é versionado, mas fica fora da imagem de runtime pelo `.dockerignore`.
- Não existe uma pasta `scripts/`: verificações automatizadas pertencem à suíte Vitest ou aos
  comandos declarados em `package.json`.

## Diagnóstico

- Erro `API_BASE_URL is required in production`: variável ausente no serviço do frontend.
- Timeout ao abrir uma página: conferir conectividade do container com a API e
  `API_REQUEST_TIMEOUT_MS`.
- Redirecionamento contínuo ao login: verificar expiração do JWT, relógio dos serviços e secret do
  backend.
- Interface sem estilos: confirmar que `postcss.config.mjs`, `@tailwindcss/postcss` e
  `globals.css` estão presentes no build.
- Tradução ausente: executar `npm test`; a suíte compara os dois catálogos e valida ICU.
