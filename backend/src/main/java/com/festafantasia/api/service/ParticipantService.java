package com.festafantasia.api.service;

import com.festafantasia.api.dto.ParticipantDtos.ParticipantRequest;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantResponse;
import com.festafantasia.api.entity.Participant;
import com.festafantasia.api.exception.BusinessException;
import com.festafantasia.api.repository.ParticipantRepository;
import com.festafantasia.api.repository.VoteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class ParticipantService {
    private final ParticipantRepository repository;
    private final EventSettingsService settingsService;
    private final VoteRepository voteRepository;
    private final PhotoStorageService photoStorageService;

    public ParticipantService(ParticipantRepository repository, EventSettingsService settingsService, VoteRepository voteRepository, PhotoStorageService photoStorageService) {
        this.repository = repository;
        this.settingsService = settingsService;
        this.voteRepository = voteRepository;
        this.photoStorageService = photoStorageService;
    }

    @Transactional
    public ParticipantResponse create(ParticipantRequest request) {
        var settings = settingsService.currentEntity();
        if (!settings.isRegistrationOpen() || settingsService.canAcceptVotes(settings)) {
            throw new BusinessException("O período de cadastro foi encerrado.", HttpStatus.CONFLICT);
        }
        var participant = new Participant();
        apply(participant, request);
        return toResponse(repository.save(participant));
    }

    @Transactional
    public ParticipantResponse create(String name, String costumeName, String description, MultipartFile photo) {
        var settings = settingsService.currentEntity();
        if (!settings.isRegistrationOpen() || settingsService.canAcceptVotes(settings)) {
            throw new BusinessException("O período de cadastro foi encerrado.", HttpStatus.CONFLICT);
        }
        return createAdmin(name, costumeName, description, photo);
    }

    @Transactional
    public ParticipantResponse createAdmin(String name, String costumeName, String description, MultipartFile photo) {
        var participant = new Participant();
        participant.setName(clean(name));
        participant.setCostumeName(clean(costumeName));
        participant.setDescription(clean(description));
        participant.setActive(true);
        if (photo != null && !photo.isEmpty()) {
            participant.setPhotoUrl(photoStorageService.uploadParticipantPhoto(photo));
        }
        return toResponse(repository.save(participant));
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> list() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> listActive() {
        return repository.findByActiveTrue().stream().map(this::toResponse).toList();
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
    public ParticipantResponse update(Long id, String name, String costumeName, String description, Boolean active, Boolean removePhoto, MultipartFile photo) {
        var participant = find(id);
        participant.setName(clean(name));
        participant.setCostumeName(clean(costumeName));
        participant.setDescription(clean(description));
        if (active != null) {
            participant.setActive(active);
        }
        if (photo != null && !photo.isEmpty()) {
            participant.setPhotoUrl(photoStorageService.uploadParticipantPhoto(photo));
        } else if (Boolean.TRUE.equals(removePhoto)) {
            participant.setPhotoUrl(null);
        }
        return toResponse(participant);
    }

    @Transactional
    public void delete(Long id) {
        if (settingsService.canAcceptVotes()) {
            throw new BusinessException("Não é possível excluir participantes enquanto a votação está aberta.", HttpStatus.CONFLICT);
        }
        var participant = find(id);
        if (voteRepository.countByParticipantId(id) > 0) {
            participant.setActive(false);
            return;
        }
        repository.delete(participant);
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
        if (request.active() != null) {
            participant.setActive(request.active());
        }
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
                participant.isActive(),
                participant.getCreatedAt(),
                participant.getUpdatedAt()
        );
    }
}
