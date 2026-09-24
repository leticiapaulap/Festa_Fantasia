package com.festafantasia.api.service;

import com.festafantasia.api.dto.ParticipantDtos.ParticipantRequest;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantResponse;
import com.festafantasia.api.entity.Participant;
import com.festafantasia.api.exception.BusinessException;
import com.festafantasia.api.repository.ParticipantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ParticipantService {
    private final ParticipantRepository repository;
    private final EventSettingsService settingsService;

    public ParticipantService(ParticipantRepository repository, EventSettingsService settingsService) {
        this.repository = repository;
        this.settingsService = settingsService;
    }

    @Transactional
    public ParticipantResponse create(ParticipantRequest request) {
        if (!settingsService.currentEntity().isRegistrationOpen()) {
            throw new BusinessException("O período de cadastro foi encerrado.", HttpStatus.CONFLICT);
        }
        var participant = new Participant();
        apply(participant, request);
        return toResponse(repository.save(participant));
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> list() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ParticipantResponse get(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public ParticipantResponse update(Long id, ParticipantRequest request) {
        var participant = find(id);
        apply(participant, request);
        return toResponse(participant);
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    public Participant find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new BusinessException("Participante não encontrado.", HttpStatus.NOT_FOUND));
    }

    private void apply(Participant participant, ParticipantRequest request) {
        participant.setName(clean(request.name()));
        participant.setCostumeName(clean(request.costumeName()));
        participant.setDescription(clean(request.description()));
        participant.setPhotoUrl(clean(request.photoUrl()));
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    public ParticipantResponse toResponse(Participant participant) {
        return new ParticipantResponse(
                participant.getId(),
                participant.getName(),
                participant.getCostumeName(),
                participant.getDescription(),
                participant.getPhotoUrl(),
                participant.getCreatedAt(),
                participant.getUpdatedAt()
        );
    }
}
