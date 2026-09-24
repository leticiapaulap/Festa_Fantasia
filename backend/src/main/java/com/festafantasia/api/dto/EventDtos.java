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
            boolean votingOpen,
            boolean registrationOpen,
            boolean resultsPublic,
            OffsetDateTime votingStart,
            OffsetDateTime votingEnd
    ) {}

    public record EventSettingsRequest(
            String eventName,
            String title,
            String description,
            LocalDate eventDate,
            LocalTime eventTime,
            Boolean votingOpen,
            Boolean registrationOpen,
            Boolean resultsPublic,
            OffsetDateTime votingStart,
            OffsetDateTime votingEnd
    ) {}
}
