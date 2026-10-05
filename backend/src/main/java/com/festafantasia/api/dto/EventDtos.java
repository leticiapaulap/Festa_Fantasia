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
            boolean showLiveResults,
            boolean votingTestMode,
            OffsetDateTime votingStartsAt,
            OffsetDateTime votingEndsAt,
            OffsetDateTime resultsRevealAt,
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
            Boolean showLiveResults,
            Boolean votingTestMode,
            String votingStartsAt,
            String votingEndsAt,
            String resultsRevealAt,
            OffsetDateTime votingStart,
            OffsetDateTime votingEnd
    ) {
        public EventSettingsRequest(
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
        ) {
            this(
                    eventName,
                    title,
                    description,
                    eventDate,
                    eventTime,
                    votingEndTime,
                    timezone,
                    votingOpen,
                    registrationOpen,
                    resultsPublic,
                    votingStatus,
                    showPublicResults,
                    null,
                    null,
                    null,
                    null,
                    null,
                    votingStart,
                    votingEnd
            );
        }
    }
}
