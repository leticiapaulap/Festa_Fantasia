package com.festafantasia.api.dto;

import java.util.List;

public class ResultDtos {
    public record RankingItem(
            Long participantId,
            String participantName,
            String costumeName,
            String description,
            String photoUrl,
            long votes,
            double percentage
    ) {}

    public record ResultsResponse(
            boolean votingOpen,
            boolean resultsPublic,
            boolean tie,
            long totalVotes,
            List<RankingItem> ranking,
            List<RankingItem> winners
    ) {}

    public record DashboardResponse(
            long participants,
            long votes,
            long availableCodes,
            long usedCodes,
            String status,
            EventDtos.EventSettingsResponse settings,
            ResultsResponse results
    ) {}
}
