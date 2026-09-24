package com.festafantasia.api;

import com.festafantasia.api.dto.ParticipantDtos.ParticipantRequest;
import com.festafantasia.api.dto.VoteDtos.VoteRequest;
import com.festafantasia.api.exception.BusinessException;
import com.festafantasia.api.repository.VoteRepository;
import com.festafantasia.api.repository.ParticipantRepository;
import com.festafantasia.api.repository.VoteCodeRepository;
import com.festafantasia.api.service.EventSettingsService;
import com.festafantasia.api.service.ParticipantService;
import com.festafantasia.api.service.ResultService;
import com.festafantasia.api.service.VoteCodeService;
import com.festafantasia.api.service.VoteService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class VoteRulesTest {
    @Autowired ParticipantService participantService;
    @Autowired VoteCodeService voteCodeService;
    @Autowired VoteService voteService;
    @Autowired VoteRepository voteRepository;
    @Autowired VoteCodeRepository voteCodeRepository;
    @Autowired ParticipantRepository participantRepository;
    @Autowired EventSettingsService settingsService;
    @Autowired ResultService resultService;

    @BeforeEach
    void cleanDatabase() {
        voteRepository.deleteAll();
        voteCodeRepository.deleteAll();
        participantRepository.deleteAll();
        settingsService.setVoting(false);
    }

    @Test
    void validCodeCanVoteOnlyOnce() {
        var participant = participant("Ana", "Wandinha");
        var code = voteCodeService.generate(1).codes().get(0).code();
        settingsService.setVoting(true);

        voteService.vote(new VoteRequest(participant.id(), code));

        assertThat(voteRepository.count()).isEqualTo(1);
        assertThatThrownBy(() -> voteService.vote(new VoteRequest(participant.id(), code)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("já foi utilizado");
    }

    @Test
    void invalidCodeCannotVote() {
        var participant = participant("João", "Coringa");
        settingsService.setVoting(true);

        assertThatThrownBy(() -> voteService.vote(new VoteRequest(participant.id(), "FESTA-XXXX")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inválido");
    }

    @Test
    void closedVotingRejectsVotes() {
        var participant = participant("Pedro", "Harry Potter");
        var code = voteCodeService.generate(1).codes().get(0).code();
        settingsService.setVoting(false);

        assertThatThrownBy(() -> voteService.vote(new VoteRequest(participant.id(), code)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("encerrada");
    }

    @Test
    void resultsCountVotesAndIdentifyTie() {
        var ana = participant("Ana", "Wandinha");
        var leti = participant("Letícia", "Malévola");
        var codes = voteCodeService.generate(2).codes();
        settingsService.setVoting(true);

        voteService.vote(new VoteRequest(ana.id(), codes.get(0).code()));
        voteService.vote(new VoteRequest(leti.id(), codes.get(1).code()));
        settingsService.setVoting(false);

        var results = resultService.results();
        assertThat(results.totalVotes()).isEqualTo(2);
        assertThat(results.tie()).isTrue();
        assertThat(results.winners()).hasSize(2);
    }

    @Test
    void simultaneousRequestsWithSameCodeCreateOneVote() throws Exception {
        var participant = participant("Ana", "Wandinha");
        var code = voteCodeService.generate(1).codes().get(0).code();
        settingsService.setVoting(true);
        var success = new AtomicInteger();
        var executor = Executors.newFixedThreadPool(2);

        for (int i = 0; i < 2; i++) {
            executor.submit(() -> {
                try {
                    voteService.vote(new VoteRequest(participant.id(), code));
                    success.incrementAndGet();
                } catch (RuntimeException ignored) {
                }
            });
        }

        executor.shutdown();
        assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        assertThat(success.get()).isEqualTo(1);
        assertThat(voteRepository.count()).isEqualTo(1);
    }

    private com.festafantasia.api.dto.ParticipantDtos.ParticipantResponse participant(String name, String costume) {
        return participantService.create(new ParticipantRequest(name, costume, null, null));
    }
}
