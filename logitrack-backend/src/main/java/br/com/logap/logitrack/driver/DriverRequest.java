package br.com.logap.logitrack.driver;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Dados cadastrais do motorista")
public record DriverRequest(
    @NotBlank(message = "Informe o nome.")
    @Size(max = 100)
    String nome,

    @NotBlank(message = "Informe a CNH.")
    @Pattern(regexp = "^\\d{11}$", message = "A CNH deve conter exatamente 11 digitos.")
    String cnh,

    @Size(max = 20)
    String telefone
) {
}
