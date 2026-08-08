-- =============================================================================
-- V7 — rota ponto a ponto e separacao entre previsao e chegada real
--
-- Cada linha de viagem_etapas passa a representar o TRECHO que termina em
-- `cidade`: a origem e o destino do trecho anterior (ou viagens.origem no
-- primeiro), e km/carga pertencem exclusivamente a esse deslocamento.
-- =============================================================================

ALTER TABLE viagens
    ADD COLUMN data_chegada_prevista TIMESTAMP;

-- Datas futuras eram previsoes armazenadas no campo de chegada real.
UPDATE viagens
SET data_chegada_prevista = data_chegada;

UPDATE viagens
SET data_chegada = NULL
WHERE data_chegada > NOW();

ALTER TABLE viagem_etapas
    ADD COLUMN km_trecho DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN carga_kg  DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_viagem_etapa_km_nao_negativa CHECK (km_trecho >= 0),
    ADD CONSTRAINT chk_viagem_etapa_carga_nao_negativa CHECK (carga_kg >= 0);

-- Toda viagem precisa de ao menos um trecho. Cobre registros antigos que nao
-- tinham etapas porque a tabela so foi introduzida na V2.
INSERT INTO viagem_etapas (
    viagem_id, ordem, cidade, previsto_em, realizado_em, km_trecho, carga_kg
)
SELECT v.id, 1, v.destino, v.data_chegada_prevista, v.data_chegada,
       v.km_percorrida, COALESCE(v.carga_kg, 0)
FROM viagens v
WHERE NOT EXISTS (
    SELECT 1 FROM viagem_etapas e WHERE e.viagem_id = v.id
);

-- O modelo anterior persistia a origem como a primeira etapa. No modelo de
-- trechos ela e implicita e mora em viagens.origem, por isso a linha sai.
DELETE FROM viagem_etapas origem
USING viagens v
WHERE origem.viagem_id = v.id
  AND origem.ordem = (
      SELECT MIN(e.ordem) FROM viagem_etapas e WHERE e.viagem_id = v.id
  )
  AND LOWER(TRIM(origem.cidade)) = LOWER(TRIM(v.origem))
  AND EXISTS (
      SELECT 1 FROM viagem_etapas outra
      WHERE outra.viagem_id = origem.viagem_id AND outra.id <> origem.id
  );

-- Renumera depois da remocao da origem. A constraint e recriada com nome
-- explicito para as proximas migrations nao dependerem de nome automatico.
ALTER TABLE viagem_etapas
    DROP CONSTRAINT viagem_etapas_viagem_id_ordem_key;

WITH ordenadas AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY viagem_id ORDER BY ordem, id)::SMALLINT AS nova_ordem
    FROM viagem_etapas
)
UPDATE viagem_etapas e
SET ordem = o.nova_ordem
FROM ordenadas o
WHERE o.id = e.id;

ALTER TABLE viagem_etapas
    ADD CONSTRAINT uk_viagem_etapas_viagem_ordem UNIQUE (viagem_id, ordem);

-- Nao e possivel repartir retroativamente o total entre paradas antigas sem
-- inventar dados. O total real fica no ultimo trecho; anteriores ficam em zero
-- e podem ser corrigidos pelo operador na proxima edicao.
WITH finais AS (
    SELECT viagem_id, MAX(ordem) AS ordem
    FROM viagem_etapas
    GROUP BY viagem_id
)
UPDATE viagem_etapas e
SET km_trecho  = v.km_percorrida,
    carga_kg   = COALESCE(v.carga_kg, 0),
    previsto_em = COALESCE(e.previsto_em, v.data_chegada_prevista),
    realizado_em = COALESCE(e.realizado_em, v.data_chegada)
FROM finais f
JOIN viagens v ON v.id = f.viagem_id
WHERE e.viagem_id = f.viagem_id
  AND e.ordem = f.ordem;

-- Os defaults existiram apenas durante o backfill. Novas gravacoes devem
-- sempre informar distancia e carga conscientemente.
ALTER TABLE viagem_etapas
    ALTER COLUMN km_trecho DROP DEFAULT,
    ALTER COLUMN carga_kg DROP DEFAULT;

DROP INDEX idx_viagens_em_andamento;

CREATE INDEX idx_viagens_em_andamento
    ON viagens (veiculo_id)
    WHERE data_chegada IS NULL AND cancelada_em IS NULL;

COMMENT ON COLUMN viagens.data_chegada_prevista IS
    'Previsao do ultimo trecho. data_chegada permanece exclusivamente a chegada real.';
COMMENT ON COLUMN viagem_etapas.km_trecho IS
    'Distancia desde a origem da viagem ou o destino do trecho anterior.';
COMMENT ON COLUMN viagem_etapas.carga_kg IS
    'Carga transportada exclusivamente neste trecho.';
