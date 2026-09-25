package com.festafantasia.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {
    public record LoginRequest(
            @Email(message = "Informe um e-mail válido.") @NotBlank String email,
            @NotBlank(message = "Informe a senha.") String password
    ) {}

    public record LoginResponse(String token, String name, String email) {}

    public record BootstrapStatusResponse(boolean available) {}

    public record CreateAdminRequest(
            @NotBlank @Size(max = 120) String name,
            @Email @NotBlank @Size(max = 160) String email,
            @NotBlank @Size(min = 8, message = "A senha deve ter pelo menos 8 caracteres.") String password
    ) {}
}
