-- =============================================================================
-- V15 — o romaneio passa a ser POR TRECHO, nao por viagem
--
-- A V14 amarrou o documento a viagem inteira. Isso nao corresponde a operacao:
-- uma viagem tem varios trechos e a carga muda a cada ponto. O papel que
-- acompanha a mercadoria de Cajamar ate Recife nao e o mesmo que segue de
-- Recife ate o Rio — sao dois documentos, com origens, destinos, distancias e
-- notas fiscais diferentes.
--
-- A partir daqui: um romaneio por TRECHO CONCLUIDO. A viagem pode continuar em
-- andamento; o que libera a emissao e a chegada registrada naquele trecho.
--
-- As colunas de rota que ja existem passam a guardar os extremos do TRECHO:
--   origem_nome   -> ponto anterior (a origem da viagem, quando ordem = 1)
--   destino_nome  -> cidade do proprio trecho
--   distancia_km  -> viagem_etapas.km_trecho
-- Continuam sendo snapshot: alterar a rota depois nao mexe no documento.
-- =============================================================================

-- Os romaneios existentes foram emitidos sob a regra antiga e descrevem a
-- viagem inteira. Nao ha trecho ao qual liga-los sem inventar dados: um
-- documento cuja origem e "Natal-RN" e cujo destino e "Niteroi" nao e o
-- romaneio de nenhum dos tres trechos daquela rota. Apagar e mais honesto do
-- que migrar para um vinculo que produziria papel incorreto.
DELETE FROM romaneios;

ALTER TABLE romaneios DROP CONSTRAINT romaneios_viagem_id_key;

-- "sem CPF, so CNH": o campo sai do documento e da base.
ALTER TABLE romaneios DROP COLUMN motorista_cpf;

ALTER TABLE romaneios
    ADD COLUMN viagem_etapa_id INTEGER NOT NULL
        REFERENCES viagem_etapas(id) ON DELETE CASCADE,
    -- Numero do trecho impresso no documento. Snapshot: reordenar a rota depois
    -- nao pode renumerar um romaneio ja emitido.
    ADD COLUMN trecho_ordem SMALLINT NOT NULL;

ALTER TABLE romaneios
    ADD CONSTRAINT uk_romaneios_etapa UNIQUE (viagem_etapa_id);

-- `viagem_id` deixa de ser UNIQUE (uma viagem tem varios romaneios) mas
-- permanece: a tela lista romaneios agrupados por viagem, e a coluna evita um
-- JOIN em viagem_etapas so para chegar na viagem.
CREATE INDEX idx_romaneios_viagem ON romaneios (viagem_id);

COMMENT ON COLUMN romaneios.viagem_etapa_id IS
    'Trecho coberto por este romaneio. UNIQUE: um documento por trecho.';
COMMENT ON COLUMN romaneios.origem_nome IS
    'Ponto de partida do TRECHO: cidade do trecho anterior, ou a origem da viagem quando ordem = 1.';
