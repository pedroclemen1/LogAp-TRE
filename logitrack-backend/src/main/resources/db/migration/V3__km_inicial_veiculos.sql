-- =============================================================================
-- V3 — quilometragem de entrada do veiculo
--
-- MOTIVO: o cadastro de veiculo precisa aceitar tanto zero-quilometro quanto
-- usado. Sem esta coluna, um caminhao com 312 mil km entraria na frota como se
-- nunca tivesse rodado, e a coluna "Cum. Mileage" da tela de Veiculos mostraria
-- apenas o que ele andou DEPOIS do cadastro.
--
-- POR QUE `km_inicial` E NAO `odometro_atual`:
--
--   km_inicial     e um FATO DE ENTRADA — o hodometro no momento em que o
--                  veiculo entrou na frota. Nao muda mais.
--   odometro atual e DERIVADO:  km_inicial + SUM(viagens.km_percorrida)
--
-- Uma coluna `odometro_atual` mutavel precisaria ser reescrita a cada viagem
-- criada, editada ou apagada. Bastaria uma falha no meio da transacao para o
-- numero divergir do historico de viagens, e nada acusaria. Mesma logica que
-- ja justificou nao existir `viagens.status` nem `veiculos.status` na V2:
-- guarda-se o fato, calcula-se o resto.
--
-- DEFAULT 0 preserva bases que ja possuam veiculos sem leitura de entrada e e
-- tambem o valor correto para um veiculo novo.
-- =============================================================================

ALTER TABLE veiculos
    ADD COLUMN km_inicial DECIMAL(10,2) NOT NULL DEFAULT 0
        CHECK (km_inicial >= 0);

COMMENT ON COLUMN veiculos.km_inicial IS
    'Hodometro no momento do cadastro. O hodometro atual e km_inicial + soma das viagens.';
