package br.com.logap.logitrack.manifest;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.logap.logitrack.manifest.projection.StageManifestView;

public interface ManifestRepository extends JpaRepository<Manifest, Integer> {

    boolean existsByViagemEtapaId(Integer viagemEtapaId);

    /**
     * Carrega o documento inteiro de uma vez.
     *
     * O JOIN FETCH dos itens e seguro aqui — e um registro so, sem paginacao.
     * `viagem` tambem vem junto porque o DTO le o id dela.
     */
    @Query("""
            SELECT m FROM Manifest m
            LEFT JOIN FETCH m.itens
            JOIN FETCH m.viagem
            JOIN FETCH m.viagemEtapa
            WHERE m.id = :id
            """)
    Optional<Manifest> findByIdWithItems(@Param("id") Integer id);

    @Query("""
            SELECT m FROM Manifest m
            LEFT JOIN FETCH m.itens
            JOIN FETCH m.viagem
            JOIN FETCH m.viagemEtapa
            WHERE m.viagemEtapa.id = :etapaId
            """)
    Optional<Manifest> findByEtapaIdWithItems(@Param("etapaId") Integer etapaId);

    /**
     * Aba "Romaneios emitidos".
     *
     * Pagina apenas ids: trazer a colecao de itens numa consulta paginada faria
     * o Hibernate paginar em memoria. Os totais sao somados depois, sobre a
     * pagina ja recortada.
     */
    @Query(value = """
            SELECT m.id FROM Manifest m
            WHERE (:busca IS NULL
                   OR LOWER(m.numero) LIKE :busca
                   OR LOWER(m.veiculoPlaca) LIKE :busca
                   OR LOWER(m.motoristaNome) LIKE :busca
                   OR LOWER(m.destinoNome) LIKE :busca)
            ORDER BY m.emitidoEm DESC, m.id DESC
            """,
        countQuery = """
            SELECT COUNT(m) FROM Manifest m
            WHERE (:busca IS NULL
                   OR LOWER(m.numero) LIKE :busca
                   OR LOWER(m.veiculoPlaca) LIKE :busca
                   OR LOWER(m.motoristaNome) LIKE :busca
                   OR LOWER(m.destinoNome) LIKE :busca)
            """)
    Page<Integer> findFilteredIds(@Param("busca") String busca, Pageable pageable);

    @Query("""
            SELECT m FROM Manifest m
            LEFT JOIN FETCH m.itens
            JOIN FETCH m.viagem
            JOIN FETCH m.viagemEtapa
            WHERE m.id IN :ids
            """)
    List<Manifest> findAllWithItemsByIdIn(@Param("ids") Collection<Integer> ids);

    /**
     * Quais TRECHOS da pagina ja tem romaneio, em UMA consulta.
     *
     * Evita perguntar `existsByViagemEtapaId` trecho a trecho na tela.
     */
    @Query("""
            SELECT m.viagemEtapa.id AS etapaId, m.id AS romaneioId
            FROM Manifest m
            WHERE m.viagemEtapa.id IN :etapaIds
            """)
    List<StageManifestView> findManifestIdsByEtapaIdIn(@Param("etapaIds") Collection<Integer> etapaIds);

    @Query(value = "SELECT nextval('romaneio_numero_seq')", nativeQuery = true)
    Long nextNumeroSequencial();
}
