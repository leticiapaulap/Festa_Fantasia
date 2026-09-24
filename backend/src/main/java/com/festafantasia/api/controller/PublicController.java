package com.festafantasia.api.controller;

import com.festafantasia.api.dto.EventDtos.EventSettingsResponse;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantRequest;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantResponse;
import com.festafantasia.api.dto.ResultDtos.ResultsResponse;
import com.festafantasia.api.dto.VoteDtos.ValidateCodeRequest;
import com.festafantasia.api.dto.VoteDtos.ValidateCodeResponse;
import com.festafantasia.api.dto.VoteDtos.VoteRequest;
import com.festafantasia.api.dto.VoteDtos.VoteResponse;
import com.festafantasia.api.service.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PublicController {
    private final ParticipantService participantService;
    private final VoteService voteService;
    private final VoteCodeService voteCodeService;
    private final ResultService resultService;
    private final EventSettingsService settingsService;

    public PublicController(ParticipantService participantService, VoteService voteService, VoteCodeService voteCodeService, ResultService resultService, EventSettingsService settingsService) {
        this.participantService = participantService;
        this.voteService = voteService;
        this.voteCodeService = voteCodeService;
        this.resultService = resultService;
        this.settingsService = settingsService;
    }

    @GetMapping("/settings")
    public EventSettingsResponse settings() {
        return settingsService.current();
    }

    @PostMapping("/participants")
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipantResponse createParticipant(@Valid @RequestBody ParticipantRequest request) {
        return participantService.create(request);
    }

    @GetMapping("/participants")
    public List<ParticipantResponse> participants() {
        return participantService.list();
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
        return resultService.results();
    }
}
