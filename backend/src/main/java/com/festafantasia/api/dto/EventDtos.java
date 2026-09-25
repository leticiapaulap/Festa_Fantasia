package com.festafantasia.api.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public class EventDtos {
    public record EventSettingsResponse(
            Long id,
            String eventName,
            String title,
            String description,
            LocalDate eventDate,
            LocalTime eventTime,
            LocalTime votingEndTime,
            String timezone,
            boolean votingOpen,
            boolean registrationOpen,
            boolean resultsPublic,
            String votingStatus,
            boolean showPublicResults,
            OffsetDateTime votingStart,
            OffsetDateTime votingEnd,
            boolean canAcceptVotes,
            String publicVotingUrl,
            String votingAvailability
    ) {}

    public record EventSettingsRequest(
            String eventName,
            String title,
            String description,
            LocalDate eventDate,
            LocalTime eventTime,
            LocalTime votingEndTime,
            String timezone,
            Boolean votingOpen,
            Boolean registrationOpen,
            Boolean resultsPublic,
            String votingStatus,
            Boolean showPublicResults,
            OffsetDateTime votingStart,
            OffsetDateTime votingEnd
    ) {}
}
