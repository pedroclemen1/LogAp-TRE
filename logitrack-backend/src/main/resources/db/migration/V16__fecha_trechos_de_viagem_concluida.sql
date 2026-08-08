-- Fecha os trechos que ficaram em aberto em viagens ja concluidas.
--
-- A invariante e: viagem CONCLUIDA nao tem trecho sem chegada. Se o caminhao
-- chegou a Porto Alegre, ele passou por Recife -- nao ha como ter sido de
-- outro jeito. O codigo passou a garantir isso na escrita
-- (`TripService.markRemainingStagesReached`), mas o que ja estava gravado
-- antes disso continuou torto: `finish()` carimbava so o ULTIMO trecho.
--
-- O estrago nao e cosmetico. O romaneio se emite por trecho concluido, entao
-- um trecho intermediario sem `realizado_em` nunca gera documento -- e a
-- viagem ja encerrada nao aceita `completeStage` (exige EM_ANDAMENTO) nem
-- `finish` de novo. Sem este reparo o registro fica sem saida pela API.
--
-- `data_chegada` e o carimbo usado de proposito: e o unico instante que o
-- sistema realmente observou. Distribuir horarios por quilometragem seria
-- inventar dado num documento de valor legal. E a mesma escolha que o codigo
-- vivo faz hoje -- todos os trechos pendentes recebem a chegada da viagem.
--
-- Viagem CANCELADA fica de fora: ali o trecho de fato nao foi cumprido.
--
-- Idempotente: em banco novo sem historico inconsistente nao altera linhas.
UPDATE viagem_etapas e
SET realizado_em = v.data_chegada
FROM viagens v
WHERE e.viagem_id = v.id
  AND v.data_chegada IS NOT NULL
  AND v.cancelada_em IS NULL
  AND e.realizado_em IS NULL;
