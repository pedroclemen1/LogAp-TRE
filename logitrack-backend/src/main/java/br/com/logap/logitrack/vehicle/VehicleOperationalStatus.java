package br.com.logap.logitrack.vehicle;

/**
 * Situacao operacional do veiculo no momento da consulta.
 *
 * NAO existe coluna `veiculos.status` — este valor e derivado por SQL a partir
 * de viagens e manutencoes abertas. Guardar em coluna criaria dado que sai de
 * sincronia: um veiculo marcado como EM_USO continuaria em uso para sempre se
 * ninguem rodasse um job depois que a viagem terminasse.
 *
 * A precedencia importa: veiculo em manutencao aparece como MANUTENCAO mesmo
 * que tenha viagem em aberto — a oficina e o fato mais restritivo.
 */
public enum VehicleOperationalStatus {

    /** Sem viagem em curso e sem manutencao em andamento. */
    DISPONIVEL,

    /** Tem viagem que ja partiu e ainda nao chegou. */
    EM_USO,

    /** Tem manutencao nao concluida cuja janela cobre a data de hoje. */
    MANUTENCAO
}
