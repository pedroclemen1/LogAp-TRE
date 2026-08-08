-- O cadastro administrativo torna a CNH identidade obrigatoria e normalizada.
-- Falhar aqui para dado legado invalido e preferivel a inventar uma CNH.
ALTER TABLE motoristas
    ALTER COLUMN cnh SET NOT NULL,
    ADD CONSTRAINT chk_motoristas_cnh_normalizada CHECK (cnh ~ '^[0-9]{11}$');

COMMENT ON COLUMN motoristas.cnh IS
    'CNH normalizada em exatamente 11 digitos, obrigatoria e unica.';
