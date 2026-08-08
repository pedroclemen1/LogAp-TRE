package br.com.logap.logitrack.maintenance.catalog;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MaintenanceServiceTypeRepository extends JpaRepository<MaintenanceServiceType, Integer> {

    @Query("SELECT s FROM MaintenanceServiceType s WHERE LOWER(s.nome) = LOWER(:name)")
    Optional<MaintenanceServiceType> findByNameIgnoreCase(String name);

    @Query("""
            SELECT s FROM MaintenanceServiceType s
            WHERE (:busca IS NULL OR LOWER(s.nome) LIKE :busca)
              AND (:status = 'TODOS'
                   OR (:status = 'ATIVO' AND s.ativo = TRUE)
                   OR (:status = 'INATIVO' AND s.ativo = FALSE))
            ORDER BY s.nome
            """)
    List<MaintenanceServiceType> findFiltered(String busca, String status);
}
