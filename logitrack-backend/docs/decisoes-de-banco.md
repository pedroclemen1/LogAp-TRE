# Decisões de banco

Registro das escolhas de modelagem e de infraestrutura de dados do LogiTrack Pro.
O desafio dá "liberdade total para adicionar novas tabelas ou colunas" exigindo
justificativa — este documento é essa justificativa, e o que não foi feito
também está aqui.

---

## 1. O schema pertence ao backend (Flyway), não ao container do Postgres

As migrations vivem em `src/main/resources/db` e são aplicadas pelo Flyway no boot da API — não por
scripts montados em `/docker-entrypoint-initdb.d`.

A alternativa do container oficial do Postgres amarra o schema a um detalhe da imagem: roda somente no
**primeiro** boot do volume, funciona somente em Docker, e não deixa registro do que já foi aplicado.
Com o Flyway dentro da aplicação, o mesmo schema sobe em qualquer Postgres e o histórico fica no
próprio banco.

O schema é uma sequência linear de `V1` a `V20` em `db/migration`, cada versão com uma
responsabilidade. As mais estruturais:

| Versão | Decisão persistida |
|---|---|
| `V1__cria_estrutura_basica.sql` | veículos, viagens e manutenções — a estrutura fundamental do domínio |
| `V2__estrutura_complementar.sql` | usuários, motoristas e os índices das consultas do dashboard |
| `V3__km_inicial_veiculos.sql` | hodômetro de entrada, sem duplicar o atual derivado |
| `V4__cancelamento_viagens.sql` | timestamp do fato humano de cancelamento |
| `V5`, `V6`, `V12` | índices parciais das consultas operacionais e do dashboard |
| `V7__trechos_da_viagem.sql` | chegada prevista separada e km/carga ponto a ponto |
| `V8__inicio_explicito_viagens.sql` | fato de início e reservas atômicas por veículo e motorista |
| `V9__catalogo_servicos_manutencao.sql` | catálogo mestre, independente das ordens aplicadas |
| `V10__cnh_motorista_obrigatoria.sql` | CNH normalizada, obrigatória e validada no banco |
| `V11__normaliza_ordens_manutencao.sql` | linhas de serviço por ordem e exclusividade por veículo |
| `V13__conclusao_trecho_a_trecho.sql` | conclusão por trecho em vez de apenas no destino final |
| `V14`, `V15`, `V19` | romaneio de carga, emissão por trecho e código de integridade |
| `V17`, `V20` | troca obrigatória da senha inicial e versionamento de credenciais |
| `V18__convites_de_usuario.sql` | token em hash, expiração, revogação e uso único |

Ganhos concretos:

- Sobe igual em qualquer Postgres — Docker, Neon, RDS, o banco do avaliador.
- `flyway_schema_history` diz o que rodou, quando e com que checksum.
- Alteração futura é uma versão nova, não uma edição destrutiva de script existente.
- Roda antes do `ddl-auto: validate` do Hibernate, então divergência entre
  entidade e tabela estoura no boot em vez de virar erro em produção.

### Por que o seed fica em uma location separada

`db/seed` é uma *location* independente, e é o perfil de execução que decide se ela entra:

```yaml
# application.yml e application-prod.yml
locations: classpath:db/migration
# application-dev.yml
locations: classpath:db/migration,classpath:db/seed
```

Produção nunca alcança a massa de demonstração, e isso é verificável: o histórico do Flyway em
produção contém apenas as versões de schema, enquanto o ambiente local contém uma entrada adicional
para o seed.

O seed usa o prefixo **repetível** `R__` em vez de uma versão numerada. Assim ele roda depois de
todas as versionadas, não ocupa um número na sequência do schema, e alterá-lo não interfere na versão
atual. Cada bloco é idempotente (`ON CONFLICT DO NOTHING`, `WHERE NOT EXISTS`), então uma nova
execução por mudança de checksum não duplica o conjunto já carregado.

