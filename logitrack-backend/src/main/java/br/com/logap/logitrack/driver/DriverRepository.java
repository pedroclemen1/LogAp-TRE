package br.com.logap.logitrack.driver;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DriverRepository extends JpaRepository<Driver, Integer> {

    Optional<Driver> findByCnh(String cnh);

    @Query("""
            SELECT d FROM Driver d
            WHERE (:busca IS NULL
                   OR LOWER(d.nome) LIKE :busca
                   OR LOWER(d.cnh) LIKE :busca
                   OR LOWER(d.telefone) LIKE :busca)
              AND (:status = 'TODOS'
                   OR (:status = 'ATIVO' AND d.ativo = TRUE)
                   OR (:status = 'INATIVO' AND d.ativo = FALSE))
            ORDER BY d.nome
            """)
    List<Driver> findFiltered(String busca, String status);
}
