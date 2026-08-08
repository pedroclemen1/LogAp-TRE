package br.com.logap.logitrack.dashboard;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import br.com.logap.logitrack.dashboard.projection.CategoryVolumeView;
import br.com.logap.logitrack.dashboard.projection.DailyDistanceView;
import br.com.logap.logitrack.dashboard.projection.ScheduledMaintenanceView;
import br.com.logap.logitrack.dashboard.projection.VehicleUsageView;
import br.com.logap.logitrack.trip.Trip;

/**
 * Metricas operacionais extraidas por SQL nativo.
 *
 * Sao consultas de agregacao que nao mapeiam para nenhuma entidade — por isso
 * `Repository` puro (sem JpaRepository) e projecoes por interface: cada
 * consulta traz apenas as colunas que a tela usa, sem hidratar entidade.
 *
 * REGRA: quilometragem entra nas metricas somente apos a chegada real.
 * Distancias de trechos programados ou em andamento ainda sao planejamento.
 */
public interface DashboardRepository extends Repository<Trip, Integer> {

    /** 1. Total de KM percorrido — da frota inteira ou de um veiculo. */
    @Query(value = """
            SELECT COALESCE(SUM(v.km_percorrida), 0)
            FROM viagens v
            JOIN veiculos ve ON ve.id = v.veiculo_id
            WHERE v.data_chegada IS NOT NULL
              AND v.cancelada_em IS NULL
              AND (:veiculoId IS NULL OR v.veiculo_id = :veiculoId)
              AND (CAST(:inicio AS TIMESTAMP) IS NULL OR v.data_chegada >= CAST(:inicio AS TIMESTAMP))
              AND (CAST(:fim AS TIMESTAMP) IS NULL OR v.data_chegada < CAST(:fim AS TIMESTAMP))
              AND (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
            """, nativeQuery = true)
    BigDecimal totalKm(@Param("veiculoId") Integer veiculoId,
                       @Param("inicio") LocalDateTime inicio,
                       @Param("fim") LocalDateTime fim,
                       @Param("tipo") String tipo);

    /**
     * 2. Volume por Categoria — viagens por tipo de veiculo (LEVE x PESADO).
     * LEFT JOIN a partir de `veiculos` garante a linha com zero; um INNER JOIN
     * sumiria com a categoria que ainda nao tem viagem.
     */
    @Query(value = """
            SELECT ve.tipo                             AS tipo,
                   COUNT(v.id)                         AS totalViagens,
                   COALESCE(SUM(v.km_percorrida), 0)   AS totalKm
            FROM veiculos ve
            LEFT JOIN viagens v
                   ON v.veiculo_id = ve.id
                  AND v.data_chegada IS NOT NULL
                  AND v.cancelada_em IS NULL
                  AND (CAST(:inicio AS TIMESTAMP) IS NULL OR v.data_chegada >= CAST(:inicio AS TIMESTAMP))
                  AND (CAST(:fim AS TIMESTAMP) IS NULL OR v.data_chegada < CAST(:fim AS TIMESTAMP))
            WHERE (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
            GROUP BY ve.tipo
            ORDER BY ve.tipo
            """, nativeQuery = true)
    List<CategoryVolumeView> volumePorCategoria(@Param("inicio") LocalDateTime inicio,
                                                @Param("fim") LocalDateTime fim,
                                                @Param("tipo") String tipo);

    @Query(value = """
            SELECT CAST(v.data_chegada AS DATE) AS data,
                   COALESCE(SUM(v.km_percorrida), 0) AS totalKm
            FROM viagens v
            JOIN veiculos ve ON ve.id = v.veiculo_id
            WHERE v.data_chegada IS NOT NULL
              AND v.cancelada_em IS NULL
              AND (:veiculoId IS NULL OR v.veiculo_id = :veiculoId)
              AND v.data_chegada >= CAST(:inicio AS TIMESTAMP)
              AND v.data_chegada < CAST(:fim AS TIMESTAMP)
              AND (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
            GROUP BY CAST(v.data_chegada AS DATE)
            ORDER BY data
            """, nativeQuery = true)
    List<DailyDistanceView> distanciaPorDia(@Param("veiculoId") Integer veiculoId,
                                           @Param("inicio") LocalDateTime inicio,
                                           @Param("fim") LocalDateTime fim,
                                           @Param("tipo") String tipo);

