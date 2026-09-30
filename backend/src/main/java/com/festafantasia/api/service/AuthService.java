package com.festafantasia.api.service;

import com.festafantasia.api.dto.AuthDtos.BootstrapStatusResponse;
import com.festafantasia.api.dto.AuthDtos.CreateAdminRequest;
import com.festafantasia.api.dto.AuthDtos.LoginRequest;
import com.festafantasia.api.dto.AuthDtos.LoginResponse;
import com.festafantasia.api.entity.AdminUser;
import com.festafantasia.api.exception.BusinessException;
import com.festafantasia.api.repository.AdminUserRepository;
import com.festafantasia.api.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    private static final int MAX_ADMIN_CODE_ATTEMPTS = 8;
    private static final Duration ADMIN_CODE_WINDOW = Duration.ofMinutes(10);

    private final AdminUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String adminRegistrationCode;
    private final ConcurrentHashMap<String, AttemptWindow> adminCodeAttempts = new ConcurrentHashMap<>();

    public AuthService(AdminUserRepository repository, PasswordEncoder passwordEncoder, JwtService jwtService, @Value("${app.admin.registration-code}") String adminRegistrationCode) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.adminRegistrationCode = normalizeCode(adminRegistrationCode);
    }

    @Transactional(readOnly = true)
    public BootstrapStatusResponse bootstrapStatus() {
        return new BootstrapStatusResponse(repository.count() == 0);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        var email = normalizeEmail(request.email());
        var admin = repository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("E-mail ou senha invalidos.", HttpStatus.UNAUTHORIZED));
        if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
            throw new BusinessException("E-mail ou senha invalidos.", HttpStatus.UNAUTHORIZED);
        }
        return new LoginResponse(jwtService.issue(admin), admin.getName(), admin.getEmail());
    }

    @Transactional
    public LoginResponse bootstrap(CreateAdminRequest request) {
        var email = normalizeEmail(request.email());
        validateAdminRegistrationCode(request.authorizationCode(), email);
        if (repository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Já existe uma conta com este e-mail.", HttpStatus.CONFLICT);
        }
        if (repository.count() > 0) {
            throw new BusinessException("Administrador inicial ja foi criado.", HttpStatus.CONFLICT);
        }
        var admin = new AdminUser();
        admin.setName(request.name().trim());
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(request.password()));
        repository.save(admin);
        return new LoginResponse(jwtService.issue(admin), admin.getName(), admin.getEmail());
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private void validateAdminRegistrationCode(String code, String key) {
        assertAttemptAllowed(key);
        if (adminRegistrationCode.isBlank() || !adminRegistrationCode.equals(normalizeCode(code))) {
            registerAttemptFailure(key);
            throw new BusinessException("Código de autorização inválido.", HttpStatus.FORBIDDEN);
        }
        adminCodeAttempts.remove(key);
    }

    private void assertAttemptAllowed(String key) {
        var window = adminCodeAttempts.get(key);
        if (window == null || window.expired()) {
            adminCodeAttempts.remove(key);
            return;
        }
        if (window.count >= MAX_ADMIN_CODE_ATTEMPTS) {
            throw new BusinessException("Muitas tentativas. Aguarde alguns minutos e tente novamente.", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    private void registerAttemptFailure(String key) {
        adminCodeAttempts.compute(key, (ignored, current) -> {
            if (current == null || current.expired()) {
                return new AttemptWindow(1, Instant.now().plus(ADMIN_CODE_WINDOW));
            }
            return new AttemptWindow(current.count + 1, current.expiresAt);
        });
    }

    private String normalizeCode(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }

    private record AttemptWindow(int count, Instant expiresAt) {
        boolean expired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
