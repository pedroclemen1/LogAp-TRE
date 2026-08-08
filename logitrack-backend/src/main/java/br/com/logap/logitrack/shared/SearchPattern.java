package br.com.logap.logitrack.shared;

import java.util.Locale;

public final class SearchPattern {

    private SearchPattern() {
    }

    public static String contains(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String escaped = value.trim().toLowerCase(Locale.ROOT)
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
