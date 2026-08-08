package br.com.logap.logitrack.manifest.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Dados para emitir o romaneio de um trecho.
 *
 * So chegam aqui os campos que o SISTEMA NAO TEM. Motorista, CNH, placa,
 * cidades e distancia sao copiados do trecho e da viagem pelo servico — mandar
 * de novo abriria espaco para o documento divergir do que esta cadastrado.
 */
@Schema(description = "Emissao de romaneio de carga")
public record ManifestRequest(

    @NotNull(message = "Selecione o trecho.")
    Integer viagemEtapaId,

    @NotBlank(message = "Informe a razao social da transportadora.")
    @Size(max = 150, message = "A razao social deve ter no maximo 150 caracteres.")
    String transportadoraRazaoSocial,

    // Guardado como 14 digitos, sem pontuacao: forma canonica. Com pontuacao,
    // o mesmo CNPJ existiria como duas strings distintas e qualquer busca ou
    // comparacao futura falharia em silencio. A formatacao e da exibicao.
    @NotBlank(message = "Informe o CNPJ da transportadora.")
    @Pattern(regexp = "^\\d{14}$", message = "O CNPJ deve conter exatamente 14 digitos, sem pontuacao.")
    String transportadoraCnpj,

    @Size(max = 20, message = "O registro ANTT deve ter no maximo 20 caracteres.")
    String transportadoraAntt,

    @NotBlank(message = "Informe a descricao do veiculo.")
    @Size(max = 100, message = "A descricao do veiculo deve ter no maximo 100 caracteres.")
    String veiculoDescricao,

    @Size(max = 200, message = "O endereco de origem deve ter no maximo 200 caracteres.")
    String origemEndereco,

    @Size(max = 200, message = "O endereco de destino deve ter no maximo 200 caracteres.")
    String destinoEndereco,

    @NotEmpty(message = "Adicione ao menos um item a carga.")
    @Size(max = 50, message = "Um romaneio pode ter no maximo 50 itens.")
    List<@Valid ManifestItemRequest> itens
) {
}
