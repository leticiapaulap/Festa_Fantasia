package com.festafantasia.api.repository;

import com.festafantasia.api.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    List<Participant> findByActiveTrue();
}
