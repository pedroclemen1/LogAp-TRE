# Arquitetura do frontend

## Objetivo

A estrutura privilegia fluxo de dependência previsível, componentes client pequenos e contratos de
API isolados da interface. O objetivo não é reproduzir uma metodologia de pastas de maneira rígida,
mas impedir que regras de infraestrutura e apresentação se misturem.

## Direção das dependências

```text
app → widgets → features → entities → shared
```

As camadas têm as seguintes responsabilidades:

- `app/`: rotas, metadata, parâmetros, carregamento e composição de casos de uso.
- `widgets/`: estruturas globais compostas, como header, sidebar e alertas.
- `features/`: ações, API, modelos, controllers e componentes de cada domínio.
- `entities/`: contratos de domínio realmente compartilhados por mais de uma feature.
- `shared/`: infraestrutura, hooks, funções puras e componentes sem regra de negócio.

Uma camada pode importar apenas as camadas à sua direita. Features irmãs não devem conhecer seus
detalhes internos.

## Organização de uma feature

Cada feature usa somente as pastas necessárias:

```text
feature/
├── actions.ts       Server Actions e revalidação
├── api/             DTOs, mapeadores e chamadas ao backend
├── components/      apresentação e composição visual
├── controllers/     estado e efeitos client-side sem JSX
├── lib/             funções específicas da feature
└── model/           tipos e regras puras do domínio
```

DTOs preservam o vocabulário da API. Mapeadores convertem esses dados para modelos em inglês e
sem formatação. Datas, moedas e números só são formatados na apresentação.

## Romaneios como submódulo de Viagens

Romaneios operam sobre viagens e trechos, reutilizando os mesmos filtros, estados, opções de
veículo e componentes de rota. Como `features/manifest`, o módulo criaria dependência entre features
irmãs — proibida pela direção das dependências.

Por isso ele fica em `features/trips/manifest`, o que deixa explícito que é um caso de uso interno ao
domínio de Viagens. As duas alternativas seriam piores: duplicar os modelos, ou promover componentes
específicos de viagem para `shared`, onde não teriam semântica.

## Server Components e componentes client

Páginas são Server Components e carregam os dados antes de renderizar. `'use client'` aparece nas
folhas que precisam de eventos, estado, browser APIs ou Server Actions.

O fluxo de uma consulta é:

```text
page.tsx → api da feature → server-fetch → API Spring
         → mapper → modelo → componente
```

O fluxo de uma mutação é:

```text
formulário client → Server Action → api da feature → Spring
                 → revalidatePath/redirect → nova renderização
```

## Estado na URL

Busca, filtros, página e quantidade de linhas ficam na query string. Assim links são reproduzíveis,
recarregar não perde contexto e os botões de voltar/avançar continuam funcionais. Controllers de
filtro apenas aplicam debounce e atualizam a URL; eles não mantêm uma segunda fonte de verdade.

## Reutilização

Uma abstração vai para `shared` somente quando existe repetição concreta e sem semântica de um
domínio específico. Paginação, debounce, serialização de exportações e componentes básicos são
compartilhados. Formulários, badges de estado e regras de manutenção permanecem em suas features.
