# Decisões de banco

Registro das escolhas de modelagem e de infraestrutura de dados do LogiTrack Pro.
O desafio dá "liberdade total para adicionar novas tabelas ou colunas" exigindo
justificativa — este documento é essa justificativa, e o que não foi feito
também está aqui.

---

## 1. O schema pertence ao backend (Flyway), não ao container do Postgres

Antes os scripts eram montados em `/docker-entrypoint-initdb.d`. Isso amarrava o
schema a um detalhe do container oficial do Postgres: só roda no **primeiro**
boot do volume, só funciona em Docker, e não deixa registro do que já foi
aplicado.

Agora as migrations vivem em `logitrack-backend/src/main/resources/db` e são
aplicadas pelo Flyway no boot da API:

| Local | Versão | Conteúdo |
|---|---|---|
| `db/migration` | `V1__carga_inicial_logap.sql` | script fornecido pelo desafio, **byte a byte** |
| `db/migration` | `V2__estrutura_complementar.sql` | tabelas, colunas e índices acrescentados |
| `db/migration` | `V3__km_inicial_veiculos.sql` | hodômetro de entrada, sem duplicar o atual derivado |
| `db/migration` | `V4__cancelamento_viagens.sql` | timestamp do fato humano de cancelamento |
| `db/migration` | `V5__indice_viagens_em_andamento_ativas.sql` | índice parcial ajustado para ignorar canceladas |
| `db/migration` | `V6__indice_viagens_operacionais.sql` | índice do modelo anterior, substituído pela V7 |
| `db/migration` | `V7__trechos_da_viagem.sql` | chegada prevista separada e km/carga ponto a ponto |
| `db/migration` | `V8__inicio_explicito_viagens.sql` | fato de início e reservas atômicas por veículo/motorista |
| `db/migration` | `V9__catalogo_servicos_manutencao.sql` | catálogo mestre, independente das manutenções aplicadas |
| `db/migration` | `V10__cnh_motorista_obrigatoria.sql` | CNH normalizada, obrigatória e validada no banco |
| `db/migration` | `V11__ordens_manutencao_multisservico.sql` | fatos reais, linhas de serviço e exclusividade por veículo |
| `db/migration` | `V12__indice_dashboard_viagens_concluidas.sql` | acelera período e série real do Overview pela chegada efetiva |
| `db/migration` | `V902__normaliza_trechos_apos_seed.sql` | converte etapas visuais legadas depois do seed |
| `db/migration` | `V903__garante_trecho_para_toda_viagem.sql` | garante ao menos um trecho também no primeiro boot |
| `db/migration` | `V904__normaliza_inicio_explicito_apos_seed.sql` | converte o estado temporal legado após o seed |
| `db/migration` | `V905__carrega_catalogo_servicos_existentes.sql` | importa os tipos textuais distintos para o catálogo |
| `db/migration` | `V906__normaliza_ordens_manutencao_apos_seed.sql` | migra ordens do seed e remove o formato textual legado |
| `db/seed` | `V900__dados_demonstracao.sql` | dados de demonstração, inclui o usuário de login |
| `db/seed` | `V901__odometro_inicial_demonstracao.sql` | hodômetros iniciais da demonstração |

Ganhos concretos:

- Sobe igual em qualquer Postgres — Docker, Neon, RDS, o banco do avaliador.
- `flyway_schema_history` diz o que rodou, quando e com que checksum.
- Alteração futura é uma `V3`, não uma edição destrutiva de script existente.
- Roda antes do `ddl-auto: validate` do Hibernate, então divergência entre
  entidade e tabela estoura no boot em vez de virar erro em produção.

### Por que o seed fica separado e por que a versão é 900

`db/seed` é uma *location* independente, ligada por variável de ambiente:

```
FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/seed   # padrão: com dados
FLYWAY_LOCATIONS=classpath:db/migration                     # ambiente limpo
```

As duas pastas compartilham a mesma linha do tempo de versões. O salto para
`V900` deixa `V3..V899` livres para o schema continuar evoluindo sem colidir com
o seed nem exigir migration fora de ordem.

