package com.festafantasia.api.dto;

import jakarta.validation.constraints.NotBlank;

public class RegistrationDtos {
    public record AccessRequest(
            @NotBlank(message = "Informe o código de acesso.") String code
    ) {}

    public record AccessResponse(
            String token,
            long expiresInMinutes
    ) {}
}
