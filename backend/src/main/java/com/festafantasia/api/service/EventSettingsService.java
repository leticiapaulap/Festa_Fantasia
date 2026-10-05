package com.festafantasia.api.service;

import com.festafantasia.api.dto.EventDtos.EventSettingsRequest;
import com.festafantasia.api.dto.EventDtos.EventSettingsResponse;
import com.festafantasia.api.entity.EventSettings;
import com.festafantasia.api.repository.EventSettingsRepository;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventSettingsService {
    private final EventSettingsRepository repository;
    private final Clock clock;

    public EventSettingsService(EventSettingsRepository repository) {
        this.repository = repository;
        this.clock = Clock.systemUTC();
    }

    @Transactional(readOnly = true)
    public EventSettings currentEntity() {
        return repository.findById(1L).orElseThrow();
    }

    @Transactional(readOnly = true)
    public EventSettingsResponse current() {
        return toResponse(currentEntity());
    }

    @Transactional
    public EventSettingsResponse update(EventSettingsRequest request) {
        var settings = currentEntity();
        var requestZone = request.timezone() != null && !request.timezone().isBlank()
                ? normalizeZone(request.timezone())
                : zone(settings);
        if (request.eventName() != null) settings.setEventName(request.eventName());
        if (request.title() != null) settings.setTitle(request.title());
        if (request.description() != null) settings.setDescription(request.description());
        if (request.eventDate() != null) settings.setEventDate(request.eventDate());
        if (request.eventTime() != null) settings.setEventTime(request.eventTime());
        if (request.votingEndTime() != null) settings.setVotingEndTime(request.votingEndTime());
        if (request.timezone() != null && !request.timezone().isBlank()) {
            settings.setTimezone(requestZone.getId());
        }
        if (request.votingOpen() != null) settings.setVotingOpen(request.votingOpen());
        if (request.registrationOpen() != null) settings.setRegistrationOpen(request.registrationOpen());
        if (request.resultsPublic() != null) settings.setResultsPublic(request.resultsPublic());
        if (request.showPublicResults() != null) settings.setShowPublicResults(request.showPublicResults());
        if (request.showLiveResults() != null) settings.setShowLiveResults(request.showLiveResults());
        if (request.votingTestMode() != null) settings.setVotingTestMode(request.votingTestMode());
        if (request.votingStatus() != null) {
            settings.setVotingStatus(request.votingStatus());
            settings.setVotingOpen("OPEN".equals(request.votingStatus()));
        }
        if (request.votingStartsAt() != null) settings.setVotingStart(parseDateTime(request.votingStartsAt(), requestZone));
        else if (request.votingStart() != null) settings.setVotingStart(request.votingStart());
        if (request.votingEndsAt() != null) settings.setVotingEnd(parseDateTime(request.votingEndsAt(), requestZone));
        else if (request.votingEnd() != null) settings.setVotingEnd(request.votingEnd());
        if (request.resultsRevealAt() != null) settings.setResultsRevealAt(parseDateTime(request.resultsRevealAt(), requestZone));
        return toResponse(settings);
    }

    @Transactional
    public EventSettingsResponse setVoting(boolean open) {
        var settings = currentEntity();
        settings.setVotingOpen(open);
        settings.setVotingStatus(open ? "OPEN" : "CLOSED");
        if (open) {
            settings.setRegistrationOpen(false);
        }
        return toResponse(settings);
    }

    public boolean canAcceptVotes(EventSettings settings) {
        return "OPEN".equals(settings.getVotingStatus()) && isInsideVotingWindow(settings);
    }

    public boolean canAcceptVotes() {
        return canAcceptVotes(currentEntity());
    }

    public String availability(EventSettings settings) {
        if ("CLOSED".equals(settings.getVotingStatus())) {
            return "CLOSED";
        }
        if (!"OPEN".equals(settings.getVotingStatus())) {
            return "DRAFT";
        }
        var start = votingStartsAt(settings);
        var end = votingEndsAt(settings);
        var now = OffsetDateTime.now(clock);
        if (start == null) {
            return "NOT_CONFIGURED";
        }
        if (now.isBefore(start)) {
            return "BEFORE_WINDOW";
        }
        if (end != null && now.isAfter(end)) {
            return "AFTER_WINDOW";
        }
        return "OPEN";
    }

    public OffsetDateTime votingStartsAt(EventSettings settings) {
        if (settings.getVotingStart() != null) {
            return settings.getVotingStart();
        }
        if (settings.getEventDate() == null || settings.getEventTime() == null) {
            return null;
        }
        return settings.getEventDate()
                .atTime(settings.getEventTime())
                .atZone(zone(settings))
                .toOffsetDateTime();
    }

    public OffsetDateTime votingEndsAt(EventSettings settings) {
        if (settings.getVotingEnd() != null) {
            return settings.getVotingEnd();
        }
        if (settings.getEventDate() == null || settings.getVotingEndTime() == null) {
            return null;
        }
        return settings.getEventDate()
                .atTime(settings.getVotingEndTime())
                .atZone(zone(settings))
                .toOffsetDateTime();
    }

    public OffsetDateTime resultsRevealAt(EventSettings settings) {
        return settings.getResultsRevealAt();
    }

    public EventSettingsResponse toResponse(EventSettings settings) {
        var votingStart = votingStartsAt(settings);
        var votingEnd = votingEndsAt(settings);
        var resultsReveal = resultsRevealAt(settings);
        return new EventSettingsResponse(
                settings.getId(),
                settings.getEventName(),
                settings.getTitle(),
                settings.getDescription(),
                settings.getEventDate(),
                settings.getEventTime(),
                settings.getVotingEndTime(),
                zone(settings).getId(),
                settings.isVotingOpen(),
                settings.isRegistrationOpen(),
                settings.isResultsPublic(),
                settings.getVotingStatus(),
                settings.isShowPublicResults(),
                settings.isShowLiveResults(),
                settings.isVotingTestMode(),
                votingStart,
                votingEnd,
                resultsReveal,
                votingStart,
                votingEnd,
                canAcceptVotes(settings),
                "/votar",
                availability(settings)
        );
    }

    private boolean isInsideVotingWindow(EventSettings settings) {
        var start = votingStartsAt(settings);
        if (start == null) {
            return false;
        }
        var now = OffsetDateTime.now(clock);
        if (now.isBefore(start)) {
            return false;
        }
        var end = votingEndsAt(settings);
        return end == null || !now.isAfter(end);
    }

    private ZoneId zone(EventSettings settings) {
        return normalizeZone(settings.getTimezone());
    }

    private ZoneId normalizeZone(String timezone) {
        try {
            return ZoneId.of(timezone == null || timezone.isBlank() ? "America/Sao_Paulo" : timezone.trim());
        } catch (DateTimeException exception) {
            return ZoneId.of("America/Sao_Paulo");
        }
    }

    private OffsetDateTime parseDateTime(String value, ZoneId zone) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return LocalDateTime.parse(value).atZone(zone).toOffsetDateTime();
        }
    }
}
