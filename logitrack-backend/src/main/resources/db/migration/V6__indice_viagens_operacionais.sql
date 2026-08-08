-- A chegada pode ser futura (previsao). O indice precisa cobrir viagens validas
-- por veiculo e deixar `data_chegada` disponivel para o predicado temporal.
DROP INDEX idx_viagens_em_andamento;

CREATE INDEX idx_viagens_em_andamento
    ON viagens (veiculo_id, data_chegada)
    WHERE cancelada_em IS NULL;
