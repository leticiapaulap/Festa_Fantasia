package com.festafantasia.api.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Entity
@Table(name = "event_settings")
public class EventSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_name", nullable = false, length = 160)
    private String eventName;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(name = "event_time")
    private LocalTime eventTime;

    @Column(name = "voting_end_time")
    private LocalTime votingEndTime;

    @Column(nullable = false, length = 80)
    private String timezone = "America/Sao_Paulo";

    @Column(name = "voting_open", nullable = false)
    private boolean votingOpen;

    @Column(name = "registration_open", nullable = false)
    private boolean registrationOpen;

    @Column(name = "results_public", nullable = false)
    private boolean resultsPublic;

    @Column(name = "voting_status", nullable = false, length = 20)
    private String votingStatus = "DRAFT";

    @Column(name = "show_public_results", nullable = false)
    private boolean showPublicResults;

    @Column(name = "voting_start")
    private OffsetDateTime votingStart;

    @Column(name = "voting_end")
    private OffsetDateTime votingEnd;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public LocalTime getEventTime() { return eventTime; }
    public void setEventTime(LocalTime eventTime) { this.eventTime = eventTime; }
    public LocalTime getVotingEndTime() { return votingEndTime; }
    public void setVotingEndTime(LocalTime votingEndTime) { this.votingEndTime = votingEndTime; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public boolean isVotingOpen() { return votingOpen; }
    public void setVotingOpen(boolean votingOpen) { this.votingOpen = votingOpen; }
    public boolean isRegistrationOpen() { return registrationOpen; }
    public void setRegistrationOpen(boolean registrationOpen) { this.registrationOpen = registrationOpen; }
    public boolean isResultsPublic() { return resultsPublic; }
    public void setResultsPublic(boolean resultsPublic) {
        this.resultsPublic = resultsPublic;
        this.showPublicResults = resultsPublic;
    }
    public String getVotingStatus() { return votingStatus; }
    public void setVotingStatus(String votingStatus) { this.votingStatus = votingStatus; }
    public boolean isShowPublicResults() { return showPublicResults; }
    public void setShowPublicResults(boolean showPublicResults) {
        this.showPublicResults = showPublicResults;
        this.resultsPublic = showPublicResults;
    }
    public OffsetDateTime getVotingStart() { return votingStart; }
    public void setVotingStart(OffsetDateTime votingStart) { this.votingStart = votingStart; }
    public OffsetDateTime getVotingEnd() { return votingEnd; }
    public void setVotingEnd(OffsetDateTime votingEnd) { this.votingEnd = votingEnd; }
}
