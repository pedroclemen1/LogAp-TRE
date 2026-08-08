package br.com.logap.logitrack.driver;

public record DriverResponse(
    Integer id,
    String nome,
    String cnh,
    String telefone,
    boolean ativo,
    DriverOperationalStatus statusOperacional
) {
    public static DriverResponse from(Driver driver, boolean inUse) {
        return new DriverResponse(
            driver.getId(), driver.getNome(), driver.getCnh(), driver.getTelefone(), driver.getAtivo(),
            inUse ? DriverOperationalStatus.EM_USO : DriverOperationalStatus.LIVRE);
    }
}
