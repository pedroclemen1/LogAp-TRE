-- Converte o modelo legado de um unico texto/custo por manutencao para ordens
-- com varios servicos. Todo backfill acontece aqui, antes de remover as
-- colunas antigas, e independe da existencia de dados demonstrativos.

ALTER TABLE manutencoes
    ADD COLUMN iniciada_em  TIMESTAMP,
    ADD COLUMN concluida_em TIMESTAMP;

UPDATE manutencoes
SET status = 'PENDENTE'
WHERE status IS NULL;

ALTER TABLE manutencoes
    ALTER COLUMN status SET DEFAULT 'PENDENTE',
    ALTER COLUMN status SET NOT NULL;

CREATE TABLE manutencao_servicos (
    id                     SERIAL PRIMARY KEY,
    manutencao_id          INTEGER NOT NULL REFERENCES manutencoes(id) ON DELETE CASCADE,
    servico_manutencao_id  INTEGER NOT NULL REFERENCES servicos_manutencao(id),
    nome_servico           VARCHAR(100) NOT NULL,
    custo                  DECIMAL(10,2) NOT NULL CHECK (custo >= 0),
    CONSTRAINT uk_manutencao_servico UNIQUE (manutencao_id, servico_manutencao_id)
);

CREATE INDEX idx_manutencao_servicos_manutencao
    ON manutencao_servicos (manutencao_id);

CREATE INDEX idx_manutencao_servicos_catalogo
    ON manutencao_servicos (servico_manutencao_id);

-- Antes da normalizacao, o catalogo precisa conhecer todos os textos legados.
-- Valor ausente recebe um nome explicito em vez de desaparecer silenciosamente.
INSERT INTO servicos_manutencao (nome)
SELECT DISTINCT COALESCE(NULLIF(TRIM(tipo_servico), ''), 'Servico nao informado')
FROM manutencoes
ON CONFLICT DO NOTHING;

INSERT INTO manutencao_servicos (
    manutencao_id, servico_manutencao_id, nome_servico, custo
)
SELECT m.id,
       s.id,
       COALESCE(NULLIF(TRIM(m.tipo_servico), ''), 'Servico nao informado'),
       COALESCE(m.custo_estimado, 0)
FROM manutencoes m
JOIN servicos_manutencao s
  ON LOWER(TRIM(s.nome)) = LOWER(
      COALESCE(NULLIF(TRIM(m.tipo_servico), ''), 'Servico nao informado')
  );

-- Converte estados historicos em fatos auditaveis. Quando o instante real nao
-- existia no modelo antigo, a melhor evidencia disponivel e a data planejada.
UPDATE manutencoes
SET data_finalizacao = data_inicio
WHERE data_finalizacao IS NULL;

UPDATE manutencoes
SET iniciada_em = data_inicio::timestamp
WHERE status IN ('EM_REALIZACAO', 'CONCLUIDA');

UPDATE manutencoes
SET concluida_em = data_finalizacao::timestamp
WHERE status = 'CONCLUIDA';

ALTER TABLE manutencoes
    ALTER COLUMN veiculo_id SET NOT NULL,
    ALTER COLUMN data_finalizacao SET NOT NULL,
    ADD CONSTRAINT ck_manutencoes_periodo_previsto
        CHECK (data_finalizacao >= data_inicio),
    ADD CONSTRAINT ck_manutencoes_status
        CHECK (status IN ('PENDENTE', 'EM_REALIZACAO', 'CONCLUIDA')),
    ADD CONSTRAINT ck_manutencoes_fluxo
        CHECK (
            (status = 'PENDENTE' AND iniciada_em IS NULL AND concluida_em IS NULL)
            OR
            (status = 'EM_REALIZACAO' AND iniciada_em IS NOT NULL AND concluida_em IS NULL)
            OR
            (status = 'CONCLUIDA' AND iniciada_em IS NOT NULL AND concluida_em IS NOT NULL)
        ),
    ADD CONSTRAINT ck_manutencoes_datas_reais
        CHECK (concluida_em IS NULL OR concluida_em >= iniciada_em);

ALTER TABLE manutencoes
    RENAME COLUMN data_inicio TO data_inicio_prevista;

ALTER TABLE manutencoes
    RENAME COLUMN data_finalizacao TO data_finalizacao_prevista;

ALTER TABLE manutencoes
    DROP COLUMN tipo_servico,
    DROP COLUMN custo_estimado;

CREATE UNIQUE INDEX uk_manutencoes_em_realizacao_veiculo
    ON manutencoes (veiculo_id)
    WHERE status = 'EM_REALIZACAO';
