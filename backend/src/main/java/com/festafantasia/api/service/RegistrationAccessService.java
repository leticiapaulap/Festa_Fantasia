package com.festafantasia.api.service;

import com.festafantasia.api.dto.RegistrationDtos.AccessResponse;
import com.festafantasia.api.exception.BusinessException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RegistrationAccessService {
    private static final long TOKEN_MINUTES = 30;
    private static final int MAX_ATTEMPTS = 8;
    private static final Duration ATTEMPT_WINDOW = Duration.ofMinutes(10);
    private static final String TOKEN_TYPE = "registration-access";

    private final String accessCode;
    private final SecretKey key;
    private final ConcurrentHashMap<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    public RegistrationAccessService(
            @Value("${app.registration.access-code}") String accessCode,
            @Value("${app.jwt.secret}") String secret
    ) {
        this.accessCode = normalize(accessCode);
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public AccessResponse grant(String code, HttpServletRequest request) {
        var ip = clientIp(request);
        assertAllowed(ip);
        if (accessCode.isBlank() || !accessCode.equals(normalize(code))) {
            registerFailure(ip);
            throw new BusinessException("Código de acesso inválido.", HttpStatus.FORBIDDEN);
        }
        attempts.remove(ip);
        var now = Instant.now();
        var token = Jwts.builder()
                .subject("public-registration")
                .claim("type", TOKEN_TYPE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(TOKEN_MINUTES * 60)))
                .signWith(key)
                .compact();
        return new AccessResponse(token, TOKEN_MINUTES);
    }

    public void requireValid(String token) {
        if (token == null || token.isBlank()) {
            throw new BusinessException("Informe o código de acesso antes de cadastrar.", HttpStatus.FORBIDDEN);
        }
        try {
            var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            if (!TOKEN_TYPE.equals(claims.get("type", String.class))) {
                throw new BusinessException("Autorização de cadastro inválida.", HttpStatus.FORBIDDEN);
            }
        } catch (JwtException | IllegalArgumentException exception) {
            throw new BusinessException("Autorização de cadastro expirada ou inválida.", HttpStatus.FORBIDDEN);
        }
    }

    private void assertAllowed(String ip) {
        var window = attempts.get(ip);
        if (window == null || window.expired()) {
            attempts.remove(ip);
            return;
        }
        if (window.count >= MAX_ATTEMPTS) {
            throw new BusinessException("Muitas tentativas. Aguarde alguns minutos e tente novamente.", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    private void registerFailure(String ip) {
        attempts.compute(ip, (key, current) -> {
            if (current == null || current.expired()) {
                return new AttemptWindow(1, Instant.now().plus(ATTEMPT_WINDOW));
            }
            return new AttemptWindow(current.count + 1, current.expiresAt);
        });
    }

    private String clientIp(HttpServletRequest request) {
        var forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private record AttemptWindow(int count, Instant expiresAt) {
        boolean expired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
