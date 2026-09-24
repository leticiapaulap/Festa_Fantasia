package com.festafantasia.api.service;

import com.festafantasia.api.dto.VoteDtos.VoteRequest;
import com.festafantasia.api.dto.VoteDtos.VoteResponse;
import com.festafantasia.api.entity.Vote;
import com.festafantasia.api.exception.BusinessException;
import com.festafantasia.api.repository.VoteCodeRepository;
import com.festafantasia.api.repository.VoteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoteService {
    private final VoteRepository voteRepository;
    private final VoteCodeRepository voteCodeRepository;
    private final ParticipantService participantService;
    private final EventSettingsService settingsService;
    private final VoteCodeService voteCodeService;

    public VoteService(VoteRepository voteRepository, VoteCodeRepository voteCodeRepository, ParticipantService participantService, EventSettingsService settingsService, VoteCodeService voteCodeService) {
        this.voteRepository = voteRepository;
        this.voteCodeRepository = voteCodeRepository;
        this.participantService = participantService;
        this.settingsService = settingsService;
        this.voteCodeService = voteCodeService;
    }

    @Transactional
    public VoteResponse vote(VoteRequest request) {
        if (!settingsService.currentEntity().isVotingOpen()) {
            throw new BusinessException("A votação já foi encerrada.", HttpStatus.CONFLICT);
        }
        var participant = participantService.find(request.participantId());
        var code = voteCodeRepository.findByCodeForUpdate(voteCodeService.normalize(request.code()))
                .orElseThrow(() -> new BusinessException("Código de votação inválido.", HttpStatus.NOT_FOUND));
        if (code.isUsed()) {
            throw new BusinessException("Este código já foi utilizado para votar.", HttpStatus.CONFLICT);
        }
        var vote = new Vote();
        vote.setParticipant(participant);
        vote.setVoteCode(code);
        code.markUsed();
        voteRepository.save(vote);
        return new VoteResponse("Voto registrado! Obrigado por participar.");
    }
}
