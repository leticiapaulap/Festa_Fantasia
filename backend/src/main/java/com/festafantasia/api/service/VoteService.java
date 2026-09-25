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
        var settings = settingsService.currentEntity();
        if (!settingsService.canAcceptVotes(settings)) {
            throw new BusinessException(messageFor(settingsService.availability(settings)), HttpStatus.CONFLICT);
        }
        var participant = participantService.find(request.participantId());
        if (!participant.isActive()) {
            throw new BusinessException("Esta fantasia não está disponível para votação.", HttpStatus.CONFLICT);
        }
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

    private String messageFor(String availability) {
        return switch (availability) {
            case "BEFORE_WINDOW", "DRAFT", "NOT_CONFIGURED" -> "A votação ainda não está disponível.";
            case "AFTER_WINDOW", "CLOSED" -> "A votação foi encerrada.";
            default -> "A votação não está disponível.";
        };
    }
}
