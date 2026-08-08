CREATE TABLE servicos_manutencao (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(100) NOT NULL,
    ativo   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX uk_servicos_manutencao_nome_normalizado
    ON servicos_manutencao (LOWER(TRIM(nome)));

CREATE INDEX idx_servicos_manutencao_ativos_nome
    ON servicos_manutencao (nome)
    WHERE ativo = TRUE;

COMMENT ON TABLE servicos_manutencao IS
    'Catalogo mestre. Valor e duracao pertencerao a manutencao aplicada ao veiculo.';
