ALTER TABLE usuarios
    ADD COLUMN versao_credenciais INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_usuarios_versao_credenciais_nao_negativa
        CHECK (versao_credenciais >= 0);
