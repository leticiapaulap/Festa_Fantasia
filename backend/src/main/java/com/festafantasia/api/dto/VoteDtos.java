package com.festafantasia.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

public class VoteDtos {
    public record VoteRequest(
            @NotNull(message = "Escolha uma fantasia para votar.") Long participantId,
            @NotBlank(message = "Informe seu código de votação.") String code
    ) {}

    public record VoteResponse(String message) {}

    public record ValidateCodeRequest(@NotBlank(message = "Informe seu código de votação.") String code) {}
    public record ValidateCodeResponse(boolean valid, boolean used, String message) {}

    public record VoteCodeResponse(Long id, String code, boolean used, OffsetDateTime createdAt, OffsetDateTime usedAt) {}
    public record GenerateCodesRequest(Integer quantity) {}
    public record GenerateCodesResponse(List<VoteCodeResponse> codes) {}
}