**Efeito colateral aceito:** o seed usa datas relativas (`NOW() - INTERVAL '2 days'`,
`CURRENT_DATE + 14`) e o Flyway roda cada migration uma única vez — as datas
congelam no dia em que o banco foi criado. É proposital: o dashboard precisa de
"manutenções futuras" e "projeção do mês atual" com sentido no momento da
avaliação, o que dados fixos de 2024 não dariam. Base velha: `docker compose down -v`.

---

## 2. Nada de coluna de status — status é consulta

Não existe `viagens.status` nem `veiculos.status`. Ambos são derivados:

```sql
-- viagem
cancelada_em IS NOT NULL                            -> CANCELADA
data_chegada IS NOT NULL                            -> CONCLUIDA
iniciada_em IS NOT NULL                             -> EM_ANDAMENTO
caso contrário                                     -> PROGRAMADA
```

`iniciada_em`, `data_chegada` e `cancelada_em` não são status mutáveis: são instantes de fatos
humanos. A saída planejada (`data_saida`) não inicia nem ocupa recursos automaticamente. Isso
permite atraso e início antecipado sem um job de relógio e sem estado denormalizado.

`data_chegada_prevista` não participa do status. Ela pode estar no futuro e é
derivada da previsão do último trecho; `data_chegada` é exclusivamente o fato
real gravado ao concluir. Essa separação evita que uma previsão conclua viagem,
libere veículo ou some quilometragem antes da hora.

`manutencoes.status` é exceção porque **veio no script do desafio** e representa
decisão humana (`EM_REALIZACAO` não é dedutível das datas).

---

## 3. UUID nos veículos — avaliado e recusado

A pergunta era se cada veículo deveria ganhar um identificador único do tipo
UUID. Não deveria. Três leituras da ideia, e por que nenhuma se paga aqui:

**(a) Trocar a PK `SERIAL` por `UUID`.** Reescreveria as FKs de `viagens` e
`manutencoes` — ou seja, reescreveria o script de carga fornecido, que é
justamente o ponto de partida que o desafio manda preservar. Custo alto,
benefício nenhum.

**(b) Adicionar um UUID público ao lado da PK** (`uuid_publico UUID UNIQUE DEFAULT gen_random_uuid()`).
É o padrão "external id", e existe para resolver três problemas:

- gerar id antes de tocar o banco (cliente offline, fila, multi-master);
- fundir bases de origens diferentes sem colisão de id;
- não revelar contagem de linhas em URL pública.

Nenhum se aplica. A API inteira está atrás de JWT, o banco é único, e a
inserção é sempre server-side.

**(c) O argumento que sobra é o de identificador estável e legível — e esse
veículo já tem: a `placa`.** É `UNIQUE NOT NULL` desde o script original, é o
que o operador de frota fala em voz alta, e é o que aparece na tela. Adicionar
um UUID seria criar um segundo identificador natural para competir com o que já
existe.

O custo também não é zero: mais 16 bytes por linha, um segundo índice único a
manter em toda escrita, um salto de índice extra em toda busca pelo id público,
e — em UUID v4 — inserção em posição aleatória da B-tree, que fragmenta o índice
em vez de crescer pela borda. E aplicar só em `veiculos` deixaria a API
incoerente: `/api/viagens/5` numérico ao lado de `/api/veiculos/<uuid>`.

**Onde um UUID de fato ganharia lugar neste projeto:** como chave de
idempotência na *criação de viagem*, gerada pelo formulário e gravada com
`UNIQUE`, para que duplo clique no submit não vire duas viagens. É um campo em
`viagens` a serviço de um problema real, não um id decorativo em `veiculos`.
Fica anotado como melhoria; não está implementado.

---

## 4. Índices

"Eficiência das consultas SQL" é critério explícito de avaliação, e o PostgreSQL
**não** cria índice automático para chave estrangeira — só para PK e UNIQUE.
Todas as 5 métricas do dashboard agregam por veículo ou filtram por data, então
cada índice de `V2` existe para uma consulta nomeada. Dois são **parciais**,
indexando só as linhas que as consultas realmente varrem:

