CREATE TABLE convites_usuario (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(150) NOT NULL,
    perfil        VARCHAR(20) NOT NULL
                  CHECK (perfil IN ('OPERADOR', 'GESTOR')),
    token_hash    VARCHAR(64) NOT NULL UNIQUE,
    expira_em     TIMESTAMP NOT NULL,
    utilizado_em TIMESTAMP,
    revogado_em   TIMESTAMP,
    criado_em     TIMESTAMP NOT NULL,
    criado_por    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_convite_usuario_email_pendente
    ON convites_usuario (LOWER(email))
    WHERE utilizado_em IS NULL AND revogado_em IS NULL;

CREATE INDEX idx_convite_usuario_expiracao
    ON convites_usuario (expira_em)
    WHERE utilizado_em IS NULL AND revogado_em IS NULL;

CREATE UNIQUE INDEX uq_usuarios_email_normalizado
    ON usuarios (LOWER(email));

ALTER TABLE usuarios
    DROP CONSTRAINT usuarios_email_key;
