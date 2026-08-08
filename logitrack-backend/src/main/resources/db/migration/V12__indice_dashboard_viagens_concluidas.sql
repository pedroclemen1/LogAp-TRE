-- As metricas historicas do Dashboard usam a chegada real como limite do
-- periodo. O indice parcial ignora viagens abertas e canceladas, exatamente o
-- mesmo predicado das consultas, e mantem o veiculo para filtros/ranking.
CREATE INDEX idx_viagens_concluidas_data_chegada
    ON viagens (data_chegada, veiculo_id)
    WHERE data_chegada IS NOT NULL AND cancelada_em IS NULL;
