package br.com.logap.logitrack.support;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import br.com.logap.logitrack.driver.Driver;
import br.com.logap.logitrack.maintenance.Maintenance;
import br.com.logap.logitrack.trip.Trip;
import br.com.logap.logitrack.vehicle.Vehicle;
import br.com.logap.logitrack.vehicle.VehicleType;

/**
 * Objetos de dominio prontos para os testes unitarios.
 *
 * Nao toca em banco nem em Spring: as entidades sao construidas direto. Os
 * estados intermediarios sao alcancados pelo caminho legitimo
 * (`new` -> `iniciar` -> `concluir`), nunca por reflection — assim o proprio
 * fixture exercita a maquina de estados em vez de contorna-la.
 */
public final class DomainFixtures {

    public static final LocalDateTime PARTIDA = LocalDateTime.of(2026, 3, 10, 8, 0);
    public static final LocalDateTime CHEGADA_PREVISTA = LocalDateTime.of(2026, 3, 10, 18, 0);

    private DomainFixtures() {
    }

    public static Vehicle veiculo() {
        return new Vehicle("ABC-1D23", "Volvo FH", VehicleType.PESADO, 2023, new BigDecimal("1000.00"));
    }

    public static Driver motoristaAtivo() {
        return new Driver("Ana Souza", "12345678901", "11999990000");
    }

    public static Driver motoristaInativo() {
        Driver driver = motoristaAtivo();
        driver.desativar();
        return driver;
    }

    /** PROGRAMADA: criada, com motorista, ainda nao iniciada. */
    public static Trip viagemProgramada() {
        return new Trip(veiculo(), motoristaAtivo(), PARTIDA, CHEGADA_PREVISTA,
            "Sao Paulo", "Rio de Janeiro", new BigDecimal("435.00"), new BigDecimal("800.00"));
    }

    /** PROGRAMADA sem condutor atribuido. */
    public static Trip viagemSemMotorista() {
        return new Trip(veiculo(), null, PARTIDA, CHEGADA_PREVISTA,
            "Sao Paulo", "Rio de Janeiro", new BigDecimal("435.00"), new BigDecimal("800.00"));
    }

    public static Trip viagemEmAndamento() {
        Trip trip = viagemProgramada();
        trip.iniciar(PARTIDA);
        return trip;
    }

    public static Trip viagemConcluida() {
        Trip trip = viagemEmAndamento();
        trip.concluir(CHEGADA_PREVISTA);
        return trip;
    }

    public static Trip viagemCancelada() {
        Trip trip = viagemProgramada();
        trip.cancelar(PARTIDA);
        return trip;
    }

    public static Maintenance manutencaoPendente(LocalDate inicio, LocalDate fim) {
        return new Maintenance(veiculo(), inicio, fim);
    }

    public static Maintenance manutencaoEmRealizacao(LocalDate inicio, LocalDate fim) {
        Maintenance maintenance = manutencaoPendente(inicio, fim);
        maintenance.iniciar(inicio.atStartOfDay());
        return maintenance;
    }

    public static Maintenance manutencaoConcluida(LocalDate inicio, LocalDate fim) {
        Maintenance maintenance = manutencaoEmRealizacao(inicio, fim);
        maintenance.concluir(fim.atStartOfDay());
        return maintenance;
    }
}
