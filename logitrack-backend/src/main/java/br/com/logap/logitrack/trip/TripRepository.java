package br.com.logap.logitrack.trip;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripRepository extends JpaRepository<Trip, Integer> {

    @Query(value = """
            SELECT t FROM Trip t
            JOIN FETCH t.veiculo ve
            LEFT JOIN FETCH t.motorista
            WHERE (:busca IS NULL
                   OR LOWER(ve.placa) LIKE :busca
                   OR LOWER(ve.modelo) LIKE :busca
                   OR LOWER(t.origem) LIKE :busca
                   OR LOWER(t.destino) LIKE :busca)
              AND (:veiculoId IS NULL OR ve.id = :veiculoId)
              AND (:status IS NULL
                   OR (:status = 'CANCELADA'
                       AND t.canceladaEm IS NOT NULL)
                   OR (:status = 'CONCLUIDA'
                       AND t.canceladaEm IS NULL AND t.dataChegada IS NOT NULL)
                   OR (:status = 'PROGRAMADA'
                       AND t.canceladaEm IS NULL AND t.dataChegada IS NULL
                       AND t.iniciadaEm IS NULL)
                   OR (:status = 'EM_ANDAMENTO'
                       AND t.canceladaEm IS NULL AND t.dataChegada IS NULL
                       AND t.iniciadaEm IS NOT NULL))
            """,
        countQuery = """
            SELECT COUNT(t) FROM Trip t
            JOIN t.veiculo ve
            WHERE (:busca IS NULL
                   OR LOWER(ve.placa) LIKE :busca
                   OR LOWER(ve.modelo) LIKE :busca
                   OR LOWER(t.origem) LIKE :busca
                   OR LOWER(t.destino) LIKE :busca)
              AND (:veiculoId IS NULL OR ve.id = :veiculoId)
              AND (:status IS NULL
                   OR (:status = 'CANCELADA'
                       AND t.canceladaEm IS NOT NULL)
                   OR (:status = 'CONCLUIDA'
                       AND t.canceladaEm IS NULL AND t.dataChegada IS NOT NULL)
                   OR (:status = 'PROGRAMADA'
                       AND t.canceladaEm IS NULL AND t.dataChegada IS NULL
                       AND t.iniciadaEm IS NULL)
                   OR (:status = 'EM_ANDAMENTO'
                       AND t.canceladaEm IS NULL AND t.dataChegada IS NULL
                       AND t.iniciadaEm IS NOT NULL))
            """)
    Page<Trip> findFiltered(
        @Param("busca") String busca,
        @Param("veiculoId") Integer veiculoId,
        @Param("status") String status,
        Pageable pageable);

    @Query("""
            SELECT t FROM Trip t
            JOIN FETCH t.veiculo
            LEFT JOIN FETCH t.motorista
            WHERE t.id = :id
            """)
    Optional<Trip> findByIdWithRelations(Integer id);

    @Query("""
            SELECT CASE WHEN COUNT(t) > 0 THEN TRUE ELSE FALSE END
            FROM Trip t
            WHERE t.veiculo.id = :veiculoId
              AND t.id <> :viagemId
              AND t.iniciadaEm IS NOT NULL
              AND t.dataChegada IS NULL
              AND t.canceladaEm IS NULL
            """)
    boolean existsActiveVehicle(Integer veiculoId, Integer viagemId);

    @Query("""
            SELECT CASE WHEN COUNT(t) > 0 THEN TRUE ELSE FALSE END
            FROM Trip t
            WHERE t.motorista.id = :motoristaId
              AND t.id <> :viagemId
              AND t.iniciadaEm IS NOT NULL
              AND t.dataChegada IS NULL
              AND t.canceladaEm IS NULL
            """)
    boolean existsActiveDriver(Integer motoristaId, Integer viagemId);

    @Query("""
            SELECT t.id FROM Trip t
            WHERE t.id IN :ids
              AND t.iniciadaEm IS NOT NULL
              AND t.dataChegada IS NULL
              AND t.canceladaEm IS NULL
            """)
    List<Integer> findActiveIds(List<Integer> ids);

    /**
     * Viagens ja concluidas entre as informadas.
     *
     * Viagem concluida e fato consumado: a quilometragem dela ja entrou no
     * hodometro do veiculo. Excluir apagaria distancia que o veiculo percorreu
     * de verdade — o hodometro ANDARIA PARA TRAS.
     */
    @Query("""
            SELECT t.id FROM Trip t
            WHERE t.id IN :ids
              AND t.dataChegada IS NOT NULL
              AND t.canceladaEm IS NULL
            """)
    List<Integer> findCompletedIds(List<Integer> ids);

    @Query("""
            SELECT CASE WHEN COUNT(t) > 0 THEN TRUE ELSE FALSE END
            FROM Trip t
            WHERE t.motorista.id = :motoristaId
              AND t.dataChegada IS NULL
              AND t.canceladaEm IS NULL
            """)
    boolean existsUnfinishedByDriver(Integer motoristaId);

    @Query("""
            SELECT t.motorista.id FROM Trip t
            WHERE t.motorista IS NOT NULL
              AND t.iniciadaEm IS NOT NULL
              AND t.dataChegada IS NULL
              AND t.canceladaEm IS NULL
            """)
    Set<Integer> findActiveDriverIds();
}