```sql
CREATE UNIQUE INDEX uk_viagens_em_andamento_veiculo ON viagens (veiculo_id)
  WHERE iniciada_em IS NOT NULL AND data_chegada IS NULL AND cancelada_em IS NULL;
CREATE UNIQUE INDEX uk_viagens_em_andamento_motorista ON viagens (motorista_id)
  WHERE motorista_id IS NOT NULL AND iniciada_em IS NOT NULL
    AND data_chegada IS NULL AND cancelada_em IS NULL;
CREATE INDEX idx_manutencoes_agenda ON manutencoes (data_inicio_prevista)
  WHERE status <> 'CONCLUIDA';
CREATE UNIQUE INDEX uk_manutencoes_em_realizacao_veiculo ON manutencoes (veiculo_id)
  WHERE status = 'EM_REALIZACAO';
CREATE INDEX idx_viagens_concluidas_data_chegada ON viagens (data_chegada, veiculo_id)
  WHERE data_chegada IS NOT NULL AND cancelada_em IS NULL;
```

Viagem iniciada e manutenção em realização são minoria permanente da tabela; os índices parciais
ficam menores que índices completos. Os índices `UNIQUE` são a última linha de defesa de
concorrência: duas transações podem passar pela validação amigável em Java, mas somente uma
confirma a reserva. Um bloqueio pessimista comum em `veiculos` serializa também a disputa entre
iniciar uma viagem e iniciar uma manutenção.

O índice de viagens concluídas usa a chegada real, e não a saída planejada: os filtros de 7/30
dias do Overview medem trabalho efetivamente realizado e ignoram antecipadamente linhas abertas
ou canceladas pelo mesmo predicado parcial usado nas consultas.

> Índice parcial é um recurso do PostgreSQL. Uma eventual migração para MySQL
> exigiria reescrever esses dois, além de `DATE_TRUNC` e da sintaxe de `INTERVAL`
> usadas nas métricas.

---

## 5. Credenciais fora do repositório

