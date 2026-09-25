package com.festafantasia.api.repository;

import com.festafantasia.api.entity.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface VoteRepository extends JpaRepository<Vote, Long> {
    @Query("""
        select v.participant.id, count(v.id)
        from Vote v
        group by v.participant.id
    """)
    List<Object[]> countVotesByParticipant();

    long countByParticipantId(Long participantId);
}
