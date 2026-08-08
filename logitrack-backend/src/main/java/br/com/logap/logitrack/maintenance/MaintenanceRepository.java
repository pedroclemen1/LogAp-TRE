package br.com.logap.logitrack.maintenance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MaintenanceRepository extends JpaRepository<Maintenance, Integer> {

    @Query(value = """
            SELECT m.id
            FROM manutencoes m
            JOIN veiculos v ON v.id = m.veiculo_id
            WHERE (
                CAST(:busca AS TEXT) IS NULL
                OR v.placa ILIKE :busca
                OR v.modelo ILIKE :busca
                OR EXISTS (
                    SELECT 1 FROM manutencao_servicos ms
                    WHERE ms.manutencao_id = m.id AND ms.nome_servico ILIKE :busca
                )
            )
              AND (:veiculoId IS NULL OR m.veiculo_id = :veiculoId)
              AND (CAST(:status AS TEXT) IS NULL OR m.status = :status)
              AND (
                  CAST(:atrasada AS BOOLEAN) IS NULL
                  OR :atrasada = CASE
                      WHEN m.status = 'PENDENTE' THEN m.data_inicio_prevista < CURRENT_DATE
                      WHEN m.status = 'EM_REALIZACAO' THEN m.data_finalizacao_prevista < CURRENT_DATE
                      ELSE FALSE
                  END
              )
              AND (CAST(:inicioDe AS DATE) IS NULL OR m.data_inicio_prevista >= CAST(:inicioDe AS DATE))
              AND (CAST(:inicioAte AS DATE) IS NULL OR m.data_inicio_prevista <= CAST(:inicioAte AS DATE))
            ORDER BY
              CASE WHEN :ordem = 'DATA_ASC' THEN m.data_inicio_prevista END ASC,
              CASE WHEN :ordem = 'DATA_DESC' THEN m.data_inicio_prevista END DESC,
              CASE WHEN :ordem = 'CUSTO_ASC' THEN (
                  SELECT COALESCE(SUM(ms.custo), 0) FROM manutencao_servicos ms WHERE ms.manutencao_id = m.id
              ) END ASC,
              CASE WHEN :ordem = 'CUSTO_DESC' THEN (
                  SELECT COALESCE(SUM(ms.custo), 0) FROM manutencao_servicos ms WHERE ms.manutencao_id = m.id
              ) END DESC,
              m.id ASC
            """,
        countQuery = """
            SELECT COUNT(*)
            FROM manutencoes m
            JOIN veiculos v ON v.id = m.veiculo_id
            WHERE (
                CAST(:busca AS TEXT) IS NULL
                OR v.placa ILIKE :busca
                OR v.modelo ILIKE :busca
                OR EXISTS (
                    SELECT 1 FROM manutencao_servicos ms
                    WHERE ms.manutencao_id = m.id AND ms.nome_servico ILIKE :busca
                )
            )
              AND (:veiculoId IS NULL OR m.veiculo_id = :veiculoId)
              AND (CAST(:status AS TEXT) IS NULL OR m.status = :status)
              AND (
                  CAST(:atrasada AS BOOLEAN) IS NULL
                  OR :atrasada = CASE
                      WHEN m.status = 'PENDENTE' THEN m.data_inicio_prevista < CURRENT_DATE
                      WHEN m.status = 'EM_REALIZACAO' THEN m.data_finalizacao_prevista < CURRENT_DATE
                      ELSE FALSE
                  END
              )
              AND (CAST(:inicioDe AS DATE) IS NULL OR m.data_inicio_prevista >= CAST(:inicioDe AS DATE))
              AND (CAST(:inicioAte AS DATE) IS NULL OR m.data_inicio_prevista <= CAST(:inicioAte AS DATE))
            """,
        nativeQuery = true)
    Page<Integer> findFilteredIds(
        @Param("busca") String busca,
        @Param("veiculoId") Integer veiculoId,
        @Param("status") String status,
        @Param("atrasada") Boolean atrasada,
        @Param("inicioDe") LocalDate inicioDe,
        @Param("inicioAte") LocalDate inicioAte,
        @Param("ordem") String ordem,
        Pageable pageable);

    @EntityGraph(attributePaths = {"veiculo", "servicos", "servicos.servicoCatalogo"})
    @Query("SELECT DISTINCT m FROM Maintenance m WHERE m.id IN :ids")
    List<Maintenance> findAllWithDetailsByIdIn(@Param("ids") Collection<Integer> ids);

    @EntityGraph(attributePaths = {"veiculo", "servicos", "servicos.servicoCatalogo"})
    @Query("SELECT m FROM Maintenance m WHERE m.id = :id")
    Optional<Maintenance> findByIdWithDetails(Integer id);

    @Query("""
            SELECT CASE WHEN COUNT(m) > 0 THEN TRUE ELSE FALSE END
            FROM Maintenance m
            WHERE m.veiculo.id = :veiculoId
              AND m.id <> :manutencaoId
              AND m.status = br.com.logap.logitrack.maintenance.MaintenanceStatus.EM_REALIZACAO
            """)
    boolean existsActiveVehicle(Integer veiculoId, Integer manutencaoId);

    long countByStatus(MaintenanceStatus status);

    @Query("SELECT COUNT(DISTINCT m.veiculo.id) FROM Maintenance m WHERE m.status = :status")
    long countDistinctVehiclesByStatus(MaintenanceStatus status);

    @Query("""
            SELECT COALESCE(SUM(item.custo), 0)
            FROM MaintenanceItem item
            WHERE item.manutencao.dataInicioPrevista >= :inicio
              AND item.manutencao.dataInicioPrevista < :fim
            """)
    BigDecimal sumCostBetween(LocalDate inicio, LocalDate fim);

    @Query("""
            SELECT COUNT(m)
            FROM Maintenance m
            WHERE (m.status = br.com.logap.logitrack.maintenance.MaintenanceStatus.PENDENTE
                   AND m.dataInicioPrevista < :hoje)
               OR (m.status = br.com.logap.logitrack.maintenance.MaintenanceStatus.EM_REALIZACAO
                   AND m.dataFinalizacaoPrevista < :hoje)
            """)
    long countOverdue(LocalDate hoje);

    @Query(value = """
            SELECT m.id
            FROM manutencoes m
            WHERE m.status <> 'CONCLUIDA'
            ORDER BY
              CASE
                WHEN m.status = 'PENDENTE' AND m.data_inicio_prevista < CURRENT_DATE THEN 0
                WHEN m.status = 'EM_REALIZACAO' AND m.data_finalizacao_prevista < CURRENT_DATE THEN 0
                WHEN (m.status = 'PENDENTE' AND m.data_inicio_prevista = CURRENT_DATE)
                  OR (m.status = 'EM_REALIZACAO' AND m.data_finalizacao_prevista = CURRENT_DATE) THEN 1
                ELSE 2
              END,
              CASE WHEN m.status = 'PENDENTE'
                   THEN m.data_inicio_prevista
                   ELSE m.data_finalizacao_prevista
              END,
              m.id
            """, nativeQuery = true)
    List<Integer> findAgendaIds(Pageable pageable);
}