Nenhuma string de conexão fica escrita em código. `application.yml` só lê
variáveis (`DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `FLYWAY_LOCATIONS`),
e o `logitrack-backend/docker-compose.yml` as repassa com valores padrão de desenvolvimento — o
suficiente para `docker compose up` funcionar dentro desse projeto sem configuração, sem que nenhum
segredo real entre no versionamento. Quem quiser sobrescrever copia
`.env.example` para `.env`, que está no `.gitignore`.

---

## 6. Tabelas ainda sem mapeamento JPA

`V2` cria quatro tabelas; as duas de Viagens já foram integradas. Restam duas que não
têm entidade nem endpoint:

| Tabela | Sustenta | Situação |
|---|---|---|
| `abastecimentos` | futuros indicadores de combustível | sem entidade |
| `despesas` | futuros indicadores de custos | sem entidade |

Não é omissão do `ddl-auto: validate`, que só confere o que está mapeado. São dados disponíveis
para futuros indicadores. `viagem_etapas` e `viagem_eventos` possuem entidades, repositórios e
saem em `GET /api/viagens/{id}/detalhes`.

---

## 7. Rota ponto a ponto e identidade estável dos trechos

Desde a V7, cada linha de `viagem_etapas` representa o deslocamento que termina
em `cidade`. Sua origem é `viagens.origem` no primeiro item e a cidade anterior
nos seguintes. `km_trecho` e `carga_kg` pertencem a esse deslocamento; não são
atributos globais repetidos.

As colunas de resumo em `viagens` continuam por compatibilidade e eficiência de
listagem, mas são sempre derivadas no serviço:

- `destino`: cidade do último trecho;
- `km_percorrida`: soma de `km_trecho`;
- `carga_kg`: carga do primeiro trecho (carga inicial, não soma);
- `data_chegada_prevista`: previsão do último trecho.

O PUT reconcilia pelos IDs em vez de apagar e recriar. Isso é deliberado: o
futuro módulo de romaneio poderá referenciar `viagem_etapas.id` sem quebrar
quando o operador reordenar ou corrigir a rota. Nenhuma tabela de romaneio foi
criada nesta entrega.

---

## 8. Catálogo, linhas de serviço e histórico

`servicos_manutencao` contém apenas `id`, `nome` e `ativo`. O nome possui unicidade sobre
`LOWER(TRIM(nome))`, impedindo duplicatas que diferem somente por caixa. A V905 importa os nomes
distintos que existiam em `manutencoes.tipo_servico`.

A V11 cria `manutencao_servicos`: cada linha possui FK para a ordem e para o catálogo, snapshot
`nome_servico` e `custo`. A restrição `(manutencao_id, servico_manutencao_id)` impede repetir o
mesmo serviço na ordem. O snapshot resolve a preservação histórica: renomear ou desativar o item
do catálogo não muda uma ordem já registrada. A V906 migra o seed, valida datas/status e remove
`tipo_servico` e `custo_estimado`; o custo total passa a ser derivado pela soma das linhas.

`iniciada_em` e `concluida_em` registram as transições reais. A data planejada não reserva o
veículo: apenas `EM_REALIZACAO` ocupa o recurso. Conclusão libera imediatamente o veículo e uma
ordem concluída permanece imutável.

Motoristas e serviços usam desativação lógica. Para motorista, a desativação é recusada enquanto
existir viagem programada ou iniciada ainda não encerrada; isso impede deixar um plano operacional
apontando para uma pessoa indisponível.

`LIVRE` e `EM_USO` também não são persistidos no motorista. A API deriva `EM_USO` da existência de
uma viagem com `iniciada_em` preenchida, sem chegada e sem cancelamento. Assim, conclusão ou
cancelamento libera a pessoa na mesma transação e não há coluna de disponibilidade para sincronizar.

## 9. Migrations e dados demonstrativos


### Contexto

O histórico antigo misturava três responsabilidades:

- `V1` criava tabelas e também inseria registros fictícios;
- o seed usava versões `V900` e `V901` na mesma linha do tempo do schema;
- `V902` a `V906` corrigiam dados que o próprio seed inseria em um formato já
  ultrapassado.

Esse desenho exigia `out-of-order=true`. Uma migration de schema nova podia ter
versão menor que a última versão aplicada, tornando a ordem final dependente do
momento em que cada banco havia sido criado.

### Decisão

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

### Convenção de nomes

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

### Imutabilidade e rebaseline atual

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

### Consequências

- um banco vazio recebe sempre `V1` a `V20`, na mesma ordem;
- produção não recebe usuário ou carga fictícia por omissão;
- novas migrations continuam a partir de `V21`;
- alterar o seed não interfere na versão atual do schema;
- dados legados reais continuam sendo tratados dentro da migration que altera
  seu formato, antes da remoção de colunas antigas.

## 10. As cinco métricas do desafio, em SQL

Referência das consultas que a camada Java executa como native query. Mantidas
aqui para revisão e para permitir rodar `EXPLAIN` sem subir a aplicação.

**Regra de negócio que atravessa todas elas:** quilometragem só se torna
realizada quando a chegada real é registrada. Viagem programada ou em andamento
ainda representa plano de rota; cancelada nunca entra. Por isso o filtro exige
`data_chegada`.

```sql

-- 1. TOTAL DE KM PERCORRIDO
--    "Soma da quilometragem de um veiculo especifico ou de toda a frota."
--    O parametro nulo faz o filtro sumir, evitando duas consultas.
SELECT COALESCE(SUM(v.km_percorrida), 0) AS total_km
FROM viagens v
JOIN veiculos ve ON ve.id = v.veiculo_id
WHERE v.data_chegada IS NOT NULL
  AND v.cancelada_em IS NULL
  AND (:veiculo_id IS NULL OR v.veiculo_id = :veiculo_id)
  AND (CAST(:inicio AS TIMESTAMP) IS NULL OR v.data_chegada >= CAST(:inicio AS TIMESTAMP))
  AND (CAST(:fim AS TIMESTAMP) IS NULL OR v.data_chegada < CAST(:fim AS TIMESTAMP))
  AND (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT));


-- 2. VOLUME POR CATEGORIA
--    "Quantidade de viagens realizadas filtradas por tipo de veiculo."
--    LEFT JOIN a partir de veiculos garante a linha 'LEVE' ou 'PESADO' com
--    zero quando nenhuma viagem existe — um INNER JOIN sumiria com a categoria.
SELECT ve.tipo,
       COUNT(v.id)                        AS total_viagens,
       COALESCE(SUM(v.km_percorrida), 0)  AS total_km
