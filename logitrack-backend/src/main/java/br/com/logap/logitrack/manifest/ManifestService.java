package br.com.logap.logitrack.manifest;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import br.com.logap.logitrack.manifest.dto.ManifestCandidateResponse;
import br.com.logap.logitrack.manifest.dto.ManifestRequest;
import br.com.logap.logitrack.manifest.dto.ManifestResponse;
import br.com.logap.logitrack.manifest.dto.ManifestSummaryResponse;
import br.com.logap.logitrack.trip.TripStatus;

/**
 * Porta da aplicacao para os casos de uso de romaneio.
 *
 * Mantem um unico contrato para o controller enquanto leitura e escrita ficam
 * em componentes com dependencias e limites transacionais proprios.
 */
@Service
public class ManifestService {

    private final ManifestQueryService queryService;
    private final ManifestCommandService commandService;

    public ManifestService(ManifestQueryService queryService,
                           ManifestCommandService commandService) {
        this.queryService = queryService;
        this.commandService = commandService;
    }

    public Page<ManifestCandidateResponse> listCandidates(String busca, Integer veiculoId,
                                                           TripStatus status, Pageable pageable) {
        return queryService.listCandidates(busca, veiculoId, status, pageable);
    }

    public Page<ManifestSummaryResponse> list(String busca, Pageable pageable) {
        return queryService.list(busca, pageable);
    }

    public ManifestResponse findById(Integer id) {
        return queryService.findById(id);
    }

    public ManifestResponse findByStage(Integer etapaId) {
        return queryService.findByStage(etapaId);
    }

    public ManifestResponse issue(ManifestRequest request) {
        return commandService.issue(request);
    }

    public ManifestResponse update(Integer id, ManifestRequest request) {
        return commandService.update(id, request);
    }
}
