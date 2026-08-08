-- =============================================================================
-- V13 — conclusao trecho a trecho
--
-- A viagem so podia ser encerrada de uma vez: `concluir` marcava a chegada e
-- carimbava apenas o ULTIMO trecho. Os intermediarios ficavam para sempre sem
-- `realizado_em`, entao nao havia registro de quando a carga passou por cada
-- ponto da rota.
--
-- O romaneio precisa exatamente disso: hora de chegada POR TRECHO. Sem o dado
-- gravado no momento certo, o documento teria de inventar horarios ou omiti-los.
--
-- Esta migration apenas abre espaco para o novo evento de auditoria. A regra de
-- ordem (so o proximo trecho pendente pode ser concluido) vive no dominio, em
-- TripService.completeStage — nao ha coluna nova: `realizado_em` ja existe
-- desde a V2 e continua sendo a unica fonte da verdade.
-- =============================================================================

-- O CHECK precisa ser recriado: o Postgres nao tem ALTER ... ADD VALUE para
-- constraint de lista, so para tipo ENUM nativo — e aqui a coluna e VARCHAR.
ALTER TABLE viagem_eventos DROP CONSTRAINT viagem_eventos_tipo_check;

ALTER TABLE viagem_eventos ADD CONSTRAINT viagem_eventos_tipo_check
    CHECK (tipo IN ('CRIADA', 'INICIADA', 'ROTA_ATUALIZADA', 'CONCLUIDA', 'CANCELADA', 'TRECHO_CONCLUIDO'));

-- Consulta da listagem de viagens: monta a rota completa (origem -> paradas ->
-- destino) buscando os trechos de varias viagens de uma vez. Sem este indice o
-- planner varre a tabela inteira; o par (viagem_id, ordem) ja existe como
-- idx_viagem_etapas_viagem e atende, entao nada novo e criado aqui.
COMMENT ON COLUMN viagem_etapas.realizado_em IS
    'Chegada REAL neste ponto da rota. Gravada trecho a trecho pelo operador; '
    'e a base temporal do romaneio. Nula enquanto o trecho nao foi alcancado.';
