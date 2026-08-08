-- Dados opcionais para desenvolvimento e validacao visual.
--
-- R__ identifica uma migration repetivel: ela sempre roda depois de todas as
-- migrations versionadas e volta a rodar somente quando este arquivo muda.
-- Cada bloco e idempotente para que uma alteracao futura no seed nao duplique
-- os registros que ja existam no banco local.

INSERT INTO veiculos (placa, modelo, tipo, ano, km_inicial) VALUES
    ('ABC-1234', 'Fiorino',          'LEVE',   2022,  44000.00),
    ('XYZ-9876', 'Volvo FH',         'PESADO', 2021, 141000.00),
    ('KJG-1122', 'Mercedes Sprinter','LEVE',   2020,  89000.00),
    ('LMN-4455', 'Scania R500',      'PESADO', 2023, 311000.00)
ON CONFLICT (placa) DO NOTHING;

INSERT INTO motoristas (nome, cnh, telefone) VALUES
    ('Sarah Jenkins',  '01234567890', '+55 84 99101-0001'),
    ('Marcos Andrade', '01234567891', '+55 84 99101-0002'),
    ('Juliana Prado',  '01234567892', '+55 84 99101-0003')
ON CONFLICT (cnh) DO NOTHING;

-- Senha: logap123. O seed nao faz parte do ambiente de producao.
INSERT INTO usuarios (email, senha_hash, nome, perfil) VALUES
    ('operador@logitrack.com',
     '$2y$10$pg5SmxpRya46wtKzyjU0hOQmc.n1WJjRK3WmZ4q7IP/tA3FwlTL0S',
     'Operador Demo', 'GESTOR')
ON CONFLICT DO NOTHING;

WITH dados (
    placa, cnh, data_saida, iniciada_em, data_chegada_prevista,
    data_chegada, origem, destino, km, carga
) AS (
    VALUES
        ('ABC-1234', NULL::VARCHAR, TIMESTAMP '2024-05-01 08:00:00', TIMESTAMP '2024-05-01 08:00:00',
         TIMESTAMP '2024-05-01 18:00:00', TIMESTAMP '2024-05-01 18:00:00',
         'São Paulo', 'Rio de Janeiro', 435.00, 800.00),
        ('ABC-1234', NULL::VARCHAR, TIMESTAMP '2024-05-05 09:00:00', TIMESTAMP '2024-05-05 09:00:00',
         TIMESTAMP '2024-05-05 12:00:00', TIMESTAMP '2024-05-05 12:00:00',
         'Rio de Janeiro', 'Niterói', 20.50, 300.00),
        ('XYZ-9876', NULL::VARCHAR, TIMESTAMP '2024-05-02 05:00:00', TIMESTAMP '2024-05-02 05:00:00',
         TIMESTAMP '2024-05-03 20:00:00', TIMESTAMP '2024-05-03 20:00:00',
         'Curitiba', 'Belo Horizonte', 1000.00, 12000.00),
        ('XYZ-9876', '01234567890', LOCALTIMESTAMP - INTERVAL '10 days', LOCALTIMESTAMP - INTERVAL '10 days',
         LOCALTIMESTAMP - INTERVAL '9 days', LOCALTIMESTAMP - INTERVAL '9 days',
         'Natal', 'Recife', 285.00, 14700.00),
        ('LMN-4455', '01234567891', LOCALTIMESTAMP - INTERVAL '2 days', LOCALTIMESTAMP - INTERVAL '2 days',
         LOCALTIMESTAMP + INTERVAL '4 hours', NULL::TIMESTAMP,
         'Curitiba', 'Joinville', 130.00, 22300.00),
        ('ABC-1234', '01234567892', LOCALTIMESTAMP + INTERVAL '3 days', NULL::TIMESTAMP,
         LOCALTIMESTAMP + INTERVAL '3 days 3 hours', NULL::TIMESTAMP,
         'São Paulo', 'Campinas', 95.00, 1800.00),
        ('KJG-1122', '01234567890', LOCALTIMESTAMP - INTERVAL '20 days', LOCALTIMESTAMP - INTERVAL '20 days',
         LOCALTIMESTAMP - INTERVAL '20 days' + INTERVAL '4 hours',
         LOCALTIMESTAMP - INTERVAL '20 days' + INTERVAL '4 hours',
         'Natal', 'João Pessoa', 185.00, 900.00)
)
INSERT INTO viagens (
    veiculo_id, motorista_id, data_saida, iniciada_em, data_chegada_prevista,
    data_chegada, origem, destino, km_percorrida, carga_kg
)
SELECT v.id, m.id, d.data_saida, d.iniciada_em, d.data_chegada_prevista,
       d.data_chegada, d.origem, d.destino, d.km, d.carga
FROM dados d
JOIN veiculos v ON v.placa = d.placa
LEFT JOIN motoristas m ON m.cnh = d.cnh
WHERE NOT EXISTS (
    SELECT 1
    FROM viagens existente
    JOIN veiculos ve ON ve.id = existente.veiculo_id
    WHERE ve.placa = d.placa
      AND existente.origem = d.origem
      AND existente.destino = d.destino
);

-- Toda viagem demonstrativa recebe ao menos um trecho final. O seed usa o
-- modelo atual diretamente; nenhuma migration de schema precisa corrigi-lo.
INSERT INTO viagem_etapas (
    viagem_id, ordem, cidade, previsto_em, realizado_em, km_trecho, carga_kg
)
SELECT v.id, 1, v.destino, v.data_chegada_prevista, v.data_chegada,
       v.km_percorrida, COALESCE(v.carga_kg, 0)
