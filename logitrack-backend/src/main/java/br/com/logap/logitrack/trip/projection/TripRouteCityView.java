package br.com.logap.logitrack.trip.projection;

/**
 * Par (viagem, cidade) usado para montar a rota completa na listagem.
 *
 * Projecao em vez de entidade de proposito: a listagem so precisa do nome da
 * cidade na ordem certa. Carregar `TripStage` inteiro traria km, carga e datas
 * que a tabela nao mostra, e o acesso a `stage.getViagem().getId()` esbarraria
 * na inicializacao do proxy LAZY do relacionamento.
 */
public interface TripRouteCityView {

    Integer getViagemId();

    String getCidade();
}
