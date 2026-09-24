package com.festafantasia.api.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "votes", uniqueConstraints = @UniqueConstraint(name = "uk_votes_vote_code", columnNames = "vote_code_id"))
public class Vote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id")
    private Participant participant;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "vote_code_id", unique = true)
    private VoteCode voteCode;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant participant) { this.participant = participant; }
    public VoteCode getVoteCode() { return voteCode; }
    public void setVoteCode(VoteCode voteCode) { this.voteCode = voteCode; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