FROM veiculos ve
LEFT JOIN viagens v
       ON v.veiculo_id = ve.id
      AND v.data_chegada IS NOT NULL
      AND v.cancelada_em IS NULL
      AND (CAST(:inicio AS TIMESTAMP) IS NULL OR v.data_chegada >= CAST(:inicio AS TIMESTAMP))
      AND (CAST(:fim AS TIMESTAMP) IS NULL OR v.data_chegada < CAST(:fim AS TIMESTAMP))
WHERE (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
GROUP BY ve.tipo
ORDER BY ve.tipo;


-- 3. CRONOGRAMA DE MANUTENCAO
--    "Listagem das proximas 5 manutencoes agendadas (ordenadas por data)."
--    Usa idx_manutencoes_agenda (indice parcial em status <> 'CONCLUIDA').
SELECT m.id,
       ve.placa,
       ve.modelo,
       m.data_inicio_prevista,
       STRING_AGG(ms.nome_servico, ', ' ORDER BY ms.id) AS servicos,
       COALESCE(SUM(ms.custo), 0) AS custo_estimado,
       m.status
FROM manutencoes m
JOIN veiculos ve ON ve.id = m.veiculo_id
JOIN manutencao_servicos ms ON ms.manutencao_id = m.id
WHERE m.status <> 'CONCLUIDA'
  AND m.data_inicio_prevista >= CURRENT_DATE
  AND (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
GROUP BY m.id, ve.placa, ve.modelo, m.data_inicio_prevista, m.status
ORDER BY m.data_inicio_prevista
LIMIT 5;


-- 4. RANKING DE UTILIZACAO
--    "Identificar qual veiculo possui a maior soma de quilometragem acumulada."
--    Retorna a lista ordenada; a tela mostra o topo e o Java pega o primeiro
--    quando precisa so do campeao. Uma consulta serve aos dois usos.
SELECT ve.id,
       ve.placa,
       ve.modelo,
       ve.tipo,
       COALESCE(SUM(v.km_percorrida), 0) AS km_acumulado
FROM veiculos ve
LEFT JOIN viagens v
       ON v.veiculo_id = ve.id
      AND v.data_chegada IS NOT NULL
      AND v.cancelada_em IS NULL
      AND (CAST(:inicio AS TIMESTAMP) IS NULL OR v.data_chegada >= CAST(:inicio AS TIMESTAMP))
      AND (CAST(:fim AS TIMESTAMP) IS NULL OR v.data_chegada < CAST(:fim AS TIMESTAMP))
WHERE (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
GROUP BY ve.id, ve.placa, ve.modelo, ve.tipo
HAVING CAST(:inicio AS TIMESTAMP) IS NULL OR COUNT(v.id) > 0
ORDER BY km_acumulado DESC;


-- 5. PROJECAO FINANCEIRA
--    "Soma do custo total estimado em manutencoes para o mes atual."
--    O intervalo semiaberto [inicio do mes, inicio do proximo) permite usar
--    idx_manutencoes_data; DATE_TRUNC sobre a coluna impediria o indice.
SELECT COALESCE(SUM(ms.custo), 0) AS custo_previsto_mes
FROM manutencoes m
JOIN manutencao_servicos ms ON ms.manutencao_id = m.id
JOIN veiculos ve ON ve.id = m.veiculo_id
WHERE m.data_inicio_prevista >= DATE_TRUNC('month', CURRENT_DATE)
  AND m.data_inicio_prevista < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  AND (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT));


-- SERIE AUXILIAR DO CARD DE DISTANCIA (nao substitui nenhuma das 5 metricas)
SELECT CAST(v.data_chegada AS DATE) AS data,
       COALESCE(SUM(v.km_percorrida), 0) AS total_km
FROM viagens v
JOIN veiculos ve ON ve.id = v.veiculo_id
WHERE v.data_chegada IS NOT NULL
  AND v.cancelada_em IS NULL
  AND (:veiculo_id IS NULL OR v.veiculo_id = :veiculo_id)
  AND v.data_chegada >= CAST(:inicio AS TIMESTAMP)
  AND v.data_chegada < CAST(:fim AS TIMESTAMP)
  AND (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
GROUP BY CAST(v.data_chegada AS DATE)
ORDER BY data;
```
