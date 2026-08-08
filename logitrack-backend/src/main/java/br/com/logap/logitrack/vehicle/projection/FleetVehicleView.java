package br.com.logap.logitrack.vehicle.projection;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Projecao da consulta da tela de Frota.
 *
 * Interface em vez de entidade porque metade das colunas nao existe em
 * `veiculos`: sao agregacoes e valores derivados. Hidratar a entidade e depois
 * completar em Java custaria uma consulta por veiculo (N+1) para chegar no
 * mesmo resultado.
 */
public interface FleetVehicleView {

    Integer getId();

    String getPlaca();

    String getModelo();

    String getTipo();

    Integer getAno();

    /** Hodometro informado no cadastro do veiculo. */
    BigDecimal getKmInicial();

    /** `kmInicial` mais a soma das viagens concluidas — o hodometro de hoje. */
    BigDecimal getOdometroKm();

    /** Partida da viagem mais recente ja iniciada; nulo se o veiculo nunca rodou. */
    LocalDateTime getUltimaViagemEm();

    /** Inicio da proxima manutencao nao concluida; nulo se nao houver nenhuma. */
    LocalDate getProximaManutencaoEm();

    /** Verdadeiro quando essa manutencao ja deveria ter comecado. */
    Boolean getManutencaoAtrasada();

    /** DISPONIVEL, EM_USO ou MANUTENCAO — ver VehicleOperationalStatus. */
    String getStatus();
}
