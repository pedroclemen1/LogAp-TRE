package br.com.logap.logitrack.manifest;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.manifest.dto.ManifestItemRequest;
import br.com.logap.logitrack.manifest.dto.ManifestRequest;
import br.com.logap.logitrack.manifest.dto.ManifestResponse;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.CurrentUserProvider;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.trip.Trip;
import br.com.logap.logitrack.trip.TripStage;
import br.com.logap.logitrack.trip.TripStageRepository;

@Service
public class ManifestCommandService {

    private final ManifestRepository repository;
    private final TripStageRepository stageRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ManifestIntegrityCodeGenerator integrityCodeGenerator;
    private final Clock clock;

    public ManifestCommandService(ManifestRepository repository,
                                  TripStageRepository stageRepository,
                                  CurrentUserProvider currentUserProvider,
                                  ManifestIntegrityCodeGenerator integrityCodeGenerator,
                                  Clock clock) {
        this.repository = repository;
        this.stageRepository = stageRepository;
        this.currentUserProvider = currentUserProvider;
        this.integrityCodeGenerator = integrityCodeGenerator;
        this.clock = clock;
    }

    @Transactional
    public ManifestResponse issue(ManifestRequest request) {
        TripStage stage = stageRepository.findByIdWithTrip(request.viagemEtapaId())
            .orElseThrow(() -> new ResourceNotFoundException("Trecho", request.viagemEtapaId()));
        Trip trip = stage.getViagem();

        validateIssuance(stage, trip);
        validateUniqueInvoices(request.itens());

        LocalDateTime issuedAt = LocalDateTime.now(clock);
        Manifest manifest = new Manifest(
            stage,
            trip,
            stage.getOrdem(),
            nextNumber(issuedAt),
            issuedAt,
            currentUserProvider.currentUserName());

        applyCarrier(manifest, request);
        manifest.definirVeiculoEMotorista(
            trip.getMotorista().getNome(),
            trip.getMotorista().getCnh(),
            trip.getVeiculo().getPlaca(),
            request.veiculoDescricao().trim());
        manifest.definirRota(
            stageOrigin(trip, stage),
            blankToNull(request.origemEndereco()),
            stage.getCidade(),
            blankToNull(request.destinoEndereco()),
            stage.getKmTrecho());
        manifest.substituirItens(toItems(request.itens()));
        refreshIntegrityCode(manifest);

        repository.save(manifest);
        repository.flush();
        return ManifestResponse.from(manifest);
    }

    @Transactional
    public ManifestResponse update(Integer id, ManifestRequest request) {
        Manifest manifest = repository.findByIdWithItems(id)
            .orElseThrow(() -> new ResourceNotFoundException("Romaneio", id));
        validateUniqueInvoices(request.itens());

        applyCarrier(manifest, request);
        manifest.definirVeiculoEMotorista(
            manifest.getMotoristaNome(),
            manifest.getMotoristaCnh(),
            manifest.getVeiculoPlaca(),
            request.veiculoDescricao().trim());
        manifest.definirRota(
            manifest.getOrigemNome(),
            blankToNull(request.origemEndereco()),
            manifest.getDestinoNome(),
            blankToNull(request.destinoEndereco()),
            manifest.getDistanciaKm());

        // A restricao UNIQUE (romaneio_id, sequencia) exige remover os itens
        // antigos antes de inserir a nova numeracao.
        manifest.limparItens();
        repository.flush();
        manifest.substituirItens(toItems(request.itens()));
        refreshIntegrityCode(manifest);
        repository.flush();

        return ManifestResponse.from(manifest);
    }

    private void validateIssuance(TripStage stage, Trip trip) {
        if (!stage.concluido()) {
            throw new BusinessRuleException("Conclua o trecho antes de emitir o romaneio.");
        }
        if (trip.getMotorista() == null) {
            throw new BusinessRuleException("Atribua um motorista antes de emitir o romaneio.");
        }
        if (repository.existsByViagemEtapaId(stage.getId())) {
            throw new BusinessRuleException("Este trecho ja possui romaneio emitido.");
        }
    }

    private static void applyCarrier(Manifest manifest, ManifestRequest request) {
        manifest.definirTransportadora(
            request.transportadoraRazaoSocial().trim(),
            request.transportadoraCnpj().trim(),
            blankToNull(request.transportadoraAntt()));
    }

    private void refreshIntegrityCode(Manifest manifest) {
        manifest.definirAutenticacao(integrityCodeGenerator.generate(manifest));
    }

    private String stageOrigin(Trip trip, TripStage stage) {
        if (stage.getOrdem() <= 1) {
            return trip.getOrigem();
        }
        return stageRepository.findByViagemIdOrderByOrdemAsc(trip.getId()).stream()
            .filter(previous -> previous.getOrdem() == stage.getOrdem() - 1)
            .findFirst()
            .map(TripStage::getCidade)
            .orElse(trip.getOrigem());
    }

    private String nextNumber(LocalDateTime issuedAt) {
        return "RC-%d-%04d".formatted(issuedAt.getYear(), repository.nextNumeroSequencial());
    }

    private static List<ManifestItem> toItems(List<ManifestItemRequest> items) {
        return items.stream()
            .map(item -> new ManifestItem(
                item.notaFiscal().trim(),
                item.destinatario().trim(),
                item.volumes(),
                item.pesoKg()))
            .toList();
    }

    private static void validateUniqueInvoices(List<ManifestItemRequest> items) {
        Set<String> seen = new HashSet<>();
        for (ManifestItemRequest item : items) {
            String normalizedInvoice = item.notaFiscal().trim().toLowerCase(Locale.ROOT);
            if (!seen.add(normalizedInvoice)) {
                throw new BusinessRuleException("A mesma nota fiscal foi informada mais de uma vez.");
            }
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
