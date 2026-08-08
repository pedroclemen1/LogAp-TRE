-- V4 introduziu cancelamento. O indice de viagens abertas da V2 precisa agora
-- ignorar canceladas para acompanhar a mesma regra usada pela Frota.
DROP INDEX idx_viagens_em_andamento;

CREATE INDEX idx_viagens_em_andamento
    ON viagens (veiculo_id)
    WHERE data_chegada IS NULL AND cancelada_em IS NULL;
