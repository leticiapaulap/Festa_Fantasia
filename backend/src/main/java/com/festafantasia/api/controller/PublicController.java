package com.festafantasia.api.controller;

import com.festafantasia.api.dto.EventDtos.EventSettingsResponse;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantRequest;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantResponse;
import com.festafantasia.api.dto.RegistrationDtos.AccessRequest;
import com.festafantasia.api.dto.RegistrationDtos.AccessResponse;
import com.festafantasia.api.dto.ResultDtos.ResultsResponse;
import com.festafantasia.api.dto.VoteDtos.ValidateCodeRequest;
import com.festafantasia.api.dto.VoteDtos.ValidateCodeResponse;
import com.festafantasia.api.dto.VoteDtos.VoteRequest;
import com.festafantasia.api.dto.VoteDtos.VoteResponse;
import com.festafantasia.api.service.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PublicController {
    private final ParticipantService participantService;
    private final VoteService voteService;
    private final VoteCodeService voteCodeService;
    private final ResultService resultService;
    private final EventSettingsService settingsService;
    private final RegistrationAccessService registrationAccessService;

    public PublicController(ParticipantService participantService, VoteService voteService, VoteCodeService voteCodeService, ResultService resultService, EventSettingsService settingsService, RegistrationAccessService registrationAccessService) {
        this.participantService = participantService;
        this.voteService = voteService;
        this.voteCodeService = voteCodeService;
        this.resultService = resultService;
        this.settingsService = settingsService;
        this.registrationAccessService = registrationAccessService;
    }

    @GetMapping("/settings")
    public EventSettingsResponse settings() {
        return settingsService.current();
    }

    @PostMapping("/registration/access")
    public AccessResponse registrationAccess(@Valid @RequestBody AccessRequest request, HttpServletRequest servletRequest) {
        return registrationAccessService.grant(request.code(), servletRequest);
    }

    @PostMapping("/participants")
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipantResponse createParticipant(@Valid @RequestBody ParticipantRequest request, @RequestHeader(value = "X-Registration-Access", required = false) String accessToken) {
        return participantService.create(request, accessToken);
    }

    @PostMapping(value = "/participants", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipantResponse createParticipantWithPhoto(
            @RequestParam String name,
            @RequestParam String costumeName,
            @RequestParam(required = false) String description,
            @RequestPart(required = false) MultipartFile photo,
            @RequestHeader(value = "X-Registration-Access", required = false) String accessToken
    ) {
        return participantService.create(name, costumeName, description, photo, accessToken);
    }

    @GetMapping("/participants")
    public List<ParticipantResponse> participants() {
        return participantService.listActive();
    }

    @GetMapping("/participants/{id}")
    public ParticipantResponse participant(@PathVariable Long id) {
        return participantService.get(id);
    }

    @PostMapping("/votes")
    public VoteResponse vote(@Valid @RequestBody VoteRequest request) {
        return voteService.vote(request);
    }

    @PostMapping("/vote-codes/validate")
    public ValidateCodeResponse validateCode(@Valid @RequestBody ValidateCodeRequest request) {
        return voteCodeService.validate(request.code());
    }

    @GetMapping("/results")
    public ResultsResponse results() {
        return resultService.publicResults();
    }
}
