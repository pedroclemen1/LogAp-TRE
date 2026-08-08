-- =============================================================================
-- V14 — romaneio de carga
--
-- O romaneio e o documento que acompanha a carga: identifica transportadora,
-- veiculo, motorista, rota e cada volume embarcado, e e assinado na entrega.
--
-- POR QUE TUDO E SNAPSHOT (colunas repetidas em vez de so a FK da viagem):
-- o romaneio e um documento EMITIDO. Depois de impresso e assinado, ele nao
-- pode mudar porque alguem corrigiu a placa do veiculo ou renomeou uma cidade
-- da rota. Ler os dados por JOIN faria o papel na mao do motorista divergir do
-- que a tela mostra. A FK `viagem_id` fica para rastreabilidade, nao para
-- montar o documento.
--
-- O que o desenho pede e o banco NAO tinha (por isso vira coluna aqui, digitada
-- na emissao): razao social, CNPJ e ANTT da transportadora; CPF do motorista;
-- descricao do veiculo ("Carreta Bau 3 Eixos" — `veiculos.tipo` so tem
-- LEVE/PESADO); enderecos de origem e destino (`viagens` guarda so o nome da
-- cidade); e os itens da carga.
-- =============================================================================

CREATE SEQUENCE romaneio_numero_seq;

CREATE TABLE romaneios (
    id                          SERIAL PRIMARY KEY,

    -- UNIQUE: um romaneio por viagem. Reemitir e alterar o existente, nao
    -- criar um segundo documento com o mesmo conteudo e numero diferente.
    viagem_id                   INTEGER NOT NULL UNIQUE REFERENCES viagens(id) ON DELETE CASCADE,

    numero                      VARCHAR(20)  NOT NULL UNIQUE,
    emitido_em                  TIMESTAMP    NOT NULL,
    emitido_por                 VARCHAR(100) NOT NULL,
    -- Derivada do conteudo (SHA-256 truncado), nao aleatoria: confere se o
    -- papel impresso corresponde ao registro. Ver RomaneioService.
    autenticacao                VARCHAR(8)   NOT NULL,

    transportadora_razao_social VARCHAR(150) NOT NULL,
    transportadora_cnpj         VARCHAR(18)  NOT NULL,
    transportadora_antt         VARCHAR(20),

    motorista_nome              VARCHAR(100) NOT NULL,
    motorista_cpf               VARCHAR(14),
    motorista_cnh               VARCHAR(20),
    veiculo_placa               VARCHAR(10)  NOT NULL,
    veiculo_descricao           VARCHAR(100) NOT NULL,

    origem_nome                 VARCHAR(100) NOT NULL,
    origem_endereco             VARCHAR(200),
    destino_nome                VARCHAR(100) NOT NULL,
    destino_endereco            VARCHAR(200),
    distancia_km                DECIMAL(10,2) NOT NULL CHECK (distancia_km >= 0)
);

CREATE TABLE romaneio_itens (
    id            SERIAL PRIMARY KEY,
    romaneio_id   INTEGER      NOT NULL REFERENCES romaneios(id) ON DELETE CASCADE,
    -- Coluna "Seq." do documento. UNIQUE por romaneio para a numeracao impressa
    -- nunca repetir.
    sequencia     SMALLINT     NOT NULL,
    nota_fiscal   VARCHAR(30)  NOT NULL,
    destinatario  VARCHAR(150) NOT NULL,
    volumes       INTEGER      NOT NULL CHECK (volumes > 0),
    peso_kg       DECIMAL(10,2) NOT NULL CHECK (peso_kg >= 0),

    UNIQUE (romaneio_id, sequencia)
);

-- A tela de Gestao lista romaneios do mais recente para o mais antigo.
CREATE INDEX idx_romaneios_emitido_em ON romaneios (emitido_em DESC);
-- Itens sempre lidos pelo pai, na ordem impressa.
CREATE INDEX idx_romaneio_itens_romaneio ON romaneio_itens (romaneio_id, sequencia);

COMMENT ON TABLE romaneios IS
    'Documento de carga emitido para uma viagem. Todos os campos sao snapshot '
    'do momento da emissao: o documento nao muda quando a viagem muda.';
