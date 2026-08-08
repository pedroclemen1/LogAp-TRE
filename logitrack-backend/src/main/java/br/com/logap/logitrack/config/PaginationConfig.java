package br.com.logap.logitrack.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;

/**
 * Estabiliza o JSON de paginacao.
 *
 * Sem isto o Spring serializa o `PageImpl` como bean e avisa no log:
 * "Serializing PageImpl instances as-is is not supported... no guarantee about
 * the stability of the resulting JSON structure". O contrato ficaria refem de
 * detalhes internos da classe.
 *
 * Com VIA_DTO a resposta passa a ser o PagedModel, estavel e documentado:
 *   { "content": [...],
 *     "page": { "size": 20, "number": 0, "totalElements": 7, "totalPages": 1 } }
 *
 * O cliente do frontend esta sendo escrito agora contra este formato.
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class PaginationConfig {
}