As datas do seed são relativas a `CURRENT_DATE`, para que "próximas manutenções" e "projeção do mês
atual" tenham sentido no dia em que o ambiente for aberto. Um conjunto de datas fixas perderia
significado no dashboard com o passar do tempo.

---

## 2. Status é consulta, não coluna

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

## 3. Identificador dos veículos: `SERIAL`, e não UUID

Avaliei adotar UUID como identificador de veículo e mantive a chave numérica. O UUID resolve
problemas concretos, e vale registrar quais são, porque nenhum deles existe neste sistema.

A ideia se desdobra em três formas, cada uma com um custo diferente:

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

**(c) Usá-lo como identificador estável e legível.** É o único argumento que sobreviveria aos dois
anteriores, e o veículo já atende a ele pela `placa`: `UNIQUE NOT NULL` desde o script original, é o
que o operador de frota fala em voz alta e o que aparece na tela. Um UUID aqui seria um segundo
identificador natural competindo com o que já existe.

O custo tampouco é nulo: mais 16 bytes por linha, um segundo índice único a
manter em toda escrita, um salto de índice extra em toda busca pelo id público,
e — em UUID v4 — inserção em posição aleatória da B-tree, que fragmenta o índice
em vez de crescer pela borda. Aplicá-lo apenas em `veiculos` também deixaria a API
incoerente: `/api/viagens/5` numérico ao lado de `/api/veiculos/<uuid>`.

**O lugar onde um UUID se pagaria aqui é outro:** como chave de idempotência na *criação de viagem*,
gerada pelo formulário e gravada com `UNIQUE`, para que um duplo clique no submit não produza duas
viagens. Seria um campo em `viagens` a serviço de um problema real, e não um identificador decorativo
em `veiculos`. Está mapeado como próximo passo, fora do escopo atual.

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

