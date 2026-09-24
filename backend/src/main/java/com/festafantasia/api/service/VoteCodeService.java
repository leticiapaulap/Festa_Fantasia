package com.festafantasia.api.service;

import com.festafantasia.api.dto.VoteDtos.GenerateCodesResponse;
import com.festafantasia.api.dto.VoteDtos.ValidateCodeResponse;
import com.festafantasia.api.dto.VoteDtos.VoteCodeResponse;
import com.festafantasia.api.entity.VoteCode;
import com.festafantasia.api.repository.VoteCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

@Service
public class VoteCodeService {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();
    private final VoteCodeRepository repository;

    public VoteCodeService(VoteCodeRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<VoteCodeResponse> list() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ValidateCodeResponse validate(String rawCode) {
        var code = normalize(rawCode);
        return repository.findByCode(code)
                .map(vc -> vc.isUsed()
                        ? new ValidateCodeResponse(false, true, "Este código já foi utilizado.")
                        : new ValidateCodeResponse(true, false, "Código válido."))
                .orElseGet(() -> new ValidateCodeResponse(false, false, "Código de votação inválido."));
    }

    @Transactional
    public GenerateCodesResponse generate(int quantity) {
        var safeQuantity = Math.max(1, Math.min(quantity, 500));
        var generated = new ArrayList<VoteCodeResponse>();
        while (generated.size() < safeQuantity) {
            var code = new VoteCode();
            code.setCode(newCode());
            if (repository.existsByCode(code.getCode())) {
                continue;
            }
            generated.add(toResponse(repository.save(code)));
        }
        return new GenerateCodesResponse(generated);
    }

    public String normalize(String code) {
        return code == null ? "" : code.trim().toUpperCase();
    }

    public VoteCodeResponse toResponse(VoteCode code) {
        return new VoteCodeResponse(code.getId(), code.getCode(), code.isUsed(), code.getCreatedAt(), code.getUsedAt());
    }

    private String newCode() {
        var builder = new StringBuilder("FESTA-");
        for (int i = 0; i < 5; i++) {
            builder.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return builder.toString();
    }
}
