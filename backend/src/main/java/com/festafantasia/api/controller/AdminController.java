package com.festafantasia.api.controller;

import com.festafantasia.api.dto.AdminDtos.ResetVotesRequest;
import com.festafantasia.api.dto.AuthDtos.CreateAdminRequest;
import com.festafantasia.api.dto.AuthDtos.LoginRequest;
import com.festafantasia.api.dto.AuthDtos.LoginResponse;
import com.festafantasia.api.dto.EventDtos.EventSettingsRequest;
import com.festafantasia.api.dto.EventDtos.EventSettingsResponse;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantRequest;
import com.festafantasia.api.dto.ParticipantDtos.ParticipantResponse;
import com.festafantasia.api.dto.ResultDtos.DashboardResponse;
import com.festafantasia.api.dto.ResultDtos.ResultsResponse;
import com.festafantasia.api.dto.VoteDtos.GenerateCodesRequest;
import com.festafantasia.api.dto.VoteDtos.GenerateCodesResponse;
import com.festafantasia.api.dto.VoteDtos.VoteCodeResponse;
import com.festafantasia.api.service.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AuthService authService;
    private final DashboardService dashboardService;
    private final VoteCodeService voteCodeService;
    private final EventSettingsService settingsService;
    private final ParticipantService participantService;
    private final ResultService resultService;
    private final VoteMaintenanceService voteMaintenanceService;

    public AdminController(AuthService authService, DashboardService dashboardService, VoteCodeService voteCodeService, EventSettingsService settingsService, ParticipantService participantService, ResultService resultService, VoteMaintenanceService voteMaintenanceService) {
        this.authService = authService;
        this.dashboardService = dashboardService;
        this.voteCodeService = voteCodeService;
        this.settingsService = settingsService;
        this.participantService = participantService;
        this.resultService = resultService;
        this.voteMaintenanceService = voteMaintenanceService;
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

    @PostMapping(value = "/participants", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ParticipantResponse createParticipant(
            @RequestParam String name,
            @RequestParam String costumeName,
            @RequestParam(required = false) String description,
            @RequestPart(required = false) MultipartFile photo
    ) {
        return participantService.createAdmin(name, costumeName, description, photo);
    }

    @PutMapping("/participants/{id}")
    public ParticipantResponse updateParticipant(@PathVariable Long id, @Valid @RequestBody ParticipantRequest request) {
        return participantService.update(id, request);
    }

    @PutMapping(value = "/participants/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ParticipantResponse updateParticipantWithPhoto(
            @PathVariable Long id,
            @RequestParam String name,
            @RequestParam String costumeName,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean removePhoto,
            @RequestPart(required = false) MultipartFile photo
    ) {
        return participantService.update(id, name, costumeName, description, active, removePhoto, photo);
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

    @GetMapping("/results")
    public ResultsResponse results() {
        return resultService.results();
    }

    @GetMapping(value = "/results/export", produces = "text/csv")
    public ResponseEntity<String> exportResults() {
        var results = resultService.results();
        var builder = new StringBuilder("Posição,Participante,Votos,Percentual\n");
        for (int i = 0; i < results.ranking().size(); i++) {
            var item = results.ranking().get(i);
            builder.append(i + 1).append(',')
                    .append('"').append(item.participantName().replace("\"", "\"\"")).append('"').append(',')
                    .append(item.votes()).append(',')
                    .append(String.format(java.util.Locale.US, "%.2f", item.percentage()))
                    .append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=resultados-festa-fantasia.csv")
                .body(builder.toString());
    }

    @PostMapping("/votes/reset")
    public void resetVotes(@RequestBody ResetVotesRequest request) {
        voteMaintenanceService.resetVotes(request.confirmation());
    }

    @PutMapping("/settings")
    public EventSettingsResponse updateSettings(@RequestBody EventSettingsRequest request) {
        return settingsService.update(request);
    }
}
