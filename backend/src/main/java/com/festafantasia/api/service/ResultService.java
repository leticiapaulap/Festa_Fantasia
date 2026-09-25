package com.festafantasia.api.service;

import com.festafantasia.api.dto.ResultDtos.RankingItem;
import com.festafantasia.api.dto.ResultDtos.ResultsResponse;
import com.festafantasia.api.repository.ParticipantRepository;
import com.festafantasia.api.repository.VoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;

@Service
public class ResultService {
    private final ParticipantRepository participantRepository;
    private final VoteRepository voteRepository;
    private final EventSettingsService settingsService;

    public ResultService(ParticipantRepository participantRepository, VoteRepository voteRepository, EventSettingsService settingsService) {
        this.participantRepository = participantRepository;
        this.voteRepository = voteRepository;
        this.settingsService = settingsService;
    }

    @Transactional(readOnly = true)
    public ResultsResponse results() {
        return results(false);
    }

    @Transactional(readOnly = true)
    public ResultsResponse publicResults() {
        return results(true);
    }

    private ResultsResponse results(boolean publicView) {
        var settings = settingsService.currentEntity();
        var canShowPublic = !publicView || (settings.isShowPublicResults() && "CLOSED".equals(settings.getVotingStatus()));
        if (!canShowPublic) {
            return new ResultsResponse(settings.isVotingOpen(), settings.isShowPublicResults(), false, 0, java.util.List.of(), java.util.List.of());
        }
        var counts = new HashMap<Long, Long>();
        voteRepository.countVotesByParticipant()
                .forEach(row -> counts.put((Long) row[0], (Long) row[1]));
        var totalVotes = counts.values().stream().mapToLong(Long::longValue).sum();
        var ranking = participantRepository.findAll().stream()
                .map(p -> {
                    var votes = counts.getOrDefault(p.getId(), 0L);
                    var percentage = totalVotes == 0 ? 0 : (votes * 100.0) / totalVotes;
                    return new RankingItem(p.getId(), p.getName(), p.getCostumeName(), p.getDescription(), p.getPhotoUrl(), votes, percentage);
                })
                .sorted(Comparator.comparingLong(RankingItem::votes).reversed().thenComparing(RankingItem::costumeName))
                .toList();
        var max = ranking.stream().mapToLong(RankingItem::votes).max().orElse(0);
        var winners = max == 0 ? java.util.List.<RankingItem>of() : ranking.stream().filter(item -> item.votes() == max).toList();
        return new ResultsResponse(settings.isVotingOpen(), settings.isShowPublicResults(), winners.size() > 1, totalVotes, ranking, winners);
    }
}
