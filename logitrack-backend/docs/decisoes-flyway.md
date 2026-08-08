# Decisões de migrations e dados demonstrativos

## Contexto

O histórico antigo misturava três responsabilidades:

- `V1` criava tabelas e também inseria registros fictícios;
- o seed usava versões `V900` e `V901` na mesma linha do tempo do schema;
- `V902` a `V906` corrigiam dados que o próprio seed inseria em um formato já
  ultrapassado.

Esse desenho exigia `out-of-order=true`. Uma migration de schema nova podia ter
versão menor que a última versão aplicada, tornando a ordem final dependente do
momento em que cada banco havia sido criado.

## Decisão

1. `db/migration` contém somente schema e backfills necessários para dados reais.
2. As migrations versionadas formam uma sequência crescente e não usam
   `out-of-order`.
3. `db/seed` contém somente dados opcionais de demonstração.
4. O seed usa o prefixo repetível `R__`, portanto é executado depois de todas as
   migrations versionadas e não ocupa um número da sequência do schema.
5. Cada bloco do seed é idempotente. Se o checksum do arquivo mudar, sua nova
   execução não duplica o conjunto já carregado.
6. A aplicação usa apenas `classpath:db/migration` por padrão. O Compose local
   ativa o perfil `dev`, que inclui também `classpath:db/seed`.
7. Testes não carregam seed: cada teste monta o cenário mínimo que precisa.

## Convenção de nomes

Migrations de schema seguem:

```text
V<ordem>__<verbo>_<objeto>.sql
```

O nome descreve a transformação, por exemplo:

```text
V1__cria_estrutura_basica.sql
V8__inicio_explicito_viagens.sql
V11__normaliza_ordens_manutencao.sql
```

Dados demonstrativos seguem:

```text
R__carrega_dados_demonstracao.sql
```

Os nomes usam caracteres ASCII para evitar diferenças de filesystem entre CI,
Linux e Windows.

As migrations de autenticação adicionadas para produção também mantêm uma
responsabilidade por versão:

| Migration | Decisão persistida |
| --- | --- |
| `V17__troca_obrigatoria_senha_usuario.sql` | estado de primeiro acesso, sem armazenar senha temporária em outra tabela |
| `V18__convites_de_usuario.sql` | token armazenado como hash, expiração, revogação, uso único e unicidade case-insensitive do e-mail |
| `V19__amplia_codigo_integridade_romaneio.sql` | novos checksums com 64 bits, preservando documentos legados de 8 hex |
| `V20__versiona_credenciais_usuario.sql` | versão incrementada na troca de senha para revogar JWTs anteriores |

## Imutabilidade e rebaseline atual

Esta reorganização foi feita antes do primeiro deploy compartilhado. Ela altera
o checksum e o nome de migrations locais antigas; portanto bancos locais criados
antes dela devem ser recriados:

```bash
docker compose down -v
docker compose up --build
```

Não use `flyway repair` apenas para esconder divergência de checksum. Depois que
uma versão for aplicada em ambiente compartilhado, ela é imutável e qualquer
correção recebe uma nova versão.

Depois de adicionar, remover ou renomear um arquivo SQL, valide com:

```bash
./mvnw clean test
```

O `clean` é necessário porque o Maven não apaga automaticamente de
`target/classes` a cópia de um resource que foi renomeado. Sem ele, o Flyway
pode encontrar simultaneamente o nome antigo e o novo no artefato local.

## Consequências

- um banco vazio recebe sempre `V1` a `V20`, na mesma ordem;
- produção não recebe usuário ou carga fictícia por omissão;
- novas migrations continuam a partir de `V21`;
- alterar o seed não interfere na versão atual do schema;
- dados legados reais continuam sendo tratados dentro da migration que altera
  seu formato, antes da remoção de colunas antigas.