Nenhuma string de conexão fica escrita em código. `application.yml` apenas lê variáveis de ambiente
(`DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `BFF_SHARED_SECRET`, entre outras), e o
`docker-compose.yml` as repassa com valores padrão de desenvolvimento — o suficiente para
`docker compose up` funcionar sem configuração adicional, sem que nenhum segredo real entre no
versionamento.

Fora do perfil `dev` não existe valor padrão para segredo, banco ou origem de CORS: se a variável
faltar, o startup falha em vez de subir com configuração local silenciosamente.

Quem quiser sobrescrever localmente copia `.env.example` para `.env`, que está no `.gitignore`.

---

## 6. Toda tabela tem entidade e caso de uso

Não há tabela sem mapeamento JPA. Isso é uma escolha: `ddl-auto: validate` confere apenas o que está
mapeado, então uma tabela órfã não seria verificada por ninguém e acumularia divergência em silêncio.

`viagem_etapas` e `viagem_eventos` possuem entidades e repositórios, e são expostas em
`GET /api/viagens/{id}/detalhes`. `manutencao_servicos` e `romaneio_itens` são coleções mapeadas a
partir de suas agregadas.

Estruturas para indicadores que não existem no escopo — combustível, despesas operacionais — não
foram criadas. Quando o caso de uso existir, a migration nasce junto com a entidade e o endpoint.

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

O PUT reconcilia pelos IDs em vez de apagar e recriar. Isso é o que permite ao romaneio referenciar
`viagem_etapas.id` com segurança: cada documento cobre um trecho específico, e reordenar ou corrigir
a rota não invalida um documento já emitido. Apagar e recriar geraria IDs novos e romperia essa
referência.

A reordenação move as posições para valores negativos temporários antes do flush, para não colidir
com a restrição `UNIQUE (viagem_id, ordem)` durante a troca.

---

## 8. Catálogo, linhas de serviço e histórico

`servicos_manutencao` contém apenas `id`, `nome` e `ativo`. O nome possui unicidade sobre
`LOWER(TRIM(nome))`, impedindo duplicatas que diferem somente por caixa ou espaço.

`manutencao_servicos` liga a ordem ao catálogo: cada linha possui FK para os dois lados, mais um
**snapshot** de `nome_servico` e `custo`. A restrição `(manutencao_id, servico_manutencao_id)` impede
repetir o mesmo serviço na mesma ordem.

O snapshot é o que preserva o histórico. Renomear ou desativar um item do catálogo não pode reescrever
uma ordem já registrada — sem a cópia, mudar "Troca de Óleo" para "Troca de Óleo Sintético"
reescreveria anos de histórico. O custo total da ordem é derivado da soma das linhas, e não guardado
em coluna própria.

`iniciada_em` e `concluida_em` registram as transições reais. A data planejada não reserva o
veículo: apenas `EM_REALIZACAO` ocupa o recurso. Conclusão libera imediatamente o veículo e uma
ordem concluída permanece imutável.

Motoristas e serviços usam desativação lógica. Para motorista, a desativação é recusada enquanto
existir viagem programada ou iniciada ainda não encerrada; isso impede deixar um plano operacional
apontando para uma pessoa indisponível.

`LIVRE` e `EM_USO` também não são persistidos no motorista. A API deriva `EM_USO` da existência de
uma viagem com `iniciada_em` preenchida, sem chegada e sem cancelamento. Assim, conclusão ou
cancelamento libera a pessoa na mesma transação e não há coluna de disponibilidade para sincronizar.

## 9. Regras de migration

1. `db/migration` contém somente schema e os backfills necessários para dados reais.
2. As versões formam uma **sequência crescente** e não usam `out-of-order`. Um banco vazio recebe
   sempre `V1` a `V20`, na mesma ordem, em qualquer ambiente.
3. `db/seed` contém somente dados opcionais de demonstração, e apenas o perfil `dev` o inclui.
4. Testes não carregam o seed: cada teste monta o cenário mínimo de que precisa. Isso mantém os
   testes independentes entre si e legíveis sem consultar a massa.

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

As migrations de autenticação seguem a mesma regra de uma responsabilidade por versão:

| Migration | Decisão persistida |
| --- | --- |
| `V17__troca_obrigatoria_senha_usuario.sql` | estado de primeiro acesso, sem armazenar senha temporária em outra tabela |
| `V18__convites_de_usuario.sql` | token armazenado como hash, expiração, revogação, uso único e unicidade case-insensitive do e-mail |
| `V19__amplia_codigo_integridade_romaneio.sql` | checksums mais longos, preservando documentos emitidos no formato anterior |
| `V20__versiona_credenciais_usuario.sql` | versão incrementada na troca de senha, para revogar JWTs anteriores |

### Imutabilidade

**Uma versão aplicada é imutável.** Editar o arquivo altera seu checksum, e o Flyway recusa a
inicialização com `Migration checksum mismatch` — a aplicação não sobe. Qualquer correção recebe uma
versão nova.

`flyway repair` **não** é a saída para divergência de checksum. Ele apenas reescreve o histórico para
aceitar o arquivo atual; se a edição acrescentou DDL, o objeto continua ausente no banco e o ambiente
passa a divergir silenciosamente de um deploy limpo. Em desenvolvimento, o correto é recriar:

```bash
docker compose down -v
docker compose up -d --build
```

Depois de adicionar, remover ou renomear um arquivo SQL, valide com `clean` no comando:

```bash
./mvnw clean verify
```

O `clean` importa porque o Maven não remove de `target/classes` a cópia de um resource renomeado. Sem
ele, o Flyway encontraria o nome antigo e o novo no mesmo artefato.

### Consequências

- novas migrations continuam a partir de `V21`;
- alterar o seed não interfere na versão atual do schema;
- transformação de dados reais acontece dentro da migration que altera o formato, antes da remoção
  das colunas antigas.

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
