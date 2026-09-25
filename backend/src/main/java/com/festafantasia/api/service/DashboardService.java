package com.festafantasia.api.service;

import com.festafantasia.api.dto.ResultDtos.DashboardResponse;
import com.festafantasia.api.repository.ParticipantRepository;
import com.festafantasia.api.repository.VoteCodeRepository;
import com.festafantasia.api.repository.VoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    private final ParticipantRepository participantRepository;
    private final VoteRepository voteRepository;
    private final VoteCodeRepository voteCodeRepository;
    private final EventSettingsService settingsService;
    private final ResultService resultService;

    public DashboardService(ParticipantRepository participantRepository, VoteRepository voteRepository, VoteCodeRepository voteCodeRepository, EventSettingsService settingsService, ResultService resultService) {
        this.participantRepository = participantRepository;
        this.voteRepository = voteRepository;
        this.voteCodeRepository = voteCodeRepository;
        this.settingsService = settingsService;
        this.resultService = resultService;
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        var settings = settingsService.current();
        var status = settings.canAcceptVotes() ? "VOTAÇÃO ABERTA" : settings.votingAvailability();
        return new DashboardResponse(
                participantRepository.count(),
                voteRepository.count(),
                voteCodeRepository.countByUsed(false),
                voteCodeRepository.countByUsed(true),
                status,
                settings,
                resultService.results()
        );
    }
}
