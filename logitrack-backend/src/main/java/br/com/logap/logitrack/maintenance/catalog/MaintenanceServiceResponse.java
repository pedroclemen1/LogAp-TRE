package br.com.logap.logitrack.maintenance.catalog;

public record MaintenanceServiceResponse(
    Integer id,
    String nome,
    boolean ativo
) {
    public static MaintenanceServiceResponse from(MaintenanceServiceType service) {
        return new MaintenanceServiceResponse(service.getId(), service.getNome(), service.getAtivo());
    }
}
