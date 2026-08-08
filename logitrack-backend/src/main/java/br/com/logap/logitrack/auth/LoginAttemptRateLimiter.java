package br.com.logap.logitrack.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;

import org.springframework.stereotype.Component;

@Component
public class LoginAttemptRateLimiter {

    private final LoginRateLimitProperties properties;
    private final LoginAttemptKeyHasher keyHasher;
    private final Clock clock;
    private final Map<String, AttemptWindow> attempts = new HashMap<>();
    private final NavigableMap<Instant, HashSet<String>> unblockedKeysByExpiration = new TreeMap<>();
    private final NavigableMap<Instant, HashSet<String>> blockedKeysByExpiration = new TreeMap<>();
    private final Object monitor = new Object();
    private Instant nextCleanupAt;

    public LoginAttemptRateLimiter(LoginRateLimitProperties properties,
                                   LoginAttemptKeyHasher keyHasher,
                                   Clock clock) {
        this.properties = properties;
        this.keyHasher = keyHasher;
        this.clock = clock;
        this.nextCleanupAt = clock.instant().plus(properties.cleanupInterval());
    }

    public void checkAllowed(String email, String remoteAddress) {
        if (!properties.enabled()) {
            return;
        }

        String key = keyHasher.hash(email, remoteAddress);
        Instant now = clock.instant();
        synchronized (monitor) {
            cleanupExpiredIfDue(now);
            AttemptWindow window = attempts.get(key);
            if (window != null && window.isExpiredAt(now)) {
                remove(key, window);
                window = null;
            }

            if (window != null && window.failedAttempts() >= properties.maxFailedAttempts()) {
                throw new LoginRateLimitExceededException(Duration.between(now, window.expiresAt()));
            }
        }
    }

    public void recordFailure(String email, String remoteAddress) {
        if (!properties.enabled()) {
            return;
        }

        String key = keyHasher.hash(email, remoteAddress);
        Instant now = clock.instant();
        synchronized (monitor) {
            cleanupExpiredIfDue(now);
            AttemptWindow current = attempts.get(key);
            if (current != null && !current.isExpiredAt(now)) {
                AttemptWindow incremented = current.increment();
                attempts.put(key, incremented);
                if (!isBlocked(current) && isBlocked(incremented)) {
                    removeFromIndex(unblockedKeysByExpiration, key, current.expiresAt());
                    addToIndex(blockedKeysByExpiration, key, incremented.expiresAt());
                }
                return;
            }
            if (current != null) {
                remove(key, current);
            }

            ensureCapacity(now);
            put(key, AttemptWindow.firstFailure(now.plus(properties.window())));
        }
    }

    public void recordSuccess(String email, String remoteAddress) {
        if (!properties.enabled()) {
            return;
        }

        String key = keyHasher.hash(email, remoteAddress);
        synchronized (monitor) {
            AttemptWindow current = attempts.get(key);
            if (current != null) {
                remove(key, current);
            }
        }
    }

    private void ensureCapacity(Instant now) {
        if (attempts.size() < properties.maxTrackedIdentities()) {
            return;
        }

        cleanupExpired(now);
        if (attempts.size() >= properties.maxTrackedIdentities()) {
            evictEarliestExpiration();
        }
    }

    private void cleanupExpiredIfDue(Instant now) {
        if (now.isBefore(nextCleanupAt)) {
            return;
        }
        cleanupExpired(now);
        nextCleanupAt = now.plus(properties.cleanupInterval());
    }

    private void cleanupExpired(Instant now) {
        cleanupExpired(unblockedKeysByExpiration, now);
        cleanupExpired(blockedKeysByExpiration, now);
    }

    private void cleanupExpired(NavigableMap<Instant, HashSet<String>> index, Instant now) {
        while (!index.isEmpty() && !index.firstKey().isAfter(now)) {
            Map.Entry<Instant, HashSet<String>> expired = index.pollFirstEntry();
            for (String key : expired.getValue()) {
                AttemptWindow current = attempts.get(key);
                if (current != null && current.expiresAt().equals(expired.getKey())) {
                    attempts.remove(key);
                }
            }
        }
    }

    private void evictEarliestExpiration() {
        NavigableMap<Instant, HashSet<String>> index = unblockedKeysByExpiration.isEmpty()
            ? blockedKeysByExpiration
            : unblockedKeysByExpiration;
        Map.Entry<Instant, HashSet<String>> earliest = index.firstEntry();
        if (earliest == null) {
            return;
        }

        String key = earliest.getValue().iterator().next();
        AttemptWindow current = attempts.get(key);
        if (current != null) {
            remove(key, current);
        }
    }

    private void put(String key, AttemptWindow window) {
        attempts.put(key, window);
        addToIndex(indexFor(window), key, window.expiresAt());
    }

    private void remove(String key, AttemptWindow window) {
        attempts.remove(key);
        removeFromIndex(indexFor(window), key, window.expiresAt());
    }

    private NavigableMap<Instant, HashSet<String>> indexFor(AttemptWindow window) {
        return isBlocked(window) ? blockedKeysByExpiration : unblockedKeysByExpiration;
    }

    private boolean isBlocked(AttemptWindow window) {
        return window.failedAttempts() >= properties.maxFailedAttempts();
    }

    private void addToIndex(NavigableMap<Instant, HashSet<String>> index,
                            String key, Instant expiration) {
        index.computeIfAbsent(expiration, ignored -> new HashSet<>()).add(key);
    }

    private void removeFromIndex(NavigableMap<Instant, HashSet<String>> index,
                                 String key, Instant expiration) {
        HashSet<String> keys = index.get(expiration);
        if (keys == null) {
            return;
        }

        keys.remove(key);
        if (keys.isEmpty()) {
            index.remove(expiration);
        }
    }

    int trackedIdentityCount() {
        synchronized (monitor) {
            return attempts.size();
        }
    }

    private record AttemptWindow(int failedAttempts, Instant expiresAt) {

        private static AttemptWindow firstFailure(Instant expiresAt) {
            return new AttemptWindow(1, expiresAt);
        }

        private AttemptWindow increment() {
            return new AttemptWindow(failedAttempts + 1, expiresAt);
        }

        private boolean isExpiredAt(Instant instant) {
            return !expiresAt.isAfter(instant);
        }
    }
}
