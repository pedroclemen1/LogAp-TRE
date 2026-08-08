package br.com.logap.logitrack.trip;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.logap.logitrack.trip.projection.TripRouteCityView;

public interface TripStageRepository extends JpaRepository<TripStage, Integer> {

    List<TripStage> findByViagemIdOrderByOrdemAsc(Integer viagemId);

    /**
     * Cidades da rota de VARIAS viagens de uma vez, para a listagem montar o
     * caminho completo (origem -> paradas -> destino) de cada linha.
     *
     * Duas consultas no total, nao N+1: a pagina de viagens sai numa, as
     * cidades de todas elas na outra. Um JOIN FETCH da colecao na propria
     * consulta paginada faria o Hibernate paginar em memoria.
     *
     * `s.viagem.id` nao gera JOIN — o JPQL le direto a coluna de chave
     * estrangeira de `viagem_etapas`.
     */
    @Query("""
            SELECT s.viagem.id AS viagemId, s.cidade AS cidade
            FROM TripStage s
            WHERE s.viagem.id IN :viagemIds
            ORDER BY s.viagem.id ASC, s.ordem ASC
            """)
    List<TripRouteCityView> findRouteCities(@Param("viagemIds") Collection<Integer> viagemIds);

    /**
     * Trechos completos de VARIAS viagens, para a tela de Romaneios montar cada
     * perna com km, carga e chegada.
     *
     * Diferente de `findRouteCities`, que so traz o nome da cidade: ali a
     * listagem de Viagens quer o caminho; aqui a de Romaneios quer o trecho
     * inteiro. Uma consulta para a pagina toda, nao uma por viagem.
     */
    List<TripStage> findByViagemIdInOrderByViagemIdAscOrdemAsc(Collection<Integer> viagemIds);

    /**
     * Um trecho com a viagem, o veiculo e o motorista ja carregados.
     *
     * A emissao do romaneio copia todos eles para o snapshot; sem o JOIN FETCH
     * cada acesso dispararia uma consulta a mais dentro da transacao.
     */
    @Query("""
            SELECT s FROM TripStage s
            JOIN FETCH s.viagem v
            JOIN FETCH v.veiculo
            LEFT JOIN FETCH v.motorista
            WHERE s.id = :id
            """)
    Optional<TripStage> findByIdWithTrip(@Param("id") Integer id);
}