FROM viagens v
JOIN veiculos ve ON ve.id = v.veiculo_id
WHERE ve.placa IN ('ABC-1234', 'XYZ-9876', 'KJG-1122', 'LMN-4455')
  AND NOT EXISTS (
      SELECT 1 FROM viagem_etapas etapa WHERE etapa.viagem_id = v.id
  );

WITH viagem_demo AS (
    SELECT v.id
    FROM viagens v
    JOIN veiculos ve ON ve.id = v.veiculo_id
    WHERE ve.placa = 'LMN-4455'
      AND v.origem = 'Curitiba'
      AND v.destino = 'Joinville'
), dados (tipo, titulo, detalhe, autor, ocorrido_em) AS (
    VALUES
        ('CRIADA', 'Trip Created', 'Initial manifest loaded.', 'Dispatcher Mike', LOCALTIMESTAMP - INTERVAL '3 days'),
        ('INICIADA', 'Trip Started', 'Departed Curitiba facility.', 'Marcos Andrade', LOCALTIMESTAMP - INTERVAL '2 days'),
        ('ROTA_ATUALIZADA', 'Route Updated', 'Avoided closure on BR-101.', 'Auto-System', LOCALTIMESTAMP - INTERVAL '1 day')
)
INSERT INTO viagem_eventos (viagem_id, tipo, titulo, detalhe, autor, ocorrido_em)
SELECT v.id, d.tipo, d.titulo, d.detalhe, d.autor, d.ocorrido_em
FROM viagem_demo v
CROSS JOIN dados d
WHERE NOT EXISTS (
    SELECT 1 FROM viagem_eventos evento
    WHERE evento.viagem_id = v.id
      AND evento.tipo = d.tipo
      AND evento.titulo = d.titulo
);

INSERT INTO servicos_manutencao (nome) VALUES
    ('Troca de Óleo'),
    ('Revisão de Freios'),
    ('Alinhamento'),
    ('Inspeção Geral'),
    ('Troca de Pneus'),
    ('Motor')
ON CONFLICT DO NOTHING;

WITH dados (
    placa, inicio, fim, servico, custo, status, iniciada_em, concluida_em
) AS (
    VALUES
        ('ABC-1234', CURRENT_DATE + 2,  CURRENT_DATE + 3,  'Troca de Óleo',      350.00,  'PENDENTE',      NULL::TIMESTAMP, NULL::TIMESTAMP),
        ('KJG-1122', CURRENT_DATE + 4,  CURRENT_DATE + 5,  'Revisão de Freios', 1500.00, 'PENDENTE',      NULL::TIMESTAMP, NULL::TIMESTAMP),
        ('XYZ-9876', CURRENT_DATE + 6,  CURRENT_DATE + 6,  'Alinhamento',        420.00,  'PENDENTE',      NULL::TIMESTAMP, NULL::TIMESTAMP),
        ('LMN-4455', CURRENT_DATE + 9,  CURRENT_DATE + 11, 'Inspeção Geral',     980.00,  'PENDENTE',      NULL::TIMESTAMP, NULL::TIMESTAMP),
        ('ABC-1234', CURRENT_DATE + 14, CURRENT_DATE + 15, 'Troca de Pneus',    2200.00, 'PENDENTE',      NULL::TIMESTAMP, NULL::TIMESTAMP),
        ('KJG-1122', CURRENT_DATE - 3,  CURRENT_DATE + 1,  'Motor',              4500.00, 'EM_REALIZACAO', LOCALTIMESTAMP - INTERVAL '3 days', NULL::TIMESTAMP)
)
INSERT INTO manutencoes (
    veiculo_id, data_inicio_prevista, data_finalizacao_prevista,
    status, iniciada_em, concluida_em
)
SELECT v.id, d.inicio, d.fim, d.status, d.iniciada_em, d.concluida_em
FROM dados d
JOIN veiculos v ON v.placa = d.placa
WHERE NOT EXISTS (
    SELECT 1
    FROM manutencoes existente
    JOIN veiculos ve ON ve.id = existente.veiculo_id
    JOIN manutencao_servicos item ON item.manutencao_id = existente.id
    WHERE ve.placa = d.placa
      AND LOWER(item.nome_servico) = LOWER(d.servico)
);

WITH dados (placa, inicio, fim, servico, custo) AS (
    VALUES
        ('ABC-1234', CURRENT_DATE + 2,  CURRENT_DATE + 3,  'Troca de Óleo',      350.00),
        ('KJG-1122', CURRENT_DATE + 4,  CURRENT_DATE + 5,  'Revisão de Freios', 1500.00),
        ('XYZ-9876', CURRENT_DATE + 6,  CURRENT_DATE + 6,  'Alinhamento',        420.00),
        ('LMN-4455', CURRENT_DATE + 9,  CURRENT_DATE + 11, 'Inspeção Geral',     980.00),
        ('ABC-1234', CURRENT_DATE + 14, CURRENT_DATE + 15, 'Troca de Pneus',    2200.00),
        ('KJG-1122', CURRENT_DATE - 3,  CURRENT_DATE + 1,  'Motor',              4500.00)
)
INSERT INTO manutencao_servicos (
    manutencao_id, servico_manutencao_id, nome_servico, custo
)
SELECT m.id, s.id, d.servico, d.custo
FROM dados d
JOIN veiculos v ON v.placa = d.placa
JOIN manutencoes m
  ON m.veiculo_id = v.id
 AND m.data_inicio_prevista = d.inicio
 AND m.data_finalizacao_prevista = d.fim
JOIN servicos_manutencao s ON LOWER(s.nome) = LOWER(d.servico)
WHERE NOT EXISTS (
    SELECT 1 FROM manutencao_servicos item WHERE item.manutencao_id = m.id
);