    /**
     * 3. Cronograma — proximas 5 manutencoes agendadas, por data.
     * Usa idx_manutencoes_agenda, indice parcial em status <> 'CONCLUIDA'.
     */
    @Query(value = """
            SELECT m.id                AS id,
                   ve.placa            AS placa,
                   ve.modelo           AS modelo,
                   m.data_inicio_prevista                    AS dataInicio,
                   STRING_AGG(ms.nome_servico, ', ' ORDER BY ms.id) AS tipoServico,
                   COALESCE(SUM(ms.custo), 0)                AS custoEstimado,
                   m.status            AS status
            FROM manutencoes m
            JOIN veiculos ve ON ve.id = m.veiculo_id
            JOIN manutencao_servicos ms ON ms.manutencao_id = m.id
            WHERE m.status <> 'CONCLUIDA'
              AND m.data_inicio_prevista >= CURRENT_DATE
              AND (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
            GROUP BY m.id, ve.placa, ve.modelo, m.data_inicio_prevista, m.status
            ORDER BY m.data_inicio_prevista
            LIMIT 5
            """, nativeQuery = true)
    List<ScheduledMaintenanceView> proximasManutencoes(@Param("tipo") String tipo);

    /**
     * 4. Ranking de Utilizacao — veiculos por quilometragem acumulada.
     * Devolve a lista ordenada para o destaque e o grafico de ranking.
     */
    @Query(value = """
            SELECT ve.id                             AS id,
                   ve.placa                          AS placa,
                   ve.modelo                         AS modelo,
                   ve.tipo                           AS tipo,
                   COALESCE(SUM(v.km_percorrida), 0) AS kmAcumulado
            FROM veiculos ve
            LEFT JOIN viagens v
                   ON v.veiculo_id = ve.id
                  AND v.data_chegada IS NOT NULL
                  AND v.cancelada_em IS NULL
                  AND (CAST(:inicio AS TIMESTAMP) IS NULL OR v.data_chegada >= CAST(:inicio AS TIMESTAMP))
                  AND (CAST(:fim AS TIMESTAMP) IS NULL OR v.data_chegada < CAST(:fim AS TIMESTAMP))
            WHERE (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
            GROUP BY ve.id, ve.placa, ve.modelo, ve.tipo
            HAVING CAST(:inicio AS TIMESTAMP) IS NULL OR COUNT(v.id) > 0
            ORDER BY kmAcumulado DESC
            """, nativeQuery = true)
    List<VehicleUsageView> rankingUtilizacao(@Param("inicio") LocalDateTime inicio,
                                             @Param("fim") LocalDateTime fim,
                                             @Param("tipo") String tipo);

    /**
     * 5. Projecao Financeira — custo estimado de manutencao no mes atual.
     * Intervalo semiaberto para poder usar idx_manutencoes_data; um
     * DATE_TRUNC sobre a coluna impediria o indice.
     */
    @Query(value = """
            SELECT COALESCE(SUM(ms.custo), 0)
            FROM manutencoes m
            JOIN manutencao_servicos ms ON ms.manutencao_id = m.id
            JOIN veiculos ve ON ve.id = m.veiculo_id
            WHERE m.data_inicio_prevista >= DATE_TRUNC('month', CURRENT_DATE)
              AND m.data_inicio_prevista < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
              AND (CAST(:tipo AS TEXT) IS NULL OR ve.tipo = CAST(:tipo AS TEXT))
            """, nativeQuery = true)
    BigDecimal projecaoFinanceiraMesAtual(@Param("tipo") String tipo);
}
