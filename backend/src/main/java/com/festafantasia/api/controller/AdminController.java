package com.festafantasia.api.controller;

import com.festafantasia.api.dto.AuthDtos.CreateAdminRequest;
import com.festafantasia.api.dto.AuthDtos.LoginRequest;
import com.festafantasia.api.dto.AuthDtos.LoginResponse;
import com.festafantasia.api.dto.EventDtos.EventSettingsRequest;
import com.festafantasia.api.dto.EventDtos.EventSettingsResponse;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantRequest;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantResponse;
import com.festafantasia.api.dto.ResultDtos.DashboardResponse;
import com.festafantasia.api.dto.VoteDtos.GenerateCodesRequest;
import com.festafantasia.api.dto.VoteDtos.GenerateCodesResponse;
import com.festafantasia.api.dto.VoteDtos.VoteCodeResponse;
import com.festafantasia.api.service.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AuthService authService;
    private final DashboardService dashboardService;
    private final VoteCodeService voteCodeService;
    private final EventSettingsService settingsService;
    private final ParticipantService participantService;

    public AdminController(AuthService authService, DashboardService dashboardService, VoteCodeService voteCodeService, EventSettingsService settingsService, ParticipantService participantService) {
        this.authService = authService;
        this.dashboardService = dashboardService;
        this.voteCodeService = voteCodeService;
        this.settingsService = settingsService;
        this.participantService = participantService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/bootstrap")
    public LoginResponse bootstrap(@Valid @RequestBody CreateAdminRequest request) {
        return authService.bootstrap(request);
    }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard() {
        return dashboardService.dashboard();
    }

    @GetMapping("/participants")
    public List<ParticipantResponse> participants() {
        return participantService.list();
    }

    @PutMapping("/participants/{id}")
    public ParticipantResponse updateParticipant(@PathVariable Long id, @Valid @RequestBody ParticipantRequest request) {
        return participantService.update(id, request);
    }

    @DeleteMapping("/participants/{id}")
    public void deleteParticipant(@PathVariable Long id) {
        participantService.delete(id);
    }

    @GetMapping("/vote-codes")
    public List<VoteCodeResponse> voteCodes() {
        return voteCodeService.list();
    }

    @PostMapping("/vote-codes/generate")
    public GenerateCodesResponse generateCodes(@RequestBody GenerateCodesRequest request) {
        var quantity = request.quantity() == null ? 1 : request.quantity();
        return voteCodeService.generate(quantity);
    }

    @PostMapping("/voting/open")
    public EventSettingsResponse openVoting() {
        return settingsService.setVoting(true);
    }

    @PostMapping("/voting/close")
    public EventSettingsResponse closeVoting() {
        return settingsService.setVoting(false);
    }

    @PutMapping("/settings")
    public EventSettingsResponse updateSettings(@RequestBody EventSettingsRequest request) {
        return settingsService.update(request);
    }
}
