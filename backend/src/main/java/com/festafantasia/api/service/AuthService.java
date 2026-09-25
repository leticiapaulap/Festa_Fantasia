package com.festafantasia.api.service;

import com.festafantasia.api.dto.AuthDtos.BootstrapStatusResponse;
import com.festafantasia.api.dto.AuthDtos.CreateAdminRequest;
import com.festafantasia.api.dto.AuthDtos.LoginRequest;
import com.festafantasia.api.dto.AuthDtos.LoginResponse;
import com.festafantasia.api.entity.AdminUser;
import com.festafantasia.api.exception.BusinessException;
import com.festafantasia.api.repository.AdminUserRepository;
import com.festafantasia.api.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final AdminUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(AdminUserRepository repository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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
        if (repository.count() > 0) {
            throw new BusinessException("Administrador inicial ja foi criado.", HttpStatus.CONFLICT);
        }
        var email = normalizeEmail(request.email());
        if (repository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Ja existe um administrador cadastrado.", HttpStatus.CONFLICT);
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
}
