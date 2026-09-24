package com.festafantasia.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public class ParticipantDtos {
    public record ParticipantRequest(
            @NotBlank(message = "Informe o nome do participante.") @Size(max = 120) String name,
            @NotBlank(message = "Informe o nome da fantasia.") @Size(max = 120) String costumeName,
            @Size(max = 1000) String description,
            @Size(max = 1000) String photoUrl
    ) {}

    public record ParticipantResponse(
            Long id,
            String name,
            String costumeName,
            String description,
            String photoUrl,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {}
}
