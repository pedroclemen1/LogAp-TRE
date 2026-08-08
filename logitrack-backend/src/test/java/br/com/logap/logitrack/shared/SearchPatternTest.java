package br.com.logap.logitrack.shared;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SearchPatternTest {

    @Test
    void normalizaBuscaParaComparacaoSemDiferenciarMaiusculas() {
        assertThat(SearchPattern.contains("  Volvo FH  ")).isEqualTo("%volvo fh%");
    }

    @Test
    void escapaCaracteresEspeciaisDoLike() {
        assertThat(SearchPattern.contains("50%_\\taxa")).isEqualTo("%50\\%\\_\\\\taxa%");
    }

    @Test
    void ignoraBuscaAusenteOuEmBranco() {
        assertThat(SearchPattern.contains(null)).isNull();
        assertThat(SearchPattern.contains("   ")).isNull();
    }
}
