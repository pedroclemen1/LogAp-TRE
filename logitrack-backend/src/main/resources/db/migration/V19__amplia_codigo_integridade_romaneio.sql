-- Os novos codigos usam os primeiros 64 bits do SHA-256 do conteudo do
-- romaneio (16 caracteres hexadecimais). Registros anteriores preservam o
-- codigo de 8 caracteres que foi impresso no documento original.
ALTER TABLE romaneios
    ALTER COLUMN autenticacao TYPE VARCHAR(16);

COMMENT ON COLUMN romaneios.autenticacao IS
    'Codigo de integridade derivado do conteudo; novas emissoes usam SHA-256 truncado em 64 bits.';
