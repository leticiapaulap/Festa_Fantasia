package com.festafantasia.api.service;

import com.festafantasia.api.dto.EventDtos.EventSettingsRequest;
import com.festafantasia.api.dto.EventDtos.EventSettingsResponse;
import com.festafantasia.api.entity.EventSettings;
import com.festafantasia.api.repository.EventSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventSettingsService {
    private final EventSettingsRepository repository;

    public EventSettingsService(EventSettingsRepository repository) {
        this.repository = repository;
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
        if (request.eventName() != null) settings.setEventName(request.eventName());
        if (request.title() != null) settings.setTitle(request.title());
        if (request.description() != null) settings.setDescription(request.description());
        if (request.eventDate() != null) settings.setEventDate(request.eventDate());
        if (request.eventTime() != null) settings.setEventTime(request.eventTime());
        if (request.votingOpen() != null) settings.setVotingOpen(request.votingOpen());
        if (request.registrationOpen() != null) settings.setRegistrationOpen(request.registrationOpen());
        if (request.resultsPublic() != null) settings.setResultsPublic(request.resultsPublic());
        if (request.votingStart() != null) settings.setVotingStart(request.votingStart());
        if (request.votingEnd() != null) settings.setVotingEnd(request.votingEnd());
        return toResponse(settings);
    }

    @Transactional
    public EventSettingsResponse setVoting(boolean open) {
        var settings = currentEntity();
        settings.setVotingOpen(open);
        if (!open) {
            settings.setResultsPublic(true);
        }
        return toResponse(settings);
    }

    public EventSettingsResponse toResponse(EventSettings settings) {
        return new EventSettingsResponse(
                settings.getId(),
                settings.getEventName(),
                settings.getTitle(),
                settings.getDescription(),
                settings.getEventDate(),
                settings.getEventTime(),
                settings.isVotingOpen(),
                settings.isRegistrationOpen(),
                settings.isResultsPublic(),
                settings.getVotingStart(),
                settings.getVotingEnd()
        );
    }
}
