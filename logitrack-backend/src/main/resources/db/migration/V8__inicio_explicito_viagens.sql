-- O inicio passa a ser um fato explicito. data_saida continua sendo a partida
-- planejada; iniciada_em registra quando o operador efetivamente iniciou.
ALTER TABLE viagens
    ADD COLUMN iniciada_em TIMESTAMP;

-- Preserva o estado das bases existentes sob a regra anterior, que considerava
-- iniciada toda viagem cuja data de saida ja tivesse chegado.
UPDATE viagens
SET iniciada_em = data_saida
WHERE iniciada_em IS NULL
  AND cancelada_em IS NULL
  AND data_saida <= NOW();

DROP INDEX idx_viagens_em_andamento;

-- Alem da validacao amigavel no servico, estes indices fecham a corrida entre
-- duas requisicoes concorrentes tentando reservar o mesmo recurso.
CREATE UNIQUE INDEX uk_viagens_em_andamento_veiculo
    ON viagens (veiculo_id)
    WHERE iniciada_em IS NOT NULL
      AND data_chegada IS NULL
      AND cancelada_em IS NULL;

CREATE UNIQUE INDEX uk_viagens_em_andamento_motorista
    ON viagens (motorista_id)
    WHERE motorista_id IS NOT NULL
      AND iniciada_em IS NOT NULL
      AND data_chegada IS NULL
      AND cancelada_em IS NULL;

COMMENT ON COLUMN viagens.iniciada_em IS
    'Inicio real e explicito; enquanto nulo, a viagem permanece programada.';
