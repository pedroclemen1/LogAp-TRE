package br.com.logap.logitrack.manifest;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

import org.springframework.stereotype.Component;

@Component
class ManifestIntegrityCodeGenerator {

    private static final int CODE_HEX_LENGTH = 16;

    String generate(Manifest manifest) {
        MessageDigest digest = sha256();
        update(digest, manifest.getNumero());
        update(digest, manifest.getViagem().getId());
        update(digest, manifest.getViagemEtapa().getId());
        update(digest, manifest.getTrechoOrdem());
        update(digest, manifest.getEmitidoEm());
        update(digest, manifest.getEmitidoPor());
        update(digest, manifest.getTransportadoraRazaoSocial());
        update(digest, manifest.getTransportadoraCnpj());
        update(digest, manifest.getTransportadoraAntt());
        update(digest, manifest.getMotoristaNome());
        update(digest, manifest.getMotoristaCnh());
        update(digest, manifest.getVeiculoPlaca());
        update(digest, manifest.getVeiculoDescricao());
        update(digest, manifest.getOrigemNome());
        update(digest, manifest.getOrigemEndereco());
        update(digest, manifest.getDestinoNome());
        update(digest, manifest.getDestinoEndereco());
        update(digest, manifest.getDistanciaKm());

        for (ManifestItem item : manifest.getItens()) {
            update(digest, item.getSequencia());
            update(digest, item.getNotaFiscal());
            update(digest, item.getDestinatario());
            update(digest, item.getVolumes());
            update(digest, item.getPesoKg());
        }

        return HexFormat.of().formatHex(digest.digest()).substring(0, CODE_HEX_LENGTH);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel nesta JVM.", exception);
        }
    }

    private static void update(MessageDigest digest, Object value) {
        if (value == null) {
            updateLength(digest, -1);
            return;
        }

        byte[] bytes = canonical(value).getBytes(StandardCharsets.UTF_8);
        updateLength(digest, bytes.length);
        digest.update(bytes);
    }

    private static String canonical(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal.stripTrailingZeros().toPlainString();
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.truncatedTo(ChronoUnit.MICROS).toString();
        }
        return value.toString();
    }

    private static void updateLength(MessageDigest digest, int length) {
        digest.update((byte) (length >>> 24));
        digest.update((byte) (length >>> 16));
        digest.update((byte) (length >>> 8));
        digest.update((byte) length);
    }
}
