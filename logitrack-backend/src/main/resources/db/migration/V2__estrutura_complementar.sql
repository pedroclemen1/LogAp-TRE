-- =============================================================================
-- V2 — estrutura complementar ao schema inicial (V1)
--
-- PRINCIPIO ADOTADO: nao criar coluna para o que pode ser derivado por SQL.
-- Status de viagem e status de veiculo sao consultas, nao campos — evita dado
-- denormalizado que sai de sincronia (uma viagem "EM_ANDAMENTO" gravada em
-- coluna continuaria em andamento para sempre se ninguem rodar um job).
--
-- Esta migration contem apenas DDL. Dados de demonstracao sao carregados por
-- uma migration repetivel isolada em db/seed, quando o ambiente opta por ela.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. AUTENTICACAO
--
-- Senha guardada como hash BCrypt; o campo
-- comporta os 60 caracteres do formato $2y$/$2a$.
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(150) UNIQUE NOT NULL,
    senha_hash    VARCHAR(72)  NOT NULL,
    nome          VARCHAR(100) NOT NULL,
    perfil        VARCHAR(20)  NOT NULL DEFAULT 'OPERADOR'
                  CHECK (perfil IN ('OPERADOR', 'GESTOR')),
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 2. MOTORISTAS  (tela Detalhes da Viagem)
--
-- A tela mostra nome e avatar do condutor. Sem esta tabela o campo seria texto
-- solto em `viagens`, impedindo relatorio por motorista.
-- -----------------------------------------------------------------------------
CREATE TABLE motoristas (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(100) NOT NULL,
    cnh           VARCHAR(20) UNIQUE,
    telefone      VARCHAR(20),
    ativo         BOOLEAN NOT NULL DEFAULT TRUE
);


-- -----------------------------------------------------------------------------
-- 3. COLUNAS NOVAS EM `viagens`
--
-- motorista_id: quem conduziu (tela de Detalhes).
-- carga_kg:     "Current Load" na tela de Detalhes.
--
-- NAO foi criada coluna de status. Ele e derivado:
--   data_chegada IS NOT NULL                        -> CONCLUIDA
--   data_saida <= NOW() AND data_chegada IS NULL    -> EM_ANDAMENTO
--   data_saida >  NOW()                             -> PROGRAMADA
-- -----------------------------------------------------------------------------
ALTER TABLE viagens
    ADD COLUMN motorista_id INTEGER REFERENCES motoristas(id) ON DELETE SET NULL,
    ADD COLUMN carga_kg     DECIMAL(10,2);


-- -----------------------------------------------------------------------------
-- 4. ETAPAS DA ROTA  (trilho visual da tela de Detalhes da Viagem)
--
-- `viagens` guarda apenas origem e destino. A tela mostra paradas intermediarias
-- com horario previsto e realizado, o que exige uma tabela filha ordenada.
-- -----------------------------------------------------------------------------
CREATE TABLE viagem_etapas (
    id                SERIAL PRIMARY KEY,
    viagem_id         INTEGER NOT NULL REFERENCES viagens(id) ON DELETE CASCADE,
    ordem             SMALLINT NOT NULL,
    cidade            VARCHAR(100) NOT NULL,
    previsto_em       TIMESTAMP,
    realizado_em      TIMESTAMP,
    UNIQUE (viagem_id, ordem)
);


-- -----------------------------------------------------------------------------
-- 5. EVENTOS DA VIAGEM  ("Change Log" da tela de Detalhes)
--
-- Trilha de auditoria append-only. `autor` e texto livre porque o evento pode
-- vir do sistema ("Auto-System"), nao so de um usuario cadastrado.
-- -----------------------------------------------------------------------------
CREATE TABLE viagem_eventos (
    id            SERIAL PRIMARY KEY,
    viagem_id     INTEGER NOT NULL REFERENCES viagens(id) ON DELETE CASCADE,
    tipo          VARCHAR(30) NOT NULL
                  CHECK (tipo IN ('CRIADA', 'INICIADA', 'ROTA_ATUALIZADA', 'CONCLUIDA', 'CANCELADA')),
    titulo        VARCHAR(120) NOT NULL,
    detalhe       VARCHAR(500),
    autor         VARCHAR(100) NOT NULL,
    ocorrido_em   TIMESTAMP NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 6. INDICES
--
-- Chaves estrangeiras nao ganham indice automatico no PostgreSQL. As consultas
-- do dashboard agregam por veiculo ou filtram por data.
-- -----------------------------------------------------------------------------

-- Total de KM e Ranking de Utilizacao: SUM(km) GROUP BY veiculo_id
CREATE INDEX idx_viagens_veiculo        ON viagens (veiculo_id);
-- Volume por Categoria e serie temporal: filtro por periodo
CREATE INDEX idx_viagens_data_saida     ON viagens (data_saida);
-- Status derivado "EM_ANDAMENTO": viagens abertas sao poucas, indice parcial
CREATE INDEX idx_viagens_em_andamento   ON viagens (veiculo_id) WHERE data_chegada IS NULL;

-- Cronograma: ORDER BY data_inicio com filtro de status
CREATE INDEX idx_manutencoes_agenda     ON manutencoes (data_inicio) WHERE status <> 'CONCLUIDA';
-- Projecao Financeira: SUM(custo) por mes
CREATE INDEX idx_manutencoes_veiculo    ON manutencoes (veiculo_id);
CREATE INDEX idx_manutencoes_data       ON manutencoes (data_inicio);

CREATE INDEX idx_viagem_etapas_viagem   ON viagem_etapas (viagem_id, ordem);
CREATE INDEX idx_viagem_eventos_viagem  ON viagem_eventos (viagem_id, ocorrido_em DESC);
