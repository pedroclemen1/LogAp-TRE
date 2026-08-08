package br.com.logap.logitrack.trip;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TripEventRepository extends JpaRepository<TripEvent, Integer> {

    List<TripEvent> findByViagemIdOrderByOcorridoEmDesc(Integer viagemId);
}
