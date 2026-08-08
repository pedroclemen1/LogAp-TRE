package br.com.logap.logitrack.support;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import br.com.logap.logitrack.auth.UserRole;

/**
 * Insercao direta por SQL para montar cenarios de teste.
 *
 * Alguns cenarios exigem estados históricos que a máquina de estados não cria
 * pela API, como uma viagem já concluída no passado.
 *
 * Devolve o id gerado para o teste encadear os cenarios sem consultar de novo.
 */
@Component
public class SqlFixtures {

    private final JdbcTemplate jdbc;

    public SqlFixtures(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int veiculo(String placa, String modelo, String tipo, int ano, String kmInicial) {
        return jdbc.queryForObject("""
            INSERT INTO veiculos (placa, modelo, tipo, ano, km_inicial)
            VALUES (?, ?, ?, ?, CAST(? AS DECIMAL)) RETURNING id
            """, Integer.class, placa, modelo, tipo, ano, kmInicial);
    }

    public int motorista(String nome, String cnh) {
        return jdbc.queryForObject(
            "INSERT INTO motoristas (nome, cnh, ativo) VALUES (?, ?, TRUE) RETURNING id",
            Integer.class, nome, cnh);
    }

    /** Viagem concluida: iniciada e com chegada real — a unica que soma no hodometro. */
    public int viagemConcluida(int veiculoId, LocalDateTime saida, LocalDateTime chegada, String km) {
        return jdbc.queryForObject("""
            INSERT INTO viagens (veiculo_id, data_saida, iniciada_em, data_chegada, origem, destino, km_percorrida)
            VALUES (?, ?, ?, ?, 'A', 'B', CAST(? AS DECIMAL)) RETURNING id
            """, Integer.class, veiculoId, saida, saida, chegada, km);
    }

    /** Viagem em andamento: iniciada, sem chegada. Marca o veiculo EM_USO. */
    public int viagemEmAndamento(int veiculoId, Integer motoristaId, LocalDateTime saida, String km) {
        return jdbc.queryForObject("""
            INSERT INTO viagens (veiculo_id, motorista_id, data_saida, iniciada_em, origem, destino, km_percorrida)
            VALUES (?, ?, ?, ?, 'A', 'B', CAST(? AS DECIMAL)) RETURNING id
            """, Integer.class, veiculoId, motoristaId, saida, saida, km);
    }

    /** Programada com condutor: o estado de partida para os testes de alocacao. */
    public int viagemProgramadaComMotorista(int veiculoId, int motoristaId, LocalDateTime saida, String km) {
        return jdbc.queryForObject("""
            INSERT INTO viagens (veiculo_id, motorista_id, data_saida, origem, destino, km_percorrida)
            VALUES (?, ?, ?, 'A', 'B', CAST(? AS DECIMAL)) RETURNING id
            """, Integer.class, veiculoId, motoristaId, saida, km);
    }

    /** Programada: nunca iniciada. NAO marca o veiculo como em uso. */
    public int viagemProgramada(int veiculoId, LocalDateTime saida, String km) {
        return jdbc.queryForObject("""
            INSERT INTO viagens (veiculo_id, data_saida, origem, destino, km_percorrida)
            VALUES (?, ?, 'A', 'B', CAST(? AS DECIMAL)) RETURNING id
            """, Integer.class, veiculoId, saida, km);
    }

    public int viagemCancelada(int veiculoId, LocalDateTime saida, String km) {
        return jdbc.queryForObject("""
            INSERT INTO viagens (veiculo_id, data_saida, iniciada_em, cancelada_em, origem, destino, km_percorrida)
            VALUES (?, ?, ?, ?, 'A', 'B', CAST(? AS DECIMAL)) RETURNING id
            """, Integer.class, veiculoId, saida, saida, saida.plusHours(1), km);
    }

    public int etapa(int viagemId, int ordem, String cidade, String km, String carga) {
        return jdbc.queryForObject("""
            INSERT INTO viagem_etapas (viagem_id, ordem, cidade, km_trecho, carga_kg)
            VALUES (?, ?, ?, CAST(? AS DECIMAL), CAST(? AS DECIMAL)) RETURNING id
            """, Integer.class, viagemId, ordem, cidade, km, carga);
    }

    public int manutencaoPendente(int veiculoId, LocalDate inicio, LocalDate fim) {
        return jdbc.queryForObject("""
            INSERT INTO manutencoes (veiculo_id, data_inicio_prevista, data_finalizacao_prevista, status)
            VALUES (?, ?, ?, 'PENDENTE') RETURNING id
            """, Integer.class, veiculoId, inicio, fim);
    }

    public int manutencaoEmRealizacao(int veiculoId, LocalDate inicio, LocalDate fim) {
        return jdbc.queryForObject("""
            INSERT INTO manutencoes (veiculo_id, data_inicio_prevista, data_finalizacao_prevista,
                                     status, iniciada_em)
            VALUES (?, ?, ?, 'EM_REALIZACAO', ?) RETURNING id
            """, Integer.class, veiculoId, inicio, fim, inicio.atStartOfDay());
    }

    public int manutencaoConcluida(int veiculoId, LocalDate inicio, LocalDate fim) {
        return jdbc.queryForObject("""
            INSERT INTO manutencoes (veiculo_id, data_inicio_prevista, data_finalizacao_prevista,
                                     status, iniciada_em, concluida_em)
            VALUES (?, ?, ?, 'CONCLUIDA', ?, ?) RETURNING id
            """, Integer.class, veiculoId, inicio, fim, inicio.atStartOfDay(), fim.atStartOfDay());
    }

    public int servicoCatalogo(String nome) {
        return jdbc.queryForObject(
            "INSERT INTO servicos_manutencao (nome, ativo) VALUES (?, TRUE) RETURNING id",
            Integer.class, nome);
    }

    /**
     * `nome_servico` e NOT NULL: a tabela guarda um instantaneo do nome no
     * momento do agendamento, para renomear o servico no catalogo nao reescrever
     * o historico. Aqui o nome e copiado do catalogo, como a aplicacao faz.
     */
    public void servicoDaManutencao(int manutencaoId, int servicoId, String custo) {
        String nome = jdbc.queryForObject(
            "SELECT nome FROM servicos_manutencao WHERE id = ?", String.class, servicoId);
        jdbc.update("""
            INSERT INTO manutencao_servicos (manutencao_id, servico_manutencao_id, nome_servico, custo)
            VALUES (?, ?, ?, CAST(? AS DECIMAL))
            """, manutencaoId, servicoId, nome, custo);
    }

    public void usuario(String email, String senhaHash, String nome) {
        usuario(email, senhaHash, nome, UserRole.OPERADOR, false, true);
    }

    public void usuario(String email, String senhaHash, String nome, UserRole perfil,
                        boolean trocaSenhaObrigatoria, boolean ativo) {
        jdbc.update("""
            INSERT INTO usuarios (
                email, senha_hash, nome, perfil, ativo, troca_senha_obrigatoria
            ) VALUES (?, ?, ?, ?, ?, ?)
            """, email, senhaHash, nome, perfil.name(), ativo, trocaSenhaObrigatoria);
    }
}
