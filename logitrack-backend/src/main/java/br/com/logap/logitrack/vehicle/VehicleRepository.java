package br.com.logap.logitrack.vehicle;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import br.com.logap.logitrack.vehicle.projection.FleetVehicleView;

public interface VehicleRepository extends JpaRepository<Vehicle, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Vehicle v WHERE v.id = :id")
    Optional<Vehicle> findByIdForUpdate(Integer id);

    /** A placa e UNIQUE no banco; a consulta antecipa o erro com mensagem util. */
    Optional<Vehicle> findByPlacaIgnoreCase(String placa);

    @Query(value = """
            SELECT DISTINCT t.veiculo_id
            FROM viagens t
            WHERE t.iniciada_em IS NOT NULL
              AND t.data_chegada IS NULL
              AND t.cancelada_em IS NULL
            """, nativeQuery = true)
    Set<Integer> findIdsInUse();

    @Query(value = """
            SELECT DISTINCT m.veiculo_id
            FROM manutencoes m
            WHERE m.status = 'EM_REALIZACAO'
            """, nativeQuery = true)
    Set<Integer> findIdsInMaintenance();

    /**
     * Excluir um veiculo com historico acionaria os ON DELETE CASCADE da V1 e
     * apagaria viagens/manutencoes sem que a tela deixasse isso claro. A
     * exclusao da Frota e cadastral, por isso esses veiculos sao bloqueados.
     */
    @Query(value = """
            SELECT v.placa
            FROM veiculos v
            WHERE v.id IN (:ids)
              AND (
                  EXISTS (SELECT 1 FROM viagens t WHERE t.veiculo_id = v.id)
                  OR EXISTS (SELECT 1 FROM manutencoes m WHERE m.veiculo_id = v.id)
              )
            ORDER BY v.placa
            """, nativeQuery = true)
    List<String> findPlatesWithHistory(@Param("ids") Collection<Integer> ids);

    /**
     * Projeta a frota inteira em uma consulta para evitar N+1. Os LATERAL
     * compartilham os agregados de viagem e manutenção; o CASE deriva o status
     * com precedência de manutenção sobre viagem em andamento.
     */
    @Query(value = """
            WITH frota AS (
                SELECT v.id                                              AS id,
                       v.placa                                           AS placa,
                       v.modelo                                          AS modelo,
                       v.tipo                                            AS tipo,
                       v.ano                                             AS ano,
                       v.km_inicial                                      AS km_inicial,
                       v.km_inicial + COALESCE(uso.km_total, 0)          AS odometro_km,
                       uso.ultima_saida                                  AS ultima_saida,
                       agenda.proxima_em                                 AS proxima_em,
                       COALESCE(agenda.proxima_em < CURRENT_DATE, FALSE) AS manutencao_atrasada,
                       CASE
                           WHEN EXISTS (
                               SELECT 1 FROM manutencoes m
                               WHERE m.veiculo_id = v.id
                                 AND m.status = 'EM_REALIZACAO'
                           ) THEN 'MANUTENCAO'
                           WHEN EXISTS (
                               SELECT 1 FROM viagens t
                               WHERE t.veiculo_id = v.id
                                 AND t.data_chegada IS NULL
                                 AND t.cancelada_em IS NULL
                                 AND t.iniciada_em IS NOT NULL
                           ) THEN 'EM_USO'
                           ELSE 'DISPONIVEL'
                       END                                               AS status
                FROM veiculos v
                LEFT JOIN LATERAL (
                    SELECT SUM(t.km_percorrida) FILTER (
                               WHERE t.data_chegada IS NOT NULL
                           )                    AS km_total,
                           MAX(t.data_saida)    AS ultima_saida
                    FROM viagens t
                    WHERE t.veiculo_id = v.id
                      AND t.cancelada_em IS NULL
                      AND t.iniciada_em IS NOT NULL
                ) uso ON TRUE
                LEFT JOIN LATERAL (
                    SELECT MIN(m.data_inicio_prevista) AS proxima_em
                    FROM manutencoes m
                    WHERE m.veiculo_id = v.id
                      AND m.status <> 'CONCLUIDA'
                ) agenda ON TRUE
                WHERE (CAST(:busca AS TEXT) IS NULL OR v.placa ILIKE :busca OR v.modelo ILIKE :busca)
                  AND (CAST(:tipo  AS TEXT) IS NULL OR v.tipo = :tipo)
            )
            SELECT id                  AS id,
                   placa               AS placa,
                   modelo              AS modelo,
                   tipo                AS tipo,
                   ano                 AS ano,
                   km_inicial          AS kmInicial,
                   odometro_km         AS odometroKm,
                   ultima_saida        AS ultimaViagemEm,
                   proxima_em          AS proximaManutencaoEm,
                   manutencao_atrasada AS manutencaoAtrasada,
                   status              AS status
            FROM frota
            WHERE (CAST(:status AS TEXT) IS NULL OR status = :status)
            ORDER BY placa
            """,
        // A contagem dispensa os LATERAL, usados apenas nas colunas projetadas.
        countQuery = """
            SELECT COUNT(*)
            FROM veiculos v
            WHERE (CAST(:busca AS TEXT) IS NULL OR v.placa ILIKE :busca OR v.modelo ILIKE :busca)
              AND (CAST(:tipo  AS TEXT) IS NULL OR v.tipo = :tipo)
              AND (CAST(:status AS TEXT) IS NULL OR :status = CASE
                      WHEN EXISTS (
                          SELECT 1 FROM manutencoes m
                          WHERE m.veiculo_id = v.id
                            AND m.status = 'EM_REALIZACAO'
                      ) THEN 'MANUTENCAO'
                      WHEN EXISTS (
                          SELECT 1 FROM viagens t
                          WHERE t.veiculo_id = v.id
                            AND t.data_chegada IS NULL
                            AND t.cancelada_em IS NULL
                            AND t.iniciada_em IS NOT NULL
                      ) THEN 'EM_USO'
                      ELSE 'DISPONIVEL'
                  END)
            """,
        nativeQuery = true)
    Page<FleetVehicleView> findFleetPage(
        @Param("busca") String busca,
        @Param("tipo") String tipo,
        @Param("status") String status,
        Pageable pageable);
}
