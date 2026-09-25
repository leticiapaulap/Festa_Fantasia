package com.festafantasia.api.service;

import com.festafantasia.api.exception.BusinessException;
import com.festafantasia.api.repository.VoteCodeRepository;
import com.festafantasia.api.repository.VoteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoteMaintenanceService {
    private final VoteRepository voteRepository;
    private final VoteCodeRepository voteCodeRepository;

    public VoteMaintenanceService(VoteRepository voteRepository, VoteCodeRepository voteCodeRepository) {
        this.voteRepository = voteRepository;
        this.voteCodeRepository = voteCodeRepository;
    }

    @Transactional
    public void resetVotes(String confirmation) {
        if (!"ZERAR".equals(confirmation)) {
            throw new BusinessException("Digite ZERAR para confirmar.", HttpStatus.BAD_REQUEST);
        }
        voteRepository.deleteAllInBatch();
        voteCodeRepository.findAll().forEach(code -> code.resetUsage());
    }
}
