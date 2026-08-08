-- =============================================================================
-- V4 — fato de cancelamento da viagem
--
-- PROGRAMADA, EM_ANDAMENTO e CONCLUIDA continuam derivados de data_saida e
-- data_chegada. Cancelamento e diferente: e uma decisao humana que nao pode ser
-- inferida do relogio. Guardamos o fato (`cancelada_em`), nao uma coluna de
-- status mutavel. O status CANCELADA e derivado da presenca desse timestamp.
-- =============================================================================

ALTER TABLE viagens
    ADD COLUMN cancelada_em TIMESTAMP;

CREATE INDEX idx_viagens_canceladas
    ON viagens (cancelada_em)
    WHERE cancelada_em IS NOT NULL;

COMMENT ON COLUMN viagens.cancelada_em IS
    'Momento do cancelamento. Nulo enquanto a viagem permanece valida.';
